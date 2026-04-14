'use client';

import { useState, useRef, useEffect } from 'react';
import type { TaskStatus } from '@/types/models';

type PriorityItem = {
  taskId: string;
  title: string;
  assignee: string;
  due: string;
  status: string;
  statusValue?: TaskStatus;
  isDueToday?: boolean;
};

type PriorityListProps = {
  items: PriorityItem[];
  onTaskClick?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onQuickComplete?: (taskId: string) => void;
  allTasksHref?: string;
  /** 업무 페이지 전체 보기 모드: 링크 숨김, 선택 가능 */
  showAllView?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
};

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '할 일' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'done', label: '완료' },
];

export default function PriorityList({
  items,
  onTaskClick,
  onStatusChange,
  onQuickComplete,
  allTasksHref,
  showAllView,
  selectable,
  selectedIds = new Set(),
  onToggleSelect,
}: PriorityListProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openDropdownId]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
        <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-zinc-100">📌 오늘의 우선순위</h2>
        <div className="flex items-center gap-2">
          {allTasksHref && !showAllView && (
            <a
              href={allTasksHref}
              className="text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-zinc-100"
            >
              전체 보기
            </a>
          )}
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            스마트 우선순위 활성
          </span>
        </div>
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">업무가 없습니다</p>
        ) : (
          items.map((item) => (
            <div
              key={item.taskId}
              role={onTaskClick ? 'button' : undefined}
              tabIndex={onTaskClick ? 0 : undefined}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('[data-status-dropdown]') || target.closest('[data-quick-complete]') || target.closest('input[type="checkbox"]')) return;
                onTaskClick?.(item.taskId);
              }}
              onTouchStart={(e) => setSwipeStart(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (swipeStart === null) return;
                const end = e.changedTouches[0].clientX;
                if (end - swipeStart > 60 && onQuickComplete) onQuickComplete(item.taskId); // 스와이프 오른쪽 = 완료
                setSwipeStart(null);
              }}
              onKeyDown={(e) => {
                if (onTaskClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  if ((e.target as HTMLElement).closest('[data-status-dropdown]')) return;
                  onTaskClick(item.taskId);
                }
              }}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-100 p-4 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700/50 dark:focus:ring-zinc-500"
              aria-label={`${item.title} 업무 상세 보기`}
            >
              {selectable && onToggleSelect && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.taskId)}
                  onChange={(e) => { e.stopPropagation(); onToggleSelect(item.taskId); }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-zinc-300 shrink-0"
                  aria-label={`${item.title} 선택`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.assignee} · {item.due}
                  {item.isDueToday && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      오늘
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {onStatusChange && item.statusValue !== undefined && item.statusValue !== 'done' && (
                  <div className="relative" data-status-dropdown ref={openDropdownId === item.taskId ? dropdownRef : undefined}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === item.taskId ? null : item.taskId);
                      }}
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      {item.status} ▾
                    </button>
                    {openDropdownId === item.taskId && (
                      <div className="absolute right-0 top-full z-10 mt-1 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
                        {STATUS_OPTS.filter((o) => o.value !== item.statusValue).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(item.taskId, opt.value);
                              setOpenDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!item.statusValue || item.statusValue === 'done' ? (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {item.status}
                  </span>
                ) : onQuickComplete ? (
                  <button
                    type="button"
                    data-quick-complete
                    onClick={(e) => { e.stopPropagation(); onQuickComplete(item.taskId); }}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    title="빠른 완료"
                  >
                    ✓ 완료
                  </button>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
