'use client';

import Link from 'next/link';

type OverviewStripProps = {
  /** 미완료(할 일+진행 중) */
  pendingCount: number;
  /** 완료 */
  doneCount: number;
  /** 지연(마감 경과) */
  delayedCount: number;
  /** 오늘 마감인 미완료 건수 */
  dueTodayCount: number;
  /** 오늘/이번 주 집중 표시용 상위 업무 제목들 (최대 3개) */
  focusTitles?: string[];
  /** 첫 번째 포커스 업무 ID (클릭 시 이동) */
  focusTaskId?: string | null;
};

export default function OverviewStrip({
  pendingCount,
  doneCount,
  delayedCount,
  dueTodayCount,
  focusTitles = [],
  focusTaskId,
}: OverviewStripProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="font-medium text-zinc-500 dark:text-zinc-400">오늘 한눈에</span>
        <span>
          <strong className="text-zinc-900 dark:text-zinc-100">{pendingCount}</strong>
          <span className="text-zinc-500 dark:text-zinc-400"> 건 남음</span>
        </span>
        <span>
          <strong className="text-emerald-600 dark:text-emerald-400">{doneCount}</strong>
          <span className="text-zinc-500 dark:text-zinc-400"> 건 완료</span>
        </span>
        {delayedCount > 0 && (
          <span>
            <strong className="text-red-600 dark:text-red-400">{delayedCount}</strong>
            <span className="text-zinc-500 dark:text-zinc-400"> 건 지연</span>
          </span>
        )}
        {dueTodayCount > 0 && (
          <span>
            <strong className="text-amber-600 dark:text-amber-400">{dueTodayCount}</strong>
            <span className="text-zinc-500 dark:text-zinc-400"> 건 오늘 마감</span>
          </span>
        )}
      </div>
      {focusTitles.length > 0 && (
        <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
          지금 집중: {focusTitles.slice(0, 3).join(' · ')}
          {focusTaskId && (
            <>
              {' · '}
              <Link
                href={`/tasks/${focusTaskId}`}
                className="font-medium text-zinc-700 underline dark:text-zinc-300"
              >
                바로가기
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
