"use client";

import Link from "next/link";

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-indigo-600 hover:underline text-sm font-medium mb-6 inline-block">
          ← 업무 관리로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">개발 현황</h1>
        <section className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <h2 className="text-sm font-semibold text-emerald-800 mb-2">구현된 기능 (메뉴에 노출)</h2>
          <ul className="text-sm text-emerald-900 space-y-1 list-disc list-inside">
            <li>Firebase Auth 로그인 (이메일·Google) + 세션 유지</li>
            <li>업무 CRUD, 목록/주간/월간 뷰, 목표·하위 업무</li>
            <li>설정: 매일 9시 업무 보고서 이메일 on/off</li>
            <li>실제 사용 경로: / → /login → /tasks, /settings</li>
          </ul>
        </section>
        <section className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">예정 (준비 중)</h2>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
            <li>연락처·알림·템플릿</li>
            <li>Google Calendar 연동</li>
            <li>매일 자동 요약 Cron</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
