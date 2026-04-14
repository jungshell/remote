/** 오전 8시~오후 8시, 30분 단위. 오름차순(오전 8시 → 오후 8시) */
export const TIME_SLOTS_30MIN: { value: string; label: string }[] = (() => {
  const items: { value: string; label: string }[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) continue;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const label = h < 12 ? `오전 ${h}시 ${m ? "30분" : "00분"}` : h === 12 ? `오후 12시 ${m ? "30분" : "00분"}` : `오후 ${h - 12}시 ${m ? "30분" : "00분"}`;
      items.push({ value, label });
    }
  }
  return items;
})();

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 할일 추가 시 기본 일시: 현재 시각에 가장 가까운 30분 단위(오전 8시~오후 8시) */
export function getDefaultDueDateTime(): string {
  const now = new Date();
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let h = now.getHours();
  let m = now.getMinutes();
  if (h < 8) {
    h = 8;
    m = 0;
  } else if (h >= 20) {
    d.setDate(d.getDate() + 1);
    h = 8;
    m = 0;
  } else {
    const totalMin = h * 60 + m;
    let slot = Math.round(totalMin / 30) * 30;
    if (slot > 20 * 60) slot = 20 * 60;
    if (slot < 8 * 60) slot = 8 * 60;
    h = Math.floor(slot / 60);
    m = slot % 60;
  }
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dateStr = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${date.toString().padStart(2, "0")}`;
  const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${dateStr}T${timeStr}`;
}

export function formatDateWithWeekday(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr + "T12:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAY_LABELS[d.getDay()];
  return `${m}월 ${day}일 (${w})`;
}

export function formatWeekdayOnly(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr + "T12:00:00");
  const w = WEEKDAY_LABELS[d.getDay()];
  return `(${w})`;
}

/** 시간 문자열을 30분 단위(8~20시)로 정규화 */
export function normalizeTimeToSlot(timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "08:00";
  let h = Math.min(20, Math.max(8, parseInt(match[1], 10)));
  let m = parseInt(match[2], 10) >= 30 ? 30 : 0;
  if (h === 20 && m === 30) m = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
