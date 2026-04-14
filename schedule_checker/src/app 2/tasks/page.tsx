"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTasks, createTask, updateTask, deleteTask } from "@/lib/tasks";
import { getFirebaseAuth } from "@/lib/firebase";
import type { Task } from "@/types/task";

type CalendarEvent = { id: string; summary: string; start?: string; end?: string };

function formatDate(ts: Task["createdAt"]) {
  if (!ts) return "";
  const s = "seconds" in ts ? ts.seconds : 0;
  const d = new Date(s * 1000);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TasksPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const searchParams = useSearchParams();

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

  useEffect(() => {
    if (!user) return;
    const q = searchParams.get("calendar");
    if (q === "connected") window.history.replaceState({}, "", "/tasks");
    (async () => {
      setCalendarLoading(true);
      try {
        const auth = getFirebaseAuth();
        const token = await auth?.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/calendar/events", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.events) setCalendarEvents(data.events);
      } catch {
        setCalendarEvents([]);
      } finally {
        setCalendarLoading(false);
      }
    })();
  }, [user, searchParams]);

  async function handleConnectCalendar() {
    const auth = getFirebaseAuth();
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    setCalendarConnecting(true);
    try {
      const res = await fetch("/api/calendar/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCalendarConnecting(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createTask(user.uid, { title: newTitle.trim(), description: newDesc.trim() || undefined });
      setNewTitle("");
      setNewDesc("");
      const list = await fetchTasks(user.uid);
      setTasks(list);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(task: Task) {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      await updateTask(task.id, user.uid, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartEdit(t: Task) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDesc(t.description ?? "");
  }

  async function handleSaveEdit() {
    if (!user || !editingId || submitting) return;
    setSubmitting(true);
    try {
      await updateTask(editingId, user.uid, { title: editTitle.trim(), description: editDesc.trim() || undefined });
      setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, title: editTitle.trim(), description: editDesc.trim() || undefined } : t)));
      setEditingId(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!user || submitting) return;
    if (!confirm("이 업무를 삭제할까요?")) return;
    setSubmitting(true);
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              ← 현황
            </Link>
            <Link href="/contacts" className="text-slate-600 hover:text-indigo-600 text-sm font-medium">
              연락처
            </Link>
            <Link href="/alerts" className="text-slate-600 hover:text-indigo-600 text-sm font-medium">
              알림
            </Link>
            <Link href="/templates" className="text-slate-600 hover:text-indigo-600 text-sm font-medium">
              템플릿
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 truncate max-w-[120px]">{user.email}</span>
            <button
              type="button"
              onClick={() => signOut().then(() => router.push("/login"))}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-800 mb-6">업무 목록</h1>

        <section className="mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Google Calendar</h2>
          <button
            type="button"
            onClick={handleConnectCalendar}
            disabled={calendarConnecting}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {calendarConnecting ? "연결 중..." : "캘린더 연동"}
          </button>
          {calendarLoading ? (
            <p className="text-sm text-slate-500 mt-3">이벤트 불러오는 중...</p>
          ) : calendarEvents.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              {calendarEvents.slice(0, 5).map((e) => (
                <li key={e.id}>
                  {e.summary} — {e.start ? new Date(e.start).toLocaleString("ko-KR") : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 mt-3">연동 후 이번 주 일정이 표시됩니다.</p>
          )}
        </section>

        <form onSubmit={handleAdd} className="mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="새 업무 제목"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="설명 (선택)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "추가 중..." : "추가"}
          </button>
        </form>

        {tasksLoading ? (
          <p className="text-slate-500">목록 불러오는 중...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500 py-8">등록된 업무가 없습니다. 위에서 추가해 보세요.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(t)}
                  className="shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  aria-label={t.completed ? "미완료로 표시" : "완료로 표시"}
                  style={{
                    borderColor: t.completed ? "var(--indigo-600)" : "#cbd5e1",
                    backgroundColor: t.completed ? "var(--indigo-600)" : "transparent",
                  }}
                >
                  {t.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  {editingId === t.id ? (
                    <>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2 py-1 border rounded mb-1 text-slate-800"
                      />
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="설명"
                        className="w-full px-2 py-1 border rounded text-sm text-slate-600"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={submitting}
                          className="text-sm px-2 py-1 bg-indigo-600 text-white rounded"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-sm px-2 py-1 border rounded text-slate-600"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={`font-medium text-slate-800 ${t.completed ? "line-through text-slate-500" : ""}`}>
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{formatDate(t.createdAt)}</p>
                    </>
                  )}
                </div>
                {editingId !== t.id && (
                  <div className="shrink-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                      aria-label="수정"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      aria-label="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
