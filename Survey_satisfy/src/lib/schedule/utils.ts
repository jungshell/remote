import type { SchedulePoll, ScheduleDateSelection, ScheduleTimeSlot } from "@/types/schedule";

interface SchedulePollRow {
  id: string;
  title: string;
  description: string | null;
  dates: unknown;
  time_slots: unknown;
  include_lunch: boolean;
  include_dinner: boolean;
  status: string;
  deadline: string | null;
  created_at?: string;
}

export function generateSchedulePollId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `schedule-${suffix}`;
}

export function parseDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date));
}

export function parseTimeSlots(raw: unknown): ScheduleTimeSlot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const slots: ScheduleTimeSlot[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";
      if (id && label) {
        slots.push({ id, label });
      }
    }
  }
  return slots;
}

export function pollRowToRecord(row: SchedulePollRow): SchedulePoll {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dates: parseDates(row.dates),
    timeSlots: parseTimeSlots(row.time_slots),
    includeLunch: Boolean(row.include_lunch),
    includeDinner: Boolean(row.include_dinner),
    status: row.status === "종료" ? "종료" : "진행중",
    deadline: row.deadline,
    createdAt: row.created_at,
  };
}

export function parseSelections(raw: unknown): ScheduleDateSelection[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: ScheduleDateSelection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const date = typeof record.date === "string" ? record.date : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }
    const slots = Array.isArray(record.slots)
      ? record.slots.filter((slot): slot is string => typeof slot === "string")
      : [];
    result.push({
      date,
      slots,
      lunch: record.lunch === true,
      dinner: record.dinner === true,
    });
  }
  return result;
}
