"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithEmail, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Google 리다이렉트 로그인 후 돌아왔을 때 이미 로그인된 경우 업무 페이지로
  useEffect(() => {
    if (!loading && user) router.replace("/tasks");
  }, [loading, user, router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">로그인 상태 확인 중…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">AutoFlow</h1>
          <p className="text-slate-600 mt-1">업무·스케줄 관리</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "로그인 중..." : "이메일로 로그인"}
            </button>
          </form>
          <div className="my-6 text-center text-sm text-slate-400">또는</div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            Google로 로그인
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-indigo-600 hover:underline">처음으로</Link>
        </p>
      </div>
    </main>
  );
}