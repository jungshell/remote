/**
 * 유틸리티 함수 모음
 */

/**
 * 날짜를 YYYY. MM. DD.(요일) 형식으로 변환
 */
export function formatDisplayDate(value: string): string {
  if (!value) return "";
  const match = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return value;
  const [, year, monthRaw, dayRaw] = match;
  const month = monthRaw.padStart(2, "0");
  const day = dayRaw.padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  try {
    const date = new Date(`${iso}T12:00:00Z`);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getUTCDay()] ?? "";
    return `${year}. ${month}. ${day}.(${weekday})`;
  } catch {
    return `${year}. ${month}. ${day}.`;
  }
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 */
export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * 날씨 코드를 한글 설명으로 변환
 */
export const weatherMap: Record<number, string> = {
  0: "맑음",
  1: "대체로 맑음",
  2: "부분적으로 흐림",
  3: "흐림",
  45: "안개",
  48: "서리 안개",
  51: "이슬비(약)",
  61: "비(약)",
  33: "비(중)",
  71: "눈(약)",
  73: "눈(중)",
  80: "소나기(약)",
  95: "뇌우",
  96: "뇌우와 우박",
};

/**
 * 안전한 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "알 수 없는 오류가 발생했습니다";
}

/**
 * 디바운스 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 배열을 청크로 나누기
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
