/**
 * 투표 관련 유틸리티 함수
 * 날짜 계산, 세션 검증 등 공통 로직 통합
 */

/**
 * 한국 시간 기준 현재 시간 반환
 */
export function getKoreaTime(): Date {
  const currentTime = new Date();
  return new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

export function getKstDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

/**
 * 이번주 월요일 계산 (한국시간 기준)
 */
export function getThisWeekMonday(koreaTime?: Date): Date {
  const korea = koreaTime || getKoreaTime();
  const currentDay = korea.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  
  let daysUntilMonday: number;
  if (currentDay === 0) {
    daysUntilMonday = -6; // 지난 월요일
  } else if (currentDay === 1) {
    daysUntilMonday = 0; // 오늘
  } else {
    daysUntilMonday = 1 - currentDay; // 이번주 월요일
  }
  
  const thisWeekMonday = new Date(korea);
  thisWeekMonday.setDate(korea.getDate() + daysUntilMonday);
  thisWeekMonday.setHours(0, 0, 0, 0);
  
  return thisWeekMonday;
}

/**
 * 다음주 월요일 계산
 */
export function getNextWeekMonday(koreaTime?: Date): Date {
  const thisWeekMonday = getThisWeekMonday(koreaTime);
  const nextWeekMonday = new Date(thisWeekMonday);
  nextWeekMonday.setDate(thisWeekMonday.getDate() + 7);
  nextWeekMonday.setHours(0, 0, 0, 0);
  return nextWeekMonday;
}

/**
 * 주간 금요일 계산 (월요일 기준 +4일)
 */
export function getWeekFriday(weekMonday: Date): Date {
  const friday = new Date(weekMonday);
  friday.setDate(weekMonday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

/**
 * 세션 대상 주(weekStartDate=월요일) 기준 마감시각: 직전 일요일 23:59:59.999
 */
export function getVoteSessionSundayDeadline(weekMonday: Date): Date {
  const deadline = new Date(weekMonday);
  deadline.setDate(weekMonday.getDate() - 1);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

/**
 * 세션이 만료되었는지 확인
 */
export function isSessionExpired(session: { weekStartDate: Date; endTime?: Date }): boolean {
  const koreaTime = getKoreaTime();
  const weekEnd = session.endTime || getWeekFriday(new Date(session.weekStartDate));
  return weekEnd < koreaTime;
}

/**
 * 세션이 활성 상태인지 확인
 */
export function isSessionActive(session: { 
  isActive: boolean; 
  isCompleted: boolean; 
  weekStartDate: Date;
  endTime?: Date;
}): boolean {
  if (!session.isActive || session.isCompleted) {
    return false;
  }
  
  // 만료된 세션은 비활성
  if (isSessionExpired(session)) {
    return false;
  }
  
  return true;
}

/**
 * 투표 데이터 파싱 (안전한 JSON 파싱)
 * - DB에 배열이 아니라 "이중 JSON 문자열"로 들어간 레거시도 배열로 복원
 * - JSON이 아니면 단일 항목 배열로 취급
 */
export function parseVoteDays(selectedDays: string | string[] | null | undefined): string[] {
  if (!selectedDays) {
    return [];
  }

  if (Array.isArray(selectedDays)) {
    return selectedDays.filter((day) => typeof day === 'string' && day.length > 0);
  }

  if (typeof selectedDays === 'string') {
    const raw = selectedDays.trim();
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw ? [raw] : [];
    }

    // "\"[\\\"MON\\\"]\"" 처럼 문자열로 한 번 더 감싸진 경우 unwrap
    let depth = 0;
    while (typeof parsed === 'string' && depth < 5) {
      const inner = (parsed as string).trim();
      if (!inner) return [];
      try {
        parsed = JSON.parse(inner);
        depth += 1;
      } catch {
        return [inner];
      }
    }

    if (Array.isArray(parsed)) {
      return parsed.filter((day) => typeof day === 'string' && day.length > 0);
    }
    if (typeof parsed === 'string' && parsed.length > 0) {
      return [parsed];
    }
    return [];
  }

  return [];
}

/**
 * 한국어 날짜를 영어 요일 코드로 변환
 */
export function convertKoreanDateToDayCode(koreanDate: string): string {
  if (koreanDate.includes('월)')) return 'MON';
  if (koreanDate.includes('화)')) return 'TUE';
  if (koreanDate.includes('수)')) return 'WED';
  if (koreanDate.includes('목)')) return 'THU';
  if (koreanDate.includes('금)')) return 'FRI';
  return koreanDate; // 이미 영어 코드인 경우 그대로 반환
}

export type WeekdayKey = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

function normalizeVoteDayToWeekdayKey(day: string): WeekdayKey | null {
  const t = String(day).trim();
  if (!t || t === '불참') return null;
  const c = convertKoreanDateToDayCode(t);
  const u = c.toUpperCase();
  const keys: WeekdayKey[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return keys.includes(u as WeekdayKey) ? (u as WeekdayKey) : null;
}

const MON_FRI_KEYS: WeekdayKey[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

/** 일정투표 집계용: 월~금 또는 불참만 반환 (토·일 등은 null) */
export function voteDayToMonFriAbsentKey(day: string): WeekdayKey | '불참' | null {
  const t = String(day).trim();
  if (!t) return null;
  if (t === '불참') return '불참';
  const k = normalizeVoteDayToWeekdayKey(t);
  if (!k) return null;
  return MON_FRI_KEYS.includes(k) ? k : null;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * 한글 날짜가 깨져도(예: "5? 13?(?)") 숫자만으로 월·일 추출
 */
export function parseMonthDayFromLooseToken(day: string): { month: number; day: number } | null {
  const t = String(day).trim();
  const standard = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (standard) {
    const month = parseInt(standard[1], 10);
    const d = parseInt(standard[2], 10);
    if (month >= 1 && month <= 12 && d >= 1 && d <= 31) return { month, day: d };
  }
  const loose = t.match(/(\d{1,2})\D+(\d{1,2})/);
  if (loose) {
    const month = parseInt(loose[1], 10);
    const d = parseInt(loose[2], 10);
    if (month >= 1 && month <= 12 && d >= 1 && d <= 31) return { month, day: d };
  }
  return null;
}

/**
 * 달력 날짜를 세션 주(weekStart=월)의 월~금 슬롯으로 매핑.
 * 해당 주 밖이면 "같은 요일"이 오는 월~금 칸으로 맞춤(잘못된 절대일 표기 복구용).
 */
export function mapCalendarDateToMonFriInSessionWeek(cal: Date, sessionWeekStart: Date): WeekdayKey | null {
  const ws = startOfLocalDay(sessionWeekStart);
  const d = startOfLocalDay(cal);
  const diffDays = Math.round((d.getTime() - ws.getTime()) / 86400000);
  if (diffDays >= 0 && diffDays <= 4) {
    return MON_FRI_KEYS[diffDays];
  }
  const dow = d.getDay();
  if (dow < 1 || dow > 5) return null;
  for (let i = 0; i < 5; i++) {
    const t = new Date(ws);
    t.setDate(ws.getDate() + i);
    if (t.getDay() === dow) {
      return MON_FRI_KEYS[i];
    }
  }
  return null;
}

/**
 * 세션 주 기준으로 투표 항목 → MON..FRI | 불참
 * (UTF-8 깨짐·잘못된 한글 날짜는 숫자만 복구 후 세션 주 요일로 매핑)
 */
export function voteDayToMonFriAbsentKeyForSession(
  day: string,
  sessionWeekStart: Date
): WeekdayKey | '불참' | null {
  const direct = voteDayToMonFriAbsentKey(day);
  if (direct) return direct;
  const md = parseMonthDayFromLooseToken(day);
  if (!md) return null;
  const year = sessionWeekStart.getFullYear();
  const candidate = new Date(year, md.month - 1, md.day);
  if (isNaN(candidate.getTime())) return null;
  return mapCalendarDateToMonFriInSessionWeek(candidate, sessionWeekStart);
}

/**
 * 관리자 결과·자동일정 집계 시 비활성(INACTIVE)·정지(SUSPENDED) 회원 제외.
 * user 관계가 없으면 레거시 호환으로 해당 행은 집계에 포함한다.
 */
export function filterVotesForResultsDisplay<T extends { user?: { status?: string } | null }>(
  votes: T[] | undefined | null
): T[] {
  if (!votes?.length) return [];
  return votes.filter((v) => {
    const u = v.user;
    if (u == null) return true;
    const s = u.status;
    if (s === 'INACTIVE' || s === 'SUSPENDED') return false;
    return true;
  });
}

/** 투표 행(JSON selectedDays)을 요일별 득표·참가자 이름으로 집계 (한글 날짜/영문 코드 혼용 지원) */
export function aggregateVotesByWeekday(
  votes: Array<{ selectedDays: string; user?: { name: string; status?: string } | null }>,
  sessionWeekStart?: Date
): { counts: Record<WeekdayKey, number>; participantsByDay: Record<WeekdayKey, string[]> } {
  const counts: Record<WeekdayKey, number> = {
    MON: 0,
    TUE: 0,
    WED: 0,
    THU: 0,
    FRI: 0,
    SAT: 0,
    SUN: 0
  };
  const participantsByDay: Record<WeekdayKey, string[]> = {
    MON: [],
    TUE: [],
    WED: [],
    THU: [],
    FRI: [],
    SAT: [],
    SUN: []
  };

  const filteredVotes = filterVotesForResultsDisplay(votes);

  for (const vote of filteredVotes) {
    const days = parseVoteDays(vote.selectedDays);
    const name = vote.user?.name;
    for (const day of days) {
      let key: WeekdayKey | null = null;
      if (sessionWeekStart) {
        const mapped = voteDayToMonFriAbsentKeyForSession(day, sessionWeekStart);
        if (mapped === '불참') continue;
        if (mapped) {
          key = mapped;
        } else {
          key = normalizeVoteDayToWeekdayKey(day);
        }
      } else {
        key = normalizeVoteDayToWeekdayKey(day);
      }
      if (!key) continue;
      counts[key] += 1;
      if (name && !participantsByDay[key].includes(name)) {
        participantsByDay[key].push(name);
      }
    }
  }

  return { counts, participantsByDay };
}

