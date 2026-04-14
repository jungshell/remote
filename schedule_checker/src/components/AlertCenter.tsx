'use client';

import { useState } from 'react';

const DEFAULT_SHOW = 3;

type AlertCenterProps = {
  alerts: string[];
  quietHoursActive?: boolean;
  /** 처음 보여줄 알림 개수 (나머지는 더보기로) */
  maxVisible?: number;
};

export default function AlertCenter({
  alerts,
  quietHoursActive,
  maxVisible = DEFAULT_SHOW,
}: AlertCenterProps) {
  const [expanded, setExpanded] = useState(false);
  const showAll = expanded || alerts.length <= maxVisible;
  const visible = showAll ? alerts : alerts.slice(0, maxVisible);
  const restCount = alerts.length - maxVisible;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-zinc-100">🔔 알림 센터</h2>
        {alerts.length > 0 && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {alerts.length}건
          </span>
        )}
      </div>
      {quietHoursActive && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          🔕 방해 금지 시간입니다. 알림이 요약되어 표시됩니다.
        </p>
      )}
      <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-zinc-500 dark:text-zinc-400">알림이 없습니다.</p>
        ) : (
          visible.map((alert, index) => (
            <p
              key={index}
              className="line-clamp-2 rounded-2xl bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-700/50 dark:text-zinc-300"
              title={alert}
            >
              {alert}
            </p>
          ))
        )}
        {!showAll && restCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full rounded-2xl border border-dashed border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
          >
            + {restCount}건 더보기
          </button>
        )}
        {showAll && alerts.length > maxVisible && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full rounded-2xl px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400"
          >
            접기
          </button>
        )}
      </div>
    </div>
  );
}
