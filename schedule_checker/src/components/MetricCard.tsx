'use client';

import { useState, useRef, useEffect } from 'react';

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  /** 호버 또는 클릭 시 표시할 상세 내용 (없으면 툴팁 비표시) */
  detail?: string;
};

export default function MetricCard({
  label,
  value,
  description,
  detail,
}: MetricCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [pinned, setPinned] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinned) return;
    const close = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pinned]);

  const visible = detail && (showDetail || pinned);
  const hasDetail = Boolean(detail?.trim());

  return (
    <div
      ref={cardRef}
      className="relative rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none"
      onMouseEnter={() => hasDetail && setShowDetail(true)}
      onMouseLeave={() => !pinned && setShowDetail(false)}
    >
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold dark:text-zinc-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      {hasDetail && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPinned(!pinned); }}
          className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          aria-label="상세 보기"
          title="클릭하면 상세 내용 고정"
        >
          <span className="text-sm">ⓘ</span>
        </button>
      )}
      {visible && (
        <div
          className="absolute left-0 right-0 top-full z-10 mt-2 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm shadow-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          role="tooltip"
        >
          <p className="whitespace-pre-wrap font-medium text-zinc-800 dark:text-zinc-100">{detail}</p>
          {pinned && (
            <button
              type="button"
              onClick={() => setPinned(false)}
              className="mt-2 text-xs text-zinc-500 underline dark:text-zinc-400"
            >
              닫기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
