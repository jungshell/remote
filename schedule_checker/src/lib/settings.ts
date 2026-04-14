const KEY = 'autoflow_settings';

export type TemplateSchedule = {
  templateId: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string; // "09:00"
};

export type Settings = {
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
  dailySummaryTime?: string; // "18:30"
  pushEnabled?: boolean;
  templateSchedules?: TemplateSchedule[];
};

export function getSettings(): Settings {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setSettings(s: Partial<Settings>): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = getSettings();
    const next = { ...prev, ...s };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** 현재 시간이 Quiet hours 구간이면 true */
export function isQuietHourNow(settings: Settings): boolean {
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;
  if (!start || !end) return false;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60; // overnight
  let curr = currentMins;
  if (curr < startMins) curr += 24 * 60;
  return curr >= startMins && curr < endMins;
}
