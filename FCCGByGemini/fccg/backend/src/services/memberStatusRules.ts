/**
 * 회원 상태 자동 판정 규칙 (DB 접근 없는 순수 함수)
 * checkMemberStatusRules(authController)가 조회한 데이터를 받아 판정만 한다.
 */

export const MS_DAY = 24 * 60 * 60 * 1000;
export const VOTE_LOOKBACK_DAYS = 90;
export const GAME_LOOKBACK_DAYS = 90;
export const LOGIN_SUSPEND_DAYS = 60;
export const CONSECUTIVE_VOTE_MISS_LIMIT = 4;
export const TOTAL_VOTE_MISS_LIMIT = 6;

export type StatusCheckResult = {
  shouldDeactivate: boolean;
  shouldSuspend: boolean;
  reason: string;
};

type StatusTrackedMember = { status?: string; statusChangedAt?: Date | null };

const laterOf = (a: Date, b: Date | null | undefined) => (b && b > a ? b : a);

/**
 * ACTIVE 회원의 statusChangedAt = 마지막으로 ACTIVE가 된 시각(관리자 복구).
 * 복구 이전(정지 기간 포함) 기록으로 다시 제재하지 않도록 판정 시작점으로 쓴다.
 */
function reactivatedAt(member: StatusTrackedMember): Date | null {
  return member.status === 'ACTIVE' && member.statusChangedAt ? member.statusChangedAt : null;
}

type CompletedSession = { id: number; weekStartDate: Date; votes: { userId: number }[] };

/** 가입일(또는 관리자 복구일) 이후 완료 세션 기준 미참여 통계 (진행 중 세션은 호출부에서 제외) */
export function voteMissStats(
  member: { id: number; createdAt: Date } & StatusTrackedMember,
  completedSessions: CompletedSession[]
) {
  const memberStart = laterOf(member.createdAt, reactivatedAt(member));
  const sessions = completedSessions.filter((s) => s.weekStartDate >= memberStart);
  const missedFlags = sessions.map((s) => !s.votes.some((v) => v.userId === member.id));
  let consecutiveFromEnd = 0;
  for (let i = missedFlags.length - 1; i >= 0; i--) {
    if (missedFlags[i]) consecutiveFromEnd++;
    else break;
  }
  return { sessionCount: sessions.length, totalMissed: missedFlags.filter(Boolean).length, consecutiveFromEnd };
}

/**
 * 자동 INACTIVE의 유일한 기준: 완료된 투표 세션 4회 연속 미참여.
 * (3개월 6회 미참여는 상태 변경 없이 관리자 경고로만 쓴다 — evaluateMemberWarnings)
 */
export function evaluateVoteParticipation(
  member: { id: number; createdAt: Date } & StatusTrackedMember,
  completedSessions: CompletedSession[],
  _now: Date
): StatusCheckResult {
  const { sessionCount, consecutiveFromEnd } = voteMissStats(member, completedSessions);

  if (sessionCount >= CONSECUTIVE_VOTE_MISS_LIMIT && consecutiveFromEnd >= CONSECUTIVE_VOTE_MISS_LIMIT) {
    return {
      shouldDeactivate: true,
      shouldSuspend: false,
      reason: `투표 ${CONSECUTIVE_VOTE_MISS_LIMIT}회 연속 미참여 (최근 ${consecutiveFromEnd}회 연속, 대상 세션 ${sessionCount}개)`,
    };
  }

  return { shouldDeactivate: false, shouldSuspend: false, reason: '' };
}

/** 최근 3개월 실경기 참석 여부 (Attendance YES 또는 명단 포함) */
export function evaluateGameParticipation(
  member: { id: number; name: string; createdAt: Date } & StatusTrackedMember,
  realGames: Array<{
    id: number;
    date: Date;
    selectedMembers: string;
    memberNames: string;
    attendances: { userId: number }[];
  }>,
  now: Date,
  rulesStartAt: Date
): StatusCheckResult {
  const monitoringStart = laterOf(laterOf(member.createdAt, rulesStartAt), reactivatedAt(member));
  const monitoredDays = (now.getTime() - monitoringStart.getTime()) / MS_DAY;

  // "3개월 미참여"는 실제 관찰기간 90일이 지난 뒤에만 판정한다.
  if (monitoredDays < GAME_LOOKBACK_DAYS) {
    return { shouldDeactivate: false, shouldSuspend: false, reason: '' };
  }

  const games = realGames.filter((g) => g.date >= monitoringStart);

  // 판단할 경기가 없으면 참석 부족으로 제재하지 않음
  if (games.length === 0) {
    return { shouldDeactivate: false, shouldSuspend: false, reason: '' };
  }

  const participated = games.some((g) => {
    if (g.attendances.some((a) => a.userId === member.id)) return true;
    try {
      const selected = JSON.parse(g.selectedMembers || '[]');
      const names = JSON.parse(g.memberNames || '[]');
      const roster = [...(Array.isArray(selected) ? selected : []), ...(Array.isArray(names) ? names : [])];
      return roster.some((n) => typeof n === 'string' && n.trim() === member.name.trim());
    } catch {
      return false;
    }
  });

  if (!participated) {
    return {
      shouldDeactivate: true,
      shouldSuspend: false,
      reason: `3개월간 축구경기 미참여 (대상 경기 ${games.length}경기)`,
    };
  }

  return { shouldDeactivate: false, shouldSuspend: false, reason: '' };
}

/**
 * 60일 이상 미접속 → 정지 (가입 60일 미만은 제외)
 * 로그인 토큰이 장기(기본 365일) 유지되어 재로그인 없이 투표하는 회원이 많으므로,
 * lastLoginAt뿐 아니라 마지막 투표 시각(lastVoteAt)도 접속 활동으로 본다.
 */
export function evaluateLoginActivity(
  member: { lastLoginAt: Date | null; createdAt: Date; lastVoteAt?: Date | null } & StatusTrackedMember,
  now: Date,
  rulesStartAt: Date
): StatusCheckResult {
  // 규칙 기준일·관리자 복구일 이전의 미접속 기간은 소급 계산하지 않는다.
  const monitoringStart = laterOf(laterOf(member.createdAt, rulesStartAt), reactivatedAt(member));
  const accountAgeDays = (now.getTime() - monitoringStart.getTime()) / MS_DAY;
  if (accountAgeDays < LOGIN_SUSPEND_DAYS) {
    return { shouldDeactivate: false, shouldSuspend: false, reason: '' };
  }

  const lastActivity = laterOf(laterOf(member.createdAt, member.lastLoginAt), member.lastVoteAt);
  const referenceLogin =
    lastActivity > monitoringStart ? lastActivity : monitoringStart;
  const idleDays = (now.getTime() - referenceLogin.getTime()) / MS_DAY;

  if (idleDays >= LOGIN_SUSPEND_DAYS) {
    return {
      shouldDeactivate: false,
      shouldSuspend: true,
      reason: member.lastLoginAt
        ? `${LOGIN_SUSPEND_DAYS}일 이상 로그인 없음 (약 ${Math.floor(idleDays)}일)`
        : `가입 후 ${LOGIN_SUSPEND_DAYS}일 이상 로그인 기록 없음`,
    };
  }

  return { shouldDeactivate: false, shouldSuspend: false, reason: '' };
}

/**
 * 90-day game attendance rule is temporarily excluded from automatic deactivation pending policy review.
 * (evaluateGameParticipation 판정은 계속 계산·로그만 남긴다. 재적용 시 true로 변경)
 */
export const GAME_RULE_AUTO_DEACTIVATION_ENABLED = false;

/** 자동 상태 변경 결정: 투표 규칙 → INACTIVE, 장기 미접속 → SUSPENDED(우선) */
export function decideAutoStatus(
  currentStatus: string,
  voteStatus: StatusCheckResult,
  gameStatus: StatusCheckResult,
  loginStatus: StatusCheckResult,
  gameRuleEnabled: boolean = GAME_RULE_AUTO_DEACTIVATION_ENABLED
): { status: string; reason: string } {
  let status = currentStatus;
  let reason = '';

  if (currentStatus === 'ACTIVE') {
    if (voteStatus.shouldDeactivate) {
      status = 'INACTIVE';
      reason = voteStatus.reason;
    } else if (gameRuleEnabled && gameStatus.shouldDeactivate) {
      status = 'INACTIVE';
      reason = gameStatus.reason;
    }
  }

  // 정지가 비활성보다 우선 (장기 미접속)
  if ((status === 'ACTIVE' || status === 'INACTIVE') && loginStatus.shouldSuspend) {
    status = 'SUSPENDED';
    reason = loginStatus.reason;
  }

  return { status, reason };
}

export type MemberWarning = {
  code: 'VOTE_MISS_3M' | 'NO_GAME_90D' | 'PRE_DEACTIVATION';
  label: string;
  detail: string;
};

/**
 * 관리자 참고용 경고 (상태 변경·권한 제한·알림 없음).
 * - VOTE_MISS_3M: 최근 3개월 완료 투표 6회 이상 미참여
 * - PRE_DEACTIVATION: 완료 투표 3회 연속 미참여 → 다음 완료 투표도 미참여 시 자동 INACTIVE
 * - NO_GAME_90D: 90일 실경기 참여 없음 (회식·경기 수 부족 등 데이터 한계로 자동 제재에는 쓰지 않음)
 */
export function evaluateMemberWarnings(
  member: { id: number; name: string; createdAt: Date } & StatusTrackedMember,
  completedSessions: CompletedSession[],
  realGames: Parameters<typeof evaluateGameParticipation>[1],
  now: Date,
  rulesStartAt: Date
): MemberWarning[] {
  const warnings: MemberWarning[] = [];
  const { sessionCount, totalMissed, consecutiveFromEnd } = voteMissStats(member, completedSessions);

  if (sessionCount >= TOTAL_VOTE_MISS_LIMIT && totalMissed >= TOTAL_VOTE_MISS_LIMIT) {
    warnings.push({ code: 'VOTE_MISS_3M', label: '투표 주의', detail: `최근 3개월 투표 미참여 ${totalMissed}회` });
  }
  if (consecutiveFromEnd === CONSECUTIVE_VOTE_MISS_LIMIT - 1 && sessionCount >= CONSECUTIVE_VOTE_MISS_LIMIT - 1) {
    warnings.push({
      code: 'PRE_DEACTIVATION',
      label: '비활성 예정',
      detail: `최근 완료 투표 ${consecutiveFromEnd}회 연속 미참여 → 다음 완료 투표도 미참여 시 비활성`,
    });
  }
  if (evaluateGameParticipation(member, realGames, now, rulesStartAt).shouldDeactivate) {
    warnings.push({ code: 'NO_GAME_90D', label: '경기 활동 없음', detail: '최근 90일 경기 참여 없음' });
  }
  return warnings;
}
