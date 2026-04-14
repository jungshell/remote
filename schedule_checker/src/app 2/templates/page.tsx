"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTemplates, createTemplate, deleteTemplate } from "@/lib/templates";
import type { Template, TemplateInput } from "@/types/template";

export default function TemplatesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [list, setList] = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [name, setName] = useState("");
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
        const data = await fetchTemplates(user.uid);
        if (!cancelled) setList(data);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createTemplate(user.uid, { name: name.trim(), body: body.trim() });
      setName("");
      setBody("");
      const data = await fetchTemplates(user.uid);
      setList(data);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (submitting) return;
    if (!confirm("삭제할까요?")) return;
    setSubmitting(true);
    try {
      await deleteTemplate(id);
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
        <h1 className="text-xl font-bold text-slate-800 mb-6">템플릿</h1>
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="템플릿 이름 *"
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용"
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            추가
          </button>
        </form>
        {loadingList ? (
          <p className="text-slate-500">목록 불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">템플릿이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{t.name}</p>
                  <pre className="text-sm text-slate-600 mt-1 whitespace-pre-wrap font-sans">{t.body}</pre>
                </div>
                <button type="button" onClick={() => handleDelete(t.id)} disabled={submitting} className="p-1.5 text-slate-400 hover:text-red-600 rounded shrink-0" aria-label="삭제">
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
