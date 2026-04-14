import type { Task, TaskPriority, TaskTimestamp } from "@/types/task";

export function getDueDateMs(t: Task): number | null {
  if (!t.dueDate) return null;
  const s = "seconds" in t.dueDate ? t.dueDate.seconds : 0;
  return s * 1000;
}

export function isToday(ms: number): boolean {
  const d = new Date(ms);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export function isThisWeek(ms: number): boolean {
  const d = new Date(ms);
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

export function formatDate(ts: Task["createdAt"]): string {
  if (!ts) return "";
  const s = "seconds" in ts ? ts.seconds : 0;
  return new Date(s * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDueDate(ts: Task["dueDate"]): string {
  if (!ts) return "";
  const s = "seconds" in ts ? ts.seconds : 0;
  return new Date(s * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric", year: "numeric" });
}

export function dueDateToInputValue(ts: Task["dueDate"]): string {
  if (!ts) return "";
  const s = "seconds" in ts ? ts.seconds : 0;
  const d = new Date(s * 1000);
  return d.toISOString().slice(0, 10);
}

/** 기한 일시를 datetime-local 형식(YYYY-MM-DDTHH:mm)으로 반환 */
export function dueDateTimeToInputValue(ts: Task["dueDate"]): string {
  if (!ts) return "";
  const s = "seconds" in ts ? ts.seconds : 0;
  const d = new Date(s * 1000);
  return d.toISOString().slice(0, 16);
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
export const PRIORITY_LABEL: Record<TaskPriority, string> = { high: "높음", medium: "보통", low: "낮음" };
export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-slate-100 text-slate-700",
  low: "bg-slate-50 text-slate-500",
};

export function getDdayLabel(t: Task): string | null {
  const ms = getDueDateMs(t);
  if (ms == null || t.completed) return null;
  const due = new Date(ms);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "마감 지남";
  if (diffDays === 0) return "D-Day";
  if (diffDays === 1) return "D-1";
  if (diffDays <= 7) return `D-${diffDays}`;
  return null;
}

export function getStartOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(ms: number, year: number, month: number, date: number): boolean {
  const d = new Date(ms);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === date;
}

export function getTasksForDay(tasks: Task[], year: number, month: number, date: number): Task[] {
  return tasks.filter((t) => {
    const ms = getDueDateMs(t);
    return ms != null && isSameDay(ms, year, month, date);
  });
}

export function filterAndSortTasks(
  tasks: Task[],
  filter: "all" | "active" | "done",
  sort: "dueDate" | "priority" | "created"
): Task[] {
  let list = filter === "active" ? tasks.filter((t) => !t.completed) : filter === "done" ? tasks.filter((t) => t.completed) : [...tasks];
  list = [...list].sort((a, b) => {
    if (sort === "dueDate") {
      const am = getDueDateMs(a) ?? Infinity;
      const bm = getDueDateMs(b) ?? Infinity;
      return am - bm;
    }
    if (sort === "priority") {
      return PRIORITY_ORDER[a.priority ?? "medium"] - PRIORITY_ORDER[b.priority ?? "medium"];
    }
    const as = "seconds" in a.createdAt ? a.createdAt.seconds : 0;
    const bs = "seconds" in b.createdAt ? b.createdAt.seconds : 0;
    return bs - as;
  });
  return list;
}

const nowTimestamp = (): TaskTimestamp => {
  const s = Math.floor(Date.now() / 1000);
  return { seconds: s, nanoseconds: 0 };
};

/** 서버에서 id만 받은 뒤 로컬 상태용 Task 생성 (낙관적 추가) */
export function buildTaskFromInput(
  id: string,
  ownerId: string,
  input: {
    title: string;
    description?: string;
    dueDate?: string | null;
    priority?: TaskPriority;
    location?: string | null;
    attendees?: string | null;
    assignee?: string | null;
    parentTaskId?: string | null;
    isGoal?: boolean;
  }
): Task {
  const ts = nowTimestamp();
  const dueDate =
    input.dueDate != null && input.dueDate !== ""
      ? ({ seconds: new Date(input.dueDate).getTime() / 1000, nanoseconds: 0 } as TaskTimestamp)
      : undefined;
  return {
    id,
    title: input.title,
    description: input.description,
    completed: false,
    ownerId,
    dueDate,
    priority: input.priority ?? "medium",
    location: input.location ?? undefined,
    attendees: input.attendees ?? undefined,
    assignee: input.assignee ?? undefined,
    parentTaskId: input.parentTaskId ?? undefined,
    isGoal: input.isGoal ?? false,
    createdAt: ts,
    updatedAt: ts,
  };
}
