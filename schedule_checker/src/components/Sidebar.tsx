'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: '대시보드', icon: '📊', href: '/' },
  { label: '업무', icon: '✓', href: '/tasks' },
  { label: '캘린더', icon: '📅', href: '/calendar' },
  { label: 'Meeting', icon: '💬', href: '/meeting' },
  { label: 'PDF Reader', icon: '📄', href: '/pdf-reader' },
  { label: 'Emoji Tone', icon: '😊', href: '/emoji-tone' },
  { label: '설정', icon: '⚙', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const expanded = isPinned || isHovered;

  const handleAsideClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return;
    if (expanded) setIsPinned((p) => !p);
  }, [expanded]);

  const labelClass = !expanded
    ? 'max-w-0 translate-x-[-4px] opacity-0 overflow-hidden whitespace-nowrap'
    : 'max-w-none opacity-100';

  return (
    <aside
      role="navigation"
      aria-label="메인 메뉴"
      onClick={handleAsideClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex h-screen flex-col gap-6 border-r border-zinc-200/70 bg-white/80 py-6 dark:border-zinc-700 dark:bg-zinc-900/80 backdrop-blur transition-all duration-200 ${
        expanded ? 'w-52 px-4' : 'w-16 px-2'
      }`}
    >
      <div
        className={`rounded-2xl bg-zinc-50 py-3 dark:bg-zinc-800 ${expanded ? 'px-3' : 'px-2'}`}
      >
        <div
          className={`flex items-center gap-3 ${!expanded ? 'flex-col justify-center' : 'justify-between'}`}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
            ⚡
          </div>
          <div className={`transition-all duration-200 ${labelClass}`}>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AutoFlow</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">업무 자동화 허브</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 ${
                isActive
                  ? 'bg-zinc-900/10 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center text-base"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className={`transition-all duration-200 ${labelClass}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
