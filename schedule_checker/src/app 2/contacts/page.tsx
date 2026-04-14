"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { fetchContacts, createContact, deleteContact } from "@/lib/contacts";
import type { Contact, ContactInput } from "@/types/contact";

export default function ContactsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [list, setList] = useState<Contact[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
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
        const data = await fetchContacts(user.uid);
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
      await createContact(user.uid, { name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, memo: memo.trim() || undefined });
      setName("");
      setEmail("");
      setPhone("");
      setMemo("");
      const data = await fetchContacts(user.uid);
      setList(data);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user || submitting) return;
    if (!confirm("이 연락처를 삭제할까요?")) return;
    setSubmitting(true);
    try {
      await deleteContact(id);
      setList((prev) => prev.filter((c) => c.id !== id));
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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/tasks" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
            ← 업무
          </Link>
          <span className="text-sm text-slate-500">{user.email}</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-800 mb-6">연락처</h1>
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 *"
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="전화"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            추가
          </button>
        </form>
        {loadingList ? (
          <p className="text-slate-500">목록 불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">연락처가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-start">
                <div>
                  <p className="font-medium text-slate-800">{c.name}</p>
                  {c.email && <p className="text-sm text-slate-500">{c.email}</p>}
                  {c.phone && <p className="text-sm text-slate-500">{c.phone}</p>}
                  {c.memo && <p className="text-sm text-slate-600 mt-1">{c.memo}</p>}
                </div>
                <button type="button" onClick={() => handleDelete(c.id)} disabled={submitting} className="p-1.5 text-slate-400 hover:text-red-600 rounded" aria-label="삭제">
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
