"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fetchTasks, createTask, updateTask, deleteTask } from "@/lib/tasks";
import {
  getDueDateMs,
  isToday,
  isThisWeek,
  formatDate,
  formatDueDate,
  dueDateTimeToInputValue,
  getDdayLabel,
  getStartOfWeek,
  getTasksForDay,
  filterAndSortTasks,
  buildTaskFromInput,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
} from "@/lib/task-utils";
import { getDefaultDueDateTime, TIME_SLOTS_30MIN, formatDateWithWeekday, formatWeekdayOnly, normalizeTimeToSlot } from "@/lib/datetime-helpers";
import { ConfirmModal } from "@/components/ConfirmModal";
import { TaskCheckbox } from "@/components/TaskCheckbox";
import { TaskFormModal, type TaskFormValues } from "@/components/TaskFormModal";
import { TaskEditModal } from "@/components/TaskEditModal";
import type { Task, TaskPriority } from "@/types/task";

function TaskListSkeleton() {
  return (
    <ul className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <li key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
          <div className="shrink-0 w-5 h-5 rounded border-2 border-slate-200 animate-skeleton bg-slate-100" />
          <div className="flex-1 min-w-0">
            <div className="h-5 w-3/4 rounded bg-slate-100 animate-skeleton mb-2" />
            <div className="h-3 w-1/2 rounded bg-slate-50 animate-skeleton" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [subTaskTitle, setSubTaskTitle] = useState("");
  const [subTaskDueDateTime, setSubTaskDueDateTime] = useState(() => getDefaultDueDateTime());
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editSubTaskTitle, setEditSubTaskTitle] = useState("");
  const [editSubTaskDueDateTime, setEditSubTaskDueDateTime] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "done">("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "created">("dueDate");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "week" | "month">("list");
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [monthView, setMonthView] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [monthCellSelected, setMonthCellSelected] = useState<{ y: number; m: number; d: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      setTasksLoading(true);
      try {
        const list = await fetchTasks(user.uid);
        if (!cancelled) setTasks(list);
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  async function handleRefresh() {
    if (!user) return;
    setTasksLoading(true);
    try {
      const list = await fetchTasks(user.uid);
      setTasks(list);
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !quickAddTitle.trim() || submitting) return;
    setSubmitting(true);
    const defaultDue = getDefaultDueDateTime();
    const dueDateIso = new Date(defaultDue).toISOString();
    const titleToAdd = quickAddTitle.trim();
    try {
      const id = await createTask(user.uid, {
        title: titleToAdd,
        dueDate: dueDateIso,
        priority: "medium",
      });
      const newTask = buildTaskFromInput(id, user.uid, { title: titleToAdd, dueDate: dueDateIso, priority: "medium" });
      setTasks((prev) => [newTask, ...prev]);
      setQuickAddTitle("");
      toast("추가됐어요");
      user.getIdToken().then((token) => {
        fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ taskId: id, title: titleToAdd, dueDate: dueDateIso }),
        }).catch(() => {});
      }).catch(() => {});
    } catch {
      toast("저장에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddFromModal(values: TaskFormValues) {
    if (!user || submitting) return;
    setSubmitting(true);
    const dueDateIso = values.dueDateTime.trim() ? new Date(values.dueDateTime).toISOString() : "";
    const input = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      dueDate: dueDateIso || undefined,
      priority: values.priority,
      isGoal: values.isGoal,
      parentTaskId: values.parentTaskId,
      location: values.location.trim() || undefined,
      attendees: values.attendees.trim() || undefined,
      assignee: values.assignee?.trim() || undefined,
    };
    try {
      const id = await createTask(user.uid, input);
      const newTask = buildTaskFromInput(id, user.uid, { ...input, dueDate: dueDateIso || undefined });
      setTasks((prev) => [newTask, ...prev]);
      toast("추가됐어요");
      user.getIdToken().then((token) => {
        fetch("/api/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ taskId: id, title: input.title, dueDate: dueDateIso || undefined }),
        }).catch(() => {});
      }).catch(() => {});
    } catch {
      toast("저장에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(t: Task) {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      await updateTask(t.id, user.uid, { completed: !t.completed });
      setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(payload: { title: string; description?: string; dueDate: string | null; priority: TaskPriority }) {
    if (!user || !editingId || submitting) return;
    setSubmitting(true);
    try {
      await updateTask(editingId, user.uid, {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
        priority: payload.priority,
      });
      setTasks((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? {
                ...x,
                title: payload.title,
                description: payload.description,
                dueDate: payload.dueDate ? { seconds: new Date(payload.dueDate).getTime() / 1000, nanoseconds: 0 } as Task["dueDate"] : null,
                priority: payload.priority,
              }
            : x
        )
      );
      setEditingId(null);
      toast("수정됐어요");
    } catch {
      toast("수정에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    const taskId = deleteConfirmId;
    setDeleteConfirmId(null);
    if (!user || !taskId || submitting) return;
    setSubmitting(true);
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((x) => x.id !== taskId));
      toast("삭제됐어요");
    } catch {
      toast("삭제에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const deleteConfirmTask = deleteConfirmId ? tasks.find((t) => t.id === deleteConfirmId) : null;
  const deleteConfirmSubCount = deleteConfirmTask ? tasks.filter((t) => t.parentTaskId === deleteConfirmId).length : 0;

  const projects = tasks.filter((t) => t.isGoal && !t.parentTaskId);
  const hasProjects = projects.length > 0;
  const visibleBaseTasks =
    !hasProjects || selectedProjectId === "all"
      ? tasks.filter((t) => !t.parentTaskId && !t.isGoal)
      : tasks.filter((t) => t.parentTaskId === selectedProjectId && !t.isGoal);
  const filteredTasks = filterAndSortTasks(visibleBaseTasks, filterStatus, sortBy).filter(
    (t) =>
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const activeTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">업무 불러오는 중…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">업무</span>
            <span className="text-slate-400">|</span>
            <nav className="flex items-center gap-2" aria-label="주 메뉴">
              <span className="text-sm text-slate-400 cursor-default" title="준비 중">연락처</span>
              <span className="text-sm text-slate-400 cursor-default" title="준비 중">알림</span>
              <span className="text-sm text-slate-400 cursor-default" title="준비 중">템플릿</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="홈(업무)">홈</Link>
            <Link href="/settings" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800" aria-label="설정">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </Link>
            <button type="button" onClick={() => signOut().then(() => router.push("/login"))} className="text-sm text-indigo-600 hover:underline min-h-[44px] px-2 flex items-center">로그아웃</button>
          </div>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="sticky top-[52px] z-30 bg-slate-50 pt-2 pb-4 -mx-4 px-4 space-y-2">
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <input
              type="text"
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="할 일 입력 후 Enter 또는 추가"
              className="flex-1 min-h-[48px] px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              aria-label="한 줄 빠른 추가"
            />
            <button
              type="submit"
              disabled={submitting || !quickAddTitle.trim()}
              className="min-h-[48px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 shrink-0"
            >
              추가
            </button>
          </form>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-500"
          >
            + 상세 옵션으로 할 일 추가
          </button>
        </div>

        {!tasksLoading && tasks.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {(["list", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewMode(v)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === v ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"}`}
                >
                  {v === "list" ? "목록" : v === "week" ? "주간" : "월간"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mb-1">전체 기준 · 할 일 옆 ▼를 누르면 세부 업무를 추가·관리할 수 있습니다.</p>
            <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-indigo-50">
                <p className="text-2xl font-bold text-indigo-700">{tasks.filter((t) => !t.completed).length}</p>
                <p className="text-xs text-indigo-600">진행 중</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50">
                <p className="text-2xl font-bold text-amber-700">
                  {tasks.filter((t) => !t.completed && getDueDateMs(t) !== null && isToday(getDueDateMs(t)!)).length}
                </p>
                <p className="text-xs text-amber-600">오늘 할 일</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-100">
                <p className="text-2xl font-bold text-slate-700">
                  {tasks.filter((t) => !t.completed && getDueDateMs(t) !== null && isThisWeek(getDueDateMs(t)!)).length}
                </p>
                <p className="text-xs text-slate-600">이번 주 마감</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50">
                <p className="text-2xl font-bold text-emerald-700">
                  {tasks.filter((t) => t.completed).length}/{tasks.length}
                </p>
                <p className="text-xs text-emerald-600">완료</p>
              </div>
            </div>
          </>
        )}
        {!tasksLoading && tasks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 items-center" role="search" aria-label="업무 검색 및 필터">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색…"
              className="min-h-[44px] flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              aria-label="업무 검색"
            />
            <button type="button" onClick={handleRefresh} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="목록 새로고침">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "done")}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              aria-label="상태 필터"
            >
              <option value="all">전체</option>
              <option value="active">진행 중</option>
              <option value="done">완료</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "dueDate" | "priority" | "created")}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              aria-label="정렬 기준"
            >
              <option value="dueDate">마감일순</option>
              <option value="priority">우선순위순</option>
              <option value="created">최신순</option>
            </select>
          </div>
        )}
        {tasksLoading ? (
          <TaskListSkeleton />
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <p className="text-slate-700 font-medium mb-1">첫 할 일을 추가해 보세요</p>
            <p className="text-sm text-slate-400">상단 &quot;할 일 추가&quot; 버튼 또는 우측 하단 + 버튼을 누르면 모달에서 추가할 수 있습니다.</p>
          </div>
        ) : viewMode === "week" ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })} className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded">이전 주</button>
              <span className="font-medium text-slate-800">
                {weekStart.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ~ {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
              </span>
              <button type="button" onClick={() => setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })} className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded">다음 주</button>
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[280px]">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                const dayTasks = getTasksForDay(tasks, d.getFullYear(), d.getMonth(), d.getDate());
                const isTodayDate = new Date().getFullYear() === d.getFullYear() && new Date().getMonth() === d.getMonth() && new Date().getDate() === d.getDate();
                return (
                  <div key={i} className={`p-2 ${isTodayDate ? "bg-indigo-50" : ""}`}>
                    <p className={`text-xs font-medium ${isTodayDate ? "text-indigo-700" : "text-slate-500"}`}>
                      {d.toLocaleDateString("ko-KR", { weekday: "short" })}
                    </p>
                    <p className={`text-sm font-semibold ${isTodayDate ? "text-indigo-800" : "text-slate-800"}`}>{d.getDate()}일</p>
                    <ul className="mt-2 space-y-1">
                      {dayTasks.map((t) => (
                        <li key={t.id} className="text-xs truncate flex items-center gap-1">
                          <TaskCheckbox checked={t.completed} onToggle={() => handleToggle(t)} disabled={submitting} size="sm" ariaLabel={`${t.title} 완료 토글`} />
                          <span className={`flex-1 min-w-0 truncate ${t.completed ? "line-through text-slate-400" : ""}`}>{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === "month" ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
              <button type="button" onClick={() => { setMonthView((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); setMonthCellSelected(null); }} className="min-h-[44px] px-3 text-slate-600 hover:bg-slate-200 rounded-lg">이전 달</button>
              <span className="font-medium text-slate-800">{monthView.toLocaleDateString("ko-KR", { month: "long", year: "numeric" })}</span>
              <button type="button" onClick={() => { setMonthView((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); setMonthCellSelected(null); }} className="min-h-[44px] px-3 text-slate-600 hover:bg-slate-200 rounded-lg">다음 달</button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
                {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const y = monthView.getFullYear();
                  const m = monthView.getMonth();
                  const first = new Date(y, m, 1);
                  const start = getStartOfWeek(first);
                  const cells: React.ReactNode[] = [];
                  for (let i = 0; i < 42; i++) {
                    const d = new Date(start);
                    d.setDate(d.getDate() + i);
                    const inMonth = d.getMonth() === m;
                    const dayTasks = getTasksForDay(tasks, d.getFullYear(), d.getMonth(), d.getDate());
                    const isTodayDate = new Date().getFullYear() === d.getFullYear() && new Date().getMonth() === d.getMonth() && new Date().getDate() === d.getDate();
                    const isSelected = monthCellSelected?.y === y && monthCellSelected?.m === m && monthCellSelected?.d === d.getDate();
                    cells.push(
                      <button
                        key={i}
                        type="button"
                        onClick={() => inMonth && setMonthCellSelected({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() })}
                        className={`min-h-[60px] p-1 rounded border text-left w-full ${inMonth ? "bg-white border-slate-100 hover:bg-indigo-50" : "bg-slate-50 border-slate-100 text-slate-400 cursor-default"} ${isTodayDate ? "ring-2 ring-indigo-500" : ""} ${isSelected ? "bg-indigo-100 ring-2 ring-indigo-400" : ""}`}
                      >
                        <span className="text-sm font-medium">{d.getDate()}</span>
                        {dayTasks.length > 0 && (
                          <p className="text-xs text-indigo-600 mt-0.5">{dayTasks.filter((x) => !x.completed).length}건</p>
                        )}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.6fr)]">
            <aside className="space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">프로젝트</h3>
                  {hasProjects && (
                    <span className="text-xs text-slate-400">{projects.length}개</span>
                  )}
                </div>
                {hasProjects ? (
                  <ul className="space-y-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => setSelectedProjectId("all")}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                          selectedProjectId === "all"
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>전체 업무</span>
                        <span className="text-xs text-slate-400">
                          {tasks.filter((t) => !t.parentTaskId && !t.isGoal).length}건
                        </span>
                      </button>
                    </li>
                    {projects.map((p) => {
                      const projectTasks = tasks.filter((t) => t.parentTaskId === p.id && !t.isGoal);
                      const doneCount = projectTasks.filter((t) => t.completed).length;
                      const progress = projectTasks.length
                        ? Math.round((doneCount / projectTasks.length) * 100)
                        : 0;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(p.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                              selectedProjectId === p.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{p.title}</span>
                              <span className="text-[11px] opacity-80">
                                {doneCount}/{projectTasks.length || 0}
                              </span>
                            </div>
                            {projectTasks.length > 0 && (
                              <div className="mt-1 h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                            {p.dueDate != null && (
                              <p className="mt-1 text-[11px] text-slate-200 md:text-slate-100">
                                마감 {formatDueDate(p.dueDate)}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    아직 프로젝트(목표)가 없어요.
                    <br />
                    &quot;상세 옵션으로 할 일 추가&quot;에서 <span className="font-semibold">목표로 추가</span>를
                    체크하면 프로젝트로 사용할 수 있어요.
                  </p>
                )}
              </div>
            </aside>
            <div className="space-y-4">
              {(filterStatus === "all" || filterStatus === "active") && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">진행 중</h3>
                    <span className="text-xs text-slate-400">{activeTasks.length}건</span>
                  </div>
                  <ul className="space-y-2">
                    {activeTasks.map((t, i) => {
                      const subtasks = tasks.filter((st) => st.parentTaskId === t.id);
                      const doneCount = subtasks.filter((st) => st.completed).length;
                      const progress = subtasks.length
                        ? Math.round((doneCount / subtasks.length) * 100)
                        : 0;
                      const isExpanded = expandedTaskId === t.id;
                      return (
                        <li
                          key={t.id}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 transition-shadow hover:shadow-md">
                            <TaskCheckbox
                              checked={t.completed}
                              onToggle={() => handleToggle(t)}
                              disabled={submitting}
                              ariaLabel={`${t.title} 완료 토글`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium flex-1 text-slate-800">{t.title}</p>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTaskId((id) => (id === t.id ? null : t.id))}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-lg"
                                  aria-label={isExpanded ? "접기" : "세부 업무 보기/추가"}
                                >
                                  <svg
                                    className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                              {subtasks.length > 0 && (
                                <>
                                  <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">{doneCount}/{subtasks.length} 완료</p>
                                </>
                              )}
                              {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_STYLE[t.priority ?? "medium"]}`}>{PRIORITY_LABEL[t.priority ?? "medium"]}</span>
                                {t.dueDate != null && <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">마감 {formatDueDate(t.dueDate)}</span>}
                              </div>
                            </div>
                          </div>
                          {isExpanded && subtasks.length > 0 && (
                            <div className="mt-2 ml-4 pl-4 border-l-2 border-indigo-100 space-y-1">
                              {subtasks.map((st) => (
                                <div key={st.id} className="flex items-center gap-2 text-sm">
                                  <TaskCheckbox checked={st.completed} onToggle={() => handleToggle(st)} disabled={submitting} size="sm" ariaLabel={`${st.title} 완료 토글`} />
                                  <span className={st.completed ? "line-through text-slate-500" : "text-slate-700"}>{st.title}</span>
                                  {st.dueDate != null && <span className="text-xs text-slate-400">{formatDueDate(st.dueDate)}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {(filterStatus === "all" || filterStatus === "done") && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">완료</h3>
                    <span className="text-xs text-slate-400">{completedTasks.length}건</span>
                  </div>
                  <ul className="space-y-2">
                    {completedTasks.map((t, i) => {
                  const subtasks = tasks.filter((st) => st.parentTaskId === t.id);
                  const doneCount = subtasks.filter((st) => st.completed).length;
                  const progress = subtasks.length
                    ? Math.round((doneCount / subtasks.length) * 100)
                    : 0;
                  const isExpanded = expandedTaskId === t.id;
                  return (
                    <li
                      key={t.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* 여기에는 기존 상위 업무 + 하위 업무 JSX 전체를 다시 붙여 넣어도 되고,
                          당장은 상위 업무 한 줄만 보여주고 싶다면 간단한 버전으로 사용해도 됩니다. */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 transition-shadow hover:shadow-md">
                        <TaskCheckbox
                          checked={t.completed}
                          onToggle={() => handleToggle(t)}
                          disabled={submitting}
                          ariaLabel={`${t.title} 완료 토글`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-medium flex-1 ${
                                t.completed ? "line-through text-slate-500" : "text-slate-800"
                              }`}
                            >
                              {t.title}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTaskId((id) => (id === t.id ? null : t.id))
                              }
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-lg"
                              aria-label={isExpanded ? "접기" : "세부 업무 보기/추가"}
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          </div>
                          {subtasks.length > 0 && (
                            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                          {subtasks.length > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {doneCount}/{subtasks.length} 완료
                            </p>
                          )}
                          {t.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>
                          )}
                          {(t.location || t.attendees) && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {[t.location, t.attendees].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                PRIORITY_STYLE[t.priority ?? "medium"]
                              }`}
                            >
                              {PRIORITY_LABEL[t.priority ?? "medium"]}
                            </span>
                            {(() => {
                              const dday = getDdayLabel(t);
                              return dday ? (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    dday === "마감 지남"
                                      ? "bg-red-100 text-red-800"
                                      : dday === "D-Day"
                                      ? "bg-red-200 text-red-900"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {dday}
                                </span>
                              ) : null;
                            })()}
                            {t.dueDate != null && (
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                마감 {formatDueDate(t.dueDate)}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {formatDate(t.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingId(t.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-indigo-600 rounded-lg"
                            aria-label="수정"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(t.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg"
                            aria-label="삭제"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 ml-4 pl-4 border-l-2 border-indigo-100 space-y-2">
                          {/* 하위 업무 편집/추가 섹션은 나중에 단계적으로 다시 붙일 수 있습니다. */}
                        </div>
                      )}
                    </li>
                  );
                    })}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}
        {viewMode === "month" && monthCellSelected && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-slate-700">
                {monthCellSelected.d}일 할 일
              </h3>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(monthCellSelected!.y, monthCellSelected!.m, monthCellSelected!.d);
                  setWeekStart(getStartOfWeek(d));
                  setViewMode("week");
                  setMonthCellSelected(null);
                }}
                className="min-h-[36px] px-3 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50"
              >
                주간 보기로 이동
              </button>
            </div>
            <ul className="space-y-2">
              {getTasksForDay(tasks, monthCellSelected.y, monthCellSelected.m, monthCellSelected.d).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <TaskCheckbox checked={t.completed} onToggle={() => handleToggle(t)} disabled={submitting} size="sm" ariaLabel={`${t.title} 완료 토글`} />
                  <span className={t.completed ? "line-through text-slate-500" : "text-slate-800"}>{t.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <TaskFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddFromModal}
        tasks={tasks}
        submitting={submitting}
        assigneeOptions={Array.from(
          new Set([
            "미지정",
            user?.displayName || user?.email?.split("@")[0] || "나",
            ...tasks.map((t) => t.assignee).filter(Boolean) as string[],
          ])
        )}
      />
      <button
        type="button"
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform md:hidden"
        aria-label="할 일 추가"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </button>
      <ConfirmModal
        open={deleteConfirmId != null}
        title="할 일 삭제"
        message={
          deleteConfirmSubCount > 0
            ? `이 목표를 삭제하면 하위 업무 ${deleteConfirmSubCount}개도 함께 삭제됩니다. 정말 삭제할까요?`
            : "정말 삭제할까요? 되돌릴 수 없습니다."
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />
      <TaskEditModal
        open={editingId != null}
        task={editingId ? tasks.find((x) => x.id === editingId) ?? null : null}
        onClose={() => setEditingId(null)}
        onSave={handleSaveEdit}
        submitting={submitting}
      />
    </main>
  );
}