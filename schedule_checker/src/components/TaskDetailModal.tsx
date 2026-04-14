'use client';

import { useEffect } from 'react';
import type { Task } from '@/types/models';
import { formatDate } from '@/lib/utils';

type TaskDetailModalProps = {
  task: Task | null;
  assigneeName?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  todo: '할 일',
  in_progress: '진행 중',
  done: '완료',
  blocked: '보류',
};
const PRIORITY_LABEL: Record<string, string> = {
  low: '낮음',
  medium: '중간',
  high: '높음',
  urgent: '긴급',
};

export default function TaskDetailModal({
  task,
  assigneeName,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  useEffect(() => {
    if (!task) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [task, onClose]);

  if (!task) return null;

  const receivedAtStr = task.receivedAt
    ? formatDate(task.receivedAt)
    : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-lg dark:bg-zinc-800 dark:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="task-detail-title" className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          업무 상세
        </h2>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">제목</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</dd>
          </div>
          {task.description && (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">설명</dt>
              <dd className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{task.description}</dd>
            </div>
          )}
          {task.assigner && (
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">지시자</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{task.assigner}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">업무접수일</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{receivedAtStr}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">마감일</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{formatDate(task.dueAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">담당자</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{assigneeName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">우선순위</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{PRIORITY_LABEL[task.priority] ?? task.priority}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">상태</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{STATUS_LABEL[task.status] ?? task.status}</dd>
          </div>
        </dl>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-zinc-200 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-full border border-black bg-white py-2 text-sm font-semibold text-black hover:bg-zinc-50 dark:border-zinc-400 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          >
            수정
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
