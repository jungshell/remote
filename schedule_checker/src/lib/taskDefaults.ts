const KEY = 'autoflow_task_defaults';

export type TaskDefaults = {
  assigner?: string;
  assigneeId?: string;
};

export function getTaskDefaults(): TaskDefaults {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setTaskDefaults(next: TaskDefaults): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = getTaskDefaults();
    localStorage.setItem(KEY, JSON.stringify({ ...prev, ...next }));
  } catch {
    // ignore
  }
}
