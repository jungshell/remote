'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export type ContactTaskItem = {
  id: string;
  title: string;
};

export type ContactItem = {
  id: string;
  name: string;
  label: string;
  taskCount: number;
  tasks: ContactTaskItem[];
};

type ContactsSectionProps = {
  contacts: ContactItem[];
};

export default function ContactsSection({ contacts }: ContactsSectionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const closePopover = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setActiveId(null), 150);
  };

  const cancelClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-zinc-100">👥 연락처 기반 업무</h2>
        <div className="flex gap-3">
          <Link
            href="/contacts"
            className="text-xs font-semibold text-zinc-500 hover:underline dark:text-zinc-400"
          >
            연락처 관리
          </Link>
          <Link
            href="/tasks"
            className="text-xs font-semibold text-zinc-500 hover:underline dark:text-zinc-400"
          >
            전체 보기
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        담당자별 업무 수. 호버 또는 클릭 시 해당 인원의 업무 목록을 볼 수 있습니다.
      </p>
      {/* 컴팩트 테이블형: 한 줄에 이름·소속·건수, 클릭/호버 시 업무 목록 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="relative"
            onMouseEnter={() => { cancelClose(); setActiveId(contact.id); }}
            onMouseLeave={closePopover}
          >
            <button
              type="button"
              onClick={() => setActiveId(activeId === contact.id ? null : contact.id)}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-left transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700/50 dark:hover:bg-zinc-700"
            >
              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {contact.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {contact.label}
              </span>
              <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-600 dark:text-zinc-300">
                {contact.taskCount}건
              </span>
            </button>
            {activeId === contact.id && contact.tasks.length > 0 && (
              <div
                ref={popoverRef}
                className="absolute left-0 top-full z-20 mt-1 max-h-64 w-72 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
                onMouseEnter={cancelClose}
                onMouseLeave={closePopover}
              >
                <p className="border-b border-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  {contact.name} · 업무 {contact.taskCount}건
                </p>
                <ul className="p-2">
                  {contact.tasks.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tasks/${t.id}`}
                        className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        onClick={() => setActiveId(null)}
                      >
                        {t.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
