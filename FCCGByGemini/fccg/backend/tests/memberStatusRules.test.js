const {
  evaluateVoteParticipation,
  evaluateLoginActivity,
  evaluateGameParticipation,
  decideAutoStatus,
  evaluateMemberWarnings,
} = require('../dist/services/memberStatusRules');

const D = (s) => new Date(s);
const RULES_START = D('2026-07-16T06:46:00.000Z');
const NOW = D('2026-10-08T00:00:00.000Z');

// 07-20부터 매주 완료 세션 12개
const sessions = (votedUserIds = []) =>
  Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    weekStartDate: new Date(D('2026-07-20T00:00:00.000Z').getTime() + i * 7 * 86400000),
    votes: votedUserIds.map((userId) => ({ userId })),
  }));

describe('evaluateLoginActivity', () => {
  const member = { createdAt: D('2025-01-01'), lastLoginAt: D('2026-07-01'), status: 'ACTIVE' };

  test('TEST 1/2: 재로그인 없이(장기 토큰) 최근 투표한 회원은 정지되지 않는다', () => {
    const r = evaluateLoginActivity({ ...member, lastVoteAt: D('2026-10-05') }, NOW, RULES_START);
    expect(r.shouldSuspend).toBe(false);
  });

  test('TEST 2: 로그인·투표 모두 60일 이상 없으면 기존 정책대로 정지', () => {
    const r = evaluateLoginActivity({ ...member, lastVoteAt: D('2026-07-10') }, NOW, RULES_START);
    expect(r.shouldSuspend).toBe(true);
  });

  test('관리자 ACTIVE 복구 직후 다음 크론에서 재정지되지 않는다', () => {
    const r = evaluateLoginActivity(
      { ...member, lastVoteAt: null, statusChangedAt: D('2026-10-07') },
      NOW,
      RULES_START
    );
    expect(r.shouldSuspend).toBe(false);
  });

  test('INACTIVE 회원의 statusChangedAt은 정지 유예로 쓰지 않는다', () => {
    const r = evaluateLoginActivity(
      { ...member, status: 'INACTIVE', lastVoteAt: null, statusChangedAt: D('2026-10-07') },
      NOW,
      RULES_START
    );
    expect(r.shouldSuspend).toBe(true);
  });
});

describe('evaluateVoteParticipation', () => {
  test('TEST 1: 매주 투표한 회원은 INACTIVE 되지 않는다', () => {
    const r = evaluateVoteParticipation({ id: 7, createdAt: D('2025-01-01'), status: 'ACTIVE' }, sessions([7]), NOW);
    expect(r.shouldDeactivate).toBe(false);
  });

  test('4회 연속 미참여는 기존 정책대로 INACTIVE', () => {
    const r = evaluateVoteParticipation({ id: 7, createdAt: D('2025-01-01'), status: 'ACTIVE' }, sessions([]), NOW);
    expect(r.shouldDeactivate).toBe(true);
  });

  test('복구 이전(정지 기간) 미참여 세션으로 복구 직후 재제재하지 않는다', () => {
    const r = evaluateVoteParticipation(
      { id: 7, createdAt: D('2025-01-01'), status: 'ACTIVE', statusChangedAt: D('2026-10-07') },
      sessions([]),
      NOW
    );
    expect(r.shouldDeactivate).toBe(false);
  });
});

describe('evaluateGameParticipation', () => {
  test('복구 회원은 복구 시점부터 90일 관찰 후 판정', () => {
    const later = D('2026-11-01');
    const games = [{ id: 1, date: D('2026-08-01'), selectedMembers: '[]', memberNames: '[]', attendances: [] }];
    const base = { id: 7, name: '홍길동', createdAt: D('2025-01-01'), status: 'ACTIVE' };
    expect(evaluateGameParticipation(base, games, later, RULES_START).shouldDeactivate).toBe(true);
    expect(
      evaluateGameParticipation({ ...base, statusChangedAt: D('2026-10-07') }, games, later, RULES_START)
        .shouldDeactivate
    ).toBe(false);
  });
});

describe('decideAutoStatus — 경기 규칙 자동 변경 보류', () => {
  const NOW2 = D('2026-10-20T00:00:00.000Z'); // 경기 규칙 90일 관찰기간 이후
  const noShowGames = [{ id: 1, date: D('2026-08-01'), selectedMembers: '[]', memberNames: '[]', attendances: [] }];
  const base = { id: 7, name: '홍길동', createdAt: D('2025-01-01'), status: 'ACTIVE', lastLoginAt: D('2026-07-01') };

  // 12개 세션 중 voted 인덱스만 참여
  const sessionsVoted = (votedIdx) =>
    sessions().map((s, i) => ({ ...s, votes: votedIdx.includes(i) ? [{ userId: 7 }] : [] }));

  const decide = (member, sess, lastVoteAt) =>
    decideAutoStatus(
      member.status,
      evaluateVoteParticipation(member, sess, NOW2),
      evaluateGameParticipation(member, noShowGames, NOW2, RULES_START),
      evaluateLoginActivity({ ...member, lastVoteAt }, NOW2, RULES_START)
    ).status;

  test('경기 규칙 판정 로직은 유지된다 (보류는 자동 변경에만 적용)', () => {
    expect(evaluateGameParticipation(base, noShowGames, NOW2, RULES_START).shouldDeactivate).toBe(true);
  });

  test('SCENARIO A: 매주 투표 + 90일 경기 0회 → ACTIVE 유지', () => {
    expect(decide(base, sessions([7]), D('2026-10-18'))).toBe('ACTIVE');
  });

  test('SCENARIO B: 최근 완료 세션 4회 연속 미참여 → INACTIVE', () => {
    expect(decide(base, sessionsVoted([0, 1, 2, 3, 4, 5, 6, 7]), D('2026-10-18'))).toBe('INACTIVE');
  });

  test('SCENARIO C: 3개월 내 6회 이상 미참여(연속 아님) → ACTIVE 유지 (경고 전용)', () => {
    expect(decide(base, sessionsVoted([1, 3, 5, 7, 9, 11]), D('2026-10-18'))).toBe('ACTIVE');
  });

  test('SCENARIO D: 60일+ 명시적 로그인 없음 + 최근 투표 → 정지 아님', () => {
    expect(decide(base, sessions([7]), D('2026-10-18'))).not.toBe('SUSPENDED');
  });

  test('SCENARIO E: 로그인·투표 모두 60일 이상 없음 → SUSPENDED', () => {
    expect(decide(base, sessions([]), null)).toBe('SUSPENDED');
  });

  test('보류 해제 시 경기 규칙이 다시 적용된다', () => {
    const r = (enabled) =>
      decideAutoStatus('ACTIVE', { shouldDeactivate: false, shouldSuspend: false, reason: '' },
        { shouldDeactivate: true, shouldSuspend: false, reason: 'game' },
        { shouldDeactivate: false, shouldSuspend: false, reason: '' }, enabled).status;
    expect(r(false)).toBe('ACTIVE');
    expect(r(true)).toBe('INACTIVE');
  });
});

describe('Phase 1 정책 — 자동 비활성은 4회 연속 미참여만, 나머지는 관리자 경고', () => {
  const NOW3 = D('2026-10-20T00:00:00.000Z');
  const base = { id: 7, name: '홍길동', createdAt: D('2025-01-01'), status: 'ACTIVE', lastLoginAt: D('2026-07-01') };
  const sess = (votedIdx) => sessions().map((s, i) => ({ ...s, votes: votedIdx.includes(i) ? [{ userId: 7 }] : [] }));
  const playedGames = [{ id: 1, date: D('2026-08-01'), selectedMembers: '[]', memberNames: '[]', attendances: [{ userId: 7 }] }];
  const noShowGames = [{ id: 1, date: D('2026-08-01'), selectedMembers: '[]', memberNames: '[]', attendances: [] }];
  const run = (member, s, games, lastVoteAt) => ({
    status: decideAutoStatus(
      member.status,
      evaluateVoteParticipation(member, s, NOW3),
      evaluateGameParticipation(member, games, NOW3, RULES_START),
      evaluateLoginActivity({ ...member, lastVoteAt }, NOW3, RULES_START)
    ).status,
    warnings: evaluateMemberWarnings(member, s, games, NOW3, RULES_START).map((w) => w.code),
  });

  test('1. 완료 투표 3회 연속 미참여 → ACTIVE + 비활성 예정 경고', () => {
    const r = run(base, sess([0, 1, 2, 3, 4, 5, 6, 7, 8]), playedGames, D('2026-10-18'));
    expect(r.status).toBe('ACTIVE');
    expect(r.warnings).toContain('PRE_DEACTIVATION');
  });

  test('2. 완료 투표 4회 연속 미참여 → INACTIVE', () => {
    expect(run(base, sess([0, 1, 2, 3, 4, 5, 6, 7]), playedGames, D('2026-10-18')).status).toBe('INACTIVE');
  });

  test('3. 3개월 6회 미참여(연속 4회 아님) → ACTIVE + 투표 주의 경고', () => {
    const r = run(base, sess([1, 3, 5, 7, 9, 11]), playedGames, D('2026-10-18'));
    expect(r.status).toBe('ACTIVE');
    expect(r.warnings).toContain('VOTE_MISS_3M');
  });

  test('4·5. 90일 경기 참여 없음 → 상태 변경 없음 + 경기 활동 없음 경고', () => {
    const r = run(base, sess([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), noShowGames, D('2026-10-18'));
    expect(r.status).toBe('ACTIVE');
    expect(r.warnings).toEqual(['NO_GAME_90D']);
  });

  test('6. 60일 로그인 없음 + 최근 투표 → 정지 아님', () => {
    expect(run(base, sess([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), playedGames, D('2026-10-18')).status).toBe('ACTIVE');
  });

  test('7. 60일 로그인·투표 모두 없음 → SUSPENDED', () => {
    expect(run(base, sess([]), playedGames, null).status).toBe('SUSPENDED');
  });

  test('8. 관리자 ACTIVE 복구 → 이전 미참여 기록으로 즉시 재비활성·경고 없음', () => {
    const restored = { ...base, statusChangedAt: D('2026-10-19') };
    const r = run(restored, sess([]), playedGames, null);
    expect(r.status).toBe('ACTIVE');
    expect(r.warnings).not.toContain('PRE_DEACTIVATION');
    expect(r.warnings).not.toContain('VOTE_MISS_3M');
  });

  test('경고 없는 정상 회원은 빈 배열', () => {
    expect(run(base, sess([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), playedGames, D('2026-10-18')).warnings).toEqual([]);
  });
});

describe('9. 관리자 상태 변경은 Vote row를 삭제하지 않는다', () => {
  test('PUT /members/:id 핸들러에 투표 삭제 호출이 없다', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../src/routes/auth_simple.ts'), 'utf8');
    const start = src.indexOf("router.put('/members/:id'");
    const end = src.indexOf('router.', start + 10);
    const handler = src.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(handler).not.toMatch(/deleteVotesForUserInIncompleteSessions|vote\.deleteMany|vote\.delete\(/);
  });
});
