'use client';

import { useEffect, useRef } from 'react';
import { getSettings, type TemplateSchedule } from '@/lib/settings';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/apiClient';

const DAY_TO_NUM: Record<TemplateSchedule['day'], number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const LAST_RUN_PREFIX = 'autoflow_template_run_';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameMinute(now: Date, timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}

export default function TemplateScheduler() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function tick() {
      const settings = getSettings();
      const schedules = settings.templateSchedules;
      if (!schedules?.length) return;
      const ownerId = user?.uid ?? 'user1';
      const now = new Date();
      const todayKey = getTodayKey();
      const currentDay = now.getDay();

      schedules.forEach((s) => {
        if (DAY_TO_NUM[s.day] !== currentDay) return;
        if (!isSameMinute(now, s.time)) return;
        const runKey = `${LAST_RUN_PREFIX}${s.templateId}_${s.day}_${s.time}`;
        try {
          if (localStorage.getItem(runKey) === todayKey) return;
          authFetch('/api/templates')
            .then((r) => (r.ok ? r.json() : []))
            .then((templates: { id: string; name: string; checklist?: string[] }[]) => {
              const t = templates.find((x) => x.id === s.templateId);
              if (!t) return;
              const description = t.checklist?.length ? t.checklist.map((c, i) => `${i + 1}. ${c}`).join('\n') : undefined;
              return authFetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: t.name,
                  description,
                  status: 'todo',
                  priority: 'medium',
                  ownerId,
                }),
              });
            })
            .then((res) => {
              if (res?.ok) localStorage.setItem(runKey, todayKey);
            })
            .catch(() => {});
        } catch {
          // ignore
        }
      });
    }

    tick();
    intervalRef.current = setInterval(tick, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.uid]);

  return null;
}
