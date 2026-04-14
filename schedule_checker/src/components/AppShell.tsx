'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { useAuth } from './AuthProvider';
import { signOut } from '@/lib/auth';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              AutoFlow
            </p>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              업무 자동화 대시보드
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                로그인
              </Link>
            )}
            <Link
              href="/settings"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              설정
            </Link>
          </div>
        </header>
        <main className="flex-1 px-6 pt-4 pb-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
