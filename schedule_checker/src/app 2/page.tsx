"use client";

import { useState } from "react";
import Link from "next/link";

type FileItem = {
  path: string;
  description: string;
  content: string;
  language: string;
};

const FILES: FileItem[] = [
  {
    path: "package.json",
    description: "프로젝트 이름, 스크립트, 의존성 (Next.js, Firebase, React 등)",
    language: "json",
    content: `{
  "name": "schedule_checker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "npx next dev -p 4000",
    "build": "next build",
    "start": "next start -p 4000"
  },
  "dependencies": {
    "firebase": "^12.8.0",
    "firebase-admin": "^13.0.0",
    "next": "16.1.4",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  }
}`,
  },
  {
    path: "firestore.rules",
    description: "Firestore 보안 규칙 (tasks, contacts, alerts, templates, work_logs, calendar_tokens)",
    language: "javascript",
    content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null
        && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /contacts/{id} { allow read, write: if request.auth != null; }
    match /alerts/{id} { allow read, write: if request.auth != null; }
    match /templates/{id} { allow read, write: if request.auth != null; }
    match /work_logs/{id} { allow read, write: if request.auth != null
      && (resource == null || resource.data.ownerId == request.auth.uid); }
    match /calendar_tokens/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`,
  },
  {
    path: "vercel.json",
    description: "Vercel 배포 설정 · 매일 0시에 daily-summary API 호출 크론",
    language: "json",
    content: `{
  "crons": [{ "path": "/api/automation/daily-summary", "schedule": "0 0 * * *" }]
}`,
  },
  {
    path: "firebase.json",
    description: "Firebase 프로젝트 설정 (Firestore 규칙 파일 경로)",
    language: "json",
    content: `{ "firestore": { "rules": "firestore.rules" } }`,
  },
  {
    path: ".env.example",
    description: "환경 변수 예시 (Firebase Admin 서비스 계정)",
    language: "env",
    content: `# FIREBASE_PROJECT_ID=...
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----...",
`,
  },
  {
    path: "tsconfig.json",
    description: "TypeScript 설정 · 경로 별칭 @/* → ./src/*",
    language: "json",
    content: `{
  "compilerOptions": {
    "target": "ES2017",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,
  },
];

function FileBlock({ item, open, onToggle, index }: { item: FileItem; open: boolean; onToggle: () => void; index: number }) {
  return (
    <div
      className={`opacity-0 animate-fade-in-up rounded-xl border border-slate-200/80 bg-white shadow-sm
        transition-all duration-300 ease-out
        hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/50
        ${open ? "ring-2 ring-indigo-500/20 border-indigo-200 shadow-md" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 group transition-colors rounded-xl"
      >
        <span className="font-mono text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
          {item.path}
        </span>
        <span
          className={`
            shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50
            transition-all duration-200
            ${open ? "rotate-180 bg-indigo-50 text-indigo-600" : ""}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <p className="px-5 pb-3 text-sm text-slate-500 leading-relaxed">{item.description}</p>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out overflow-hidden"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0">
          <pre className="px-5 pb-5 text-xs bg-slate-900 text-slate-100 overflow-x-auto rounded-b-xl py-4 mx-2 mb-2 font-mono leading-relaxed animate-expand">
            <code>{item.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [openPath, setOpenPath] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight mb-2">
            AutoFlow <span className="text-indigo-600">/</span> 스케줄 체커
          </h1>
          <p className="text-slate-600 leading-relaxed">
            지금까지 개발된 내용을 확인할 수 있습니다. 아래 파일을 클릭하면 내용이 펼쳐집니다.
          </p>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            업무 관리로 이동
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </header>

        <section
          className="mb-10 p-5 sm:p-6 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/80 rounded-2xl shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="text-sm font-semibold text-indigo-800 mb-3 tracking-wide">앱 개요</h2>
          <ul className="text-sm text-slate-700 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              업무·스케줄 관리 (tasks, work_logs)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              연락처·알림·템플릿 (contacts, alerts, templates)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Google Calendar 연동 (calendar_tokens)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              매일 자동 요약 (Cron → /api/automation/daily-summary)
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            개발된 설정 · 규칙 파일
          </h2>
          <div className="space-y-3">
            {FILES.map((item, i) => (
              <FileBlock
                key={item.path}
                item={item}
                open={openPath === item.path}
                onToggle={() => setOpenPath((p) => (p === item.path ? null : item.path))}
                index={i}
              />
            ))}
          </div>
        </section>

        <section
          className="p-5 sm:p-6 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl shadow-sm opacity-0 animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <h2 className="text-sm font-semibold text-emerald-800 mb-3 tracking-wide">구현된 기능 (Phase 1–3)</h2>
          <ul className="text-sm text-emerald-900 space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Firebase Auth 로그인 (이메일·Google) + 업무 CRUD
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API: /api/automation/daily-summary, Google Calendar 연동
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              연락처·알림·템플릿 목록/추가/삭제
            </li>
          </ul>
          <p className="mt-4 text-xs text-emerald-700/90">
            비판적 평가는 <code className="bg-emerald-200/50 px-1 rounded">docs/비판적_평가_업무적합도.md</code> 참고.
          </p>
        </section>
      </div>
    </main>
  );
}
