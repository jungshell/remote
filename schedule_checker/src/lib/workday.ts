/**
 * 주말·공휴일 여부 판단 (일일 업무보고·슬랙 등 평일만 실행할 때 사용)
 */

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 한국 공휴일 (yyyy-mm-dd). 필요 시 연도별로 확장 */
function getKoreanHolidays(year: number): Set<string> {
  const set = new Set<string>();
  const fmt = (m: number, day: number) => `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  set.add(fmt(1, 1));
  set.add(fmt(3, 1));
  set.add(fmt(5, 5));
  set.add(fmt(6, 6));
  set.add(fmt(8, 15));
  set.add(fmt(10, 3));
  set.add(fmt(10, 9));
  set.add(fmt(12, 25));
  const koreanNewYear = getLunarNewYear(year);
  koreanNewYear.forEach((d) => set.add(d));
  return set;
}

function getLunarNewYear(year: number): string[] {
  const dates: string[] = [];
  if (year === 2025) {
    dates.push("2025-01-28", "2025-01-29", "2025-01-30");
  } else if (year === 2026) {
    dates.push("2026-02-16", "2026-02-17", "2026-02-18");
  } else {
    dates.push(`${year}-02-01`, `${year}-02-02`, `${year}-02-03`);
  }
  return dates;
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isHoliday(d: Date): boolean {
  return getKoreanHolidays(d.getFullYear()).has(toYmd(d));
}

export function shouldRunDailyReportOrSlack(d: Date): boolean {
  if (isWeekend(d)) return false;
  if (isHoliday(d)) return false;
  return true;
}
