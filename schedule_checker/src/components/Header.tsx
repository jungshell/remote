'use client';

import Link from 'next/link';

type HeaderProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onAddTask?: () => void;
  showSettingsLink?: boolean;
};

export default function Header({
  title,
  subtitle,
  ctaLabel,
  onAddTask,
}: HeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white dark:bg-zinc-100 dark:text-zinc-900" aria-label="홈">
          ⚡️
        </Link>
        <div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          <h1 className="text-2xl font-semibold tracking-tight dark:text-zinc-100">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAddTask}
          className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {ctaLabel}
        </button>
      </div>
    </header>
  );
}
