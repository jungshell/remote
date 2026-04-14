'use client';

import { useEffect, useRef } from 'react';
import { getSettings } from '@/lib/settings';

const LAST_RUN_KEY = 'autoflow_daily_summary_last_run';

function getTodayYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 설정된 데일리 요약 시간(예: "18:30")과 현재 시각이 같은 분인지 */
function isSameMinute(now: Date, timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}

export default function DailySummaryScheduler() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function tick() {
      const settings = getSettings();
      const timeStr = settings.dailySummaryTime ?? '18:30';
      const now = new Date();
      if (!isSameMinute(now, timeStr)) return;

      const today = getTodayYYYYMMDD();
      try {
        const last = typeof window !== 'undefined' ? localStorage.getItem(LAST_RUN_KEY) : null;
        if (last === today) return;
        fetch('/api/automation/daily-summary', { method: 'POST' }).then((res) => {
          if (res.ok) localStorage.setItem(LAST_RUN_KEY, today);
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 60 * 1000); // every minute
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
