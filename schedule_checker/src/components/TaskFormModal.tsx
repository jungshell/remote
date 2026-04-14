"use client";

import { useState, useEffect, useRef } from "react";
import type { Task, TaskPriority } from "@/types/task";
import {
  TIME_SLOTS_30MIN,
  getDefaultDueDateTime,
  formatDateWithWeekday,
  normalizeTimeToSlot,
} from "@/lib/datetime-helpers";

export interface TaskFormValues {
  title: string;
  dueDateTime: string;
  description: string;
  location: string;
  attendees: string;
  assignee: string;
  priority: TaskPriority;
  isGoal: boolean;
  parentTaskId: string | null;
}

const defaultValues: TaskFormValues = {
  title: "",
  dueDateTime: "",
  description: "",
  location: "",
  attendees: "",
  assignee: "",
  priority: "medium",
  isGoal: false,
  parentTaskId: null,
};

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  tasks: Task[];
  submitting?: boolean;
  /** 담당자 선택 옵션 (예: ["미지정", "나", "홍길동"]) */
  assigneeOptions?: string[];
}

export function TaskFormModal({ open, onClose, onSubmit, tasks, submitting = false, assigneeOptions = ["미지정"] }: TaskFormModalProps) {
  const [values, setValues] = useState<TaskFormValues>({ ...defaultValues, dueDateTime: getDefaultDueDateTime(), assignee: assigneeOptions[0] ?? "" });
  const [errors, setErrors] = useState<{ title?: string; dueDateTime?: string }>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  const dueDate = values.dueDateTime ? values.dueDateTime.slice(0, 10) : "";
  const rawTime = values.dueDateTime ? values.dueDateTime.slice(11, 16) : "08:00";
  const dueTime = normalizeTimeToSlot(rawTime);

  useEffect(() => {
    if (open) {
      setValues((v) => ({
        ...v,
        ...defaultValues,
        dueDateTime: getDefaultDueDateTime(),
        assignee: assigneeOptions[0] ?? "",
      }));
      setErrors({});
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, assigneeOptions]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  function setDueDate(dateStr: string) {
    const time = dueTime || "08:00";
    setValues((v) => ({ ...v, dueDateTime: `${dateStr}T${time}` }));
  }

  function setDueTime(timeStr: string) {
    const date = dueDate || new Date().toISOString().slice(0, 10);
    setValues((v) => ({ ...v, dueDateTime: `${date}T${timeStr}` }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: { title?: string; dueDateTime?: string } = {};
    if (!values.title.trim()) nextErrors.title = "할 일을 입력해 주세요.";
    const finalDate = dueDate || new Date().toISOString().slice(0, 10);
    const finalTime = normalizeTimeToSlot(dueTime || "08:00");
    if (!dueDate) nextErrors.dueDateTime = "기한(일시)을 선택해 주세요.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSubmit({ ...values, dueDateTime: `${finalDate}T${finalTime}` });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-modal-in max-h-[90vh] overflow-y-auto"
      >
        <h2 id="task-form-title" className="text-lg font-semibold text-slate-800 mb-4">
          할 일 추가
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 mb-1">
              할 일 <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="task-title"
              type="text"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="할 일을 입력하세요"
              className="w-full min-h-[48px] px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              aria-required
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              기한(일시) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex-1 min-w-[140px] flex items-center gap-2">
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="min-h-[48px] px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex-1 min-w-0"
                  aria-required
                  aria-invalid={!!errors.dueDateTime}
                />
                {dueDate && (
                  <span className="text-sm text-slate-600 font-medium whitespace-nowrap" aria-hidden>
                    {formatDateWithWeekday(dueDate)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-[140px]">
                <label htmlFor="task-due-time" className="block text-xs text-slate-500 mb-0.5">시간 (오전 8시~오후 8시, 30분 단위)</label>
                <select
                  id="task-due-time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  aria-required
                  title="오전 8시부터 오후 8시 순으로 선택"
                >
                  {TIME_SLOTS_30MIN.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.dueDateTime && <p className="mt-1 text-sm text-red-600">{errors.dueDateTime}</p>}
          </div>

          <div>
            <label htmlFor="task-assignee" className="block text-sm font-medium text-slate-600 mb-1">담당자 (선택)</label>
            <select
              id="task-assignee"
              value={values.assignee}
              onChange={(e) => setValues((v) => ({ ...v, assignee: e.target.value }))}
              className="w-full min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              {assigneeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-location" className="block text-sm font-medium text-slate-600 mb-1">장소 (선택)</label>
            <input
              id="task-location"
              type="text"
              value={values.location}
              onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
              placeholder="장소"
              className="w-full min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="task-attendees" className="block text-sm font-medium text-slate-600 mb-1">참석 (선택)</label>
            <input
              id="task-attendees"
              type="text"
              value={values.attendees}
              onChange={(e) => setValues((v) => ({ ...v, attendees: e.target.value }))}
              placeholder="쉼표로 구분하여 입력"
              className="w-full min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div>
            <label htmlFor="task-desc" className="block text-sm font-medium text-slate-600 mb-1">설명 (선택)</label>
            <textarea
              id="task-desc"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="설명"
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-600 mb-1">우선순위</label>
              <select
                id="task-priority"
                value={values.priority}
                onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value as TaskPriority }))}
                className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-8">
              <input
                id="task-goal"
                type="checkbox"
                checked={values.isGoal}
                onChange={(e) =>
                  setValues((v) => ({ ...v, isGoal: e.target.checked, parentTaskId: e.target.checked ? null : v.parentTaskId }))
                }
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="task-goal" className="text-sm text-slate-600">목표로 추가</label>
            </div>
          </div>
          {!values.isGoal && tasks.some((t) => t.isGoal) && (
            <div>
              <label htmlFor="task-parent" className="block text-sm font-medium text-slate-600 mb-1">상위 목표 (선택)</label>
              <select
                id="task-parent"
                value={values.parentTaskId ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, parentTaskId: e.target.value || null }))}
                className="w-full min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">단독 할 일</option>
                {tasks.filter((t) => t.isGoal).map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.98] transition-all"
            >
              {submitting ? "저장 중…" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
