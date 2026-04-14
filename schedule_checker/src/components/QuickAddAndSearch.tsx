'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Task } from '@/types/models';
import type { Contact } from '@/types/models';

type QuickAddAndSearchProps = {
  tasks: Task[];
  contacts: Contact[];
  ownerId: string;
  onQuickAdd: (title: string) => Promise<void>;
  onTaskSelect: (taskId: string) => void;
  /** ref forwarded for keyboard shortcut / focus */
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export default function QuickAddAndSearch({
  tasks,
  contacts,
  ownerId,
  onQuickAdd,
  onTaskSelect,
  inputRef: externalRef,
}: QuickAddAndSearchProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const query = value.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query || query.length < 1) return { tasks: [] as Task[], contacts: [] as Contact[] };
    const taskMatches = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.assigner?.toLowerCase().includes(query)
    );
    const contactMatches = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
    return { tasks: taskMatches.slice(0, 6), contacts: contactMatches.slice(0, 3) };
  }, [tasks, contacts, query]);

  const hasResults = results.tasks.length > 0 || results.contacts.length > 0;
  const showDropdown = open && (query.length > 0);

  useEffect(() => {
    if (!showDropdown) return;
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        setSubmitting(true);
        onQuickAdd(value.trim())
          .then(() => setValue(''))
          .finally(() => setSubmitting(false));
      }
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="검색 또는 새 업무 제목 입력 후 Enter"
        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        aria-label="검색 및 퀵 추가"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
          {hasResults ? (
            <>
              {results.tasks.length > 0 && (
                <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
                  <p className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">업무</p>
                  {results.tasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onTaskSelect(t.id);
                        setValue('');
                        setOpen(false);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
              {results.contacts.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">연락처</p>
                  {results.contacts.map((c) => (
                    <Link
                      key={c.id}
                      href="/contacts"
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {c.name}
                      {c.company ? ` · ${c.company}` : ''}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Enter로 &quot;{value.trim()}&quot; 업무 바로 추가
            </p>
          )}
        </div>
      )}
      {submitting && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400">추가 중...</span>
      )}
    </div>
  );
}
