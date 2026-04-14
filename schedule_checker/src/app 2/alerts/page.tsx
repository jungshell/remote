"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAlerts, createAlert, toggleAlert, deleteAlert } from "@/lib/alerts";
import type { Alert, AlertInput } from "@/types/alert";

export default function AlertsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [list, setList] = useState<Alert[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const data = await fetchAlerts(user.uid);
        if (!cancelled) setList(data);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createAlert(user.uid, { title: title.trim(), body: body.trim() || undefined });
      setTitle("");
      setBody("");
      const data = await fetchAlerts(user.uid);
      setList(data);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(a: Alert) {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      await toggleAlert(a.id, user.uid, !a.done);
      setList((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (submitting) return;
    if (!confirm("삭제할까요?")) return;
    setSubmitting(true);
    try {
      await deleteAlert(id);
      setList((prev) => prev.filter((x) => x.id !== id));
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
        <div className="max-w-2xl mx-auto flex justify-between">
          <Link href="/tasks" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
            ← 업무
          </Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-800 mb-6">알림</h1>
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 *"
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            추가
          </button>
        </form>
        {loadingList ? (
          <p className="text-slate-500">목록 불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">알림이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(a)}
                  className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center"
                  aria-label={a.done ? "미완료" : "완료"}
                  style={{
                    borderColor: a.done ? "var(--indigo-600)" : "#cbd5e1",
                    backgroundColor: a.done ? "var(--indigo-600)" : "transparent",
                  }}
                >
                  {a.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-slate-800 ${a.done ? "line-through text-slate-500" : ""}`}>{a.title}</p>
                  {a.body && <p className="text-sm text-slate-500 mt-0.5">{a.body}</p>}
                </div>
                <button type="button" onClick={() => handleDelete(a.id)} disabled={submitting} className="p-1.5 text-slate-400 hover:text-red-600 rounded" aria-label="삭제">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
