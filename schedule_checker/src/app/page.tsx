'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useTasks } from '@/hooks/useTasks';
import { authFetch } from '@/lib/apiClient';
import { calculatePriority } from '@/lib/taskUtils';

export default function Home() {
  const router = useRouter();
  const { tasks, loading: tasksLoading } = useTasks();
  const [meetingCount, setMeetingCount] = useState<number | null>(null);
  const [pdfCount, setPdfCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    authFetch('/api/search?mode=meeting')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => {
        if (active) setMeetingCount(Array.isArray(payload.data) ? payload.data.length : 0);
      })
      .catch(() => { if (active) setMeetingCount(0); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    authFetch('/api/search?source=pdf')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => {
        if (active) setPdfCount(Array.isArray(payload.data) ? payload.data.length : 0);
      })
      .catch(() => { if (active) setPdfCount(0); });
    return () => { active = false; };
  }, []);

  const taskSummary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const now = new Date();
    const delayed = tasks.filter((t) => {
      if (t.status === 'done') return false;
      const due = t.dueAt ? new Date(t.dueAt) : null;
      return due && due < now;
    }).length;
    const pending = tasks.filter((t) => t.status !== 'done' && t.status !== 'blocked');
    const sorted = [...pending]
      .map((t) => ({ ...t, calculatedPriority: calculatePriority(t) }))
      .sort((a, b) => {
        const order = { urgent: 4, high: 3, medium: 2, low: 1 };
        const ap = order[a.calculatedPriority] ?? 0;
        const bp = order[b.calculatedPriority] ?? 0;
        if (ap !== bp) return bp - ap;
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        return aDue - bDue;
      });
    const top3 = sorted.slice(0, 3).map((t) => t.title);
    return { total, completionRate: rate, delayedCount: delayed, top3 };
  }, [tasks]);

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  const cardClass =
    'block rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 space-y-4">
      <Header
        title="흩어진 업무를 한곳에서 자동 정리"
        subtitle="AutoFlow"
        ctaLabel="+ 새 업무"
        onAddTask={() => router.push('/tasks')}
        showSettingsLink={true}
      />

      <main className="mx-auto w-full max-w-6xl space-y-4 px-6 pb-8">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          원하는 영역을 선택하세요.
        </p>
        <section className="grid grid-cols-2 gap-6">
          {/* 업무 */}
          <Link href="/tasks" className={cardClass}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              업무
            </h2>
            <p className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {taskSummary.completionRate}% 완료 · 지연 {taskSummary.delayedCount}건 · 총 {taskSummary.total}건
            </p>
            {taskSummary.top3.length > 0 ? (
              <p className="mb-4 truncate text-sm text-zinc-600 dark:text-zinc-400">
                지금 할 일: {taskSummary.top3.join(' · ')}
              </p>
            ) : (
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">등록된 업무가 없습니다.</p>
            )}
            <span className="inline-flex items-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              업무 보기 →
            </span>
          </Link>

          {/* 미팅 */}
          <Link href="/meeting" className={cardClass}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              미팅
            </h2>
            <p className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {meetingCount === null ? '—' : meetingCount}건 회의 기록
            </p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {meetingCount === null ? '불러오는 중…' : meetingCount === 0 ? '아직 기록이 없습니다.' : '회의록 요약·결정·액션 아이템 확인'}
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Meeting 보기 →
            </span>
          </Link>

          {/* PDF 리더 */}
          <Link href="/pdf-reader" className={cardClass}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              PDF 리더
            </h2>
            <p className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {pdfCount === null ? '—' : pdfCount}건 기록
            </p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {pdfCount === null ? '불러오는 중…' : pdfCount === 0 ? 'PDF 읽기 기록이 없습니다.' : 'PDF 읽기 기록 보기'}
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              PDF Reader 보기 →
            </span>
          </Link>

          {/* 이모지 톤 */}
          <Link href="/emoji-tone" className={cardClass}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              이모지 톤
            </h2>
            <p className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              문장 톤 변환
            </p>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              문장에 맞는 톤과 이모지 제안
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Emoji Tone 보기 →
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}
