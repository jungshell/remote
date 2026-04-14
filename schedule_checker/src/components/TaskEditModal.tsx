"use client";

import { useState, useEffect } from "react";
import type { Task, TaskPriority } from "@/types/task";
import { dueDateTimeToInputValue } from "@/lib/task-utils";
import { TIME_SLOTS_30MIN, formatDateWithWeekday, normalizeTimeToSlot } from "@/lib/datetime-helpers";

interface TaskEditModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (payload: { title: string; description?: string; dueDate: string | null; priority: TaskPriority }) => Promise<void>;
  submitting?: boolean;
}

export function TaskEditModal({ open, task, onClose, onSave, submitting = false }: TaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDateTime, setDueDateTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const dueDate = dueDateTime ? dueDateTime.slice(0, 10) : "";
  const dueTime = dueDateTime ? normalizeTimeToSlot(dueDateTime.slice(11, 16)) : "08:00";

  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      const raw = dueDateTimeToInputValue(task.dueDate) || "";
      setDueDateTime(raw ? `${raw.slice(0, 10)}T${normalizeTimeToSlot(raw.slice(11, 16))}` : "");
      setPriority(task.priority ?? "medium");
    }
  }, [open, task]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const finalDate = dueDate || new Date().toISOString().slice(0, 10);
    const finalTime = normalizeTimeToSlot(dueTime || "08:00");
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? `${finalDate}T${finalTime}` : null,
      priority,
    });
    onClose();
  }

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold text-slate-800 mb-4">할 일 수정</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">할 일</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">기한(일시)</label>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDateTime(`${e.target.value}T${dueTime}`)}
                className="min-h-[48px] px-4 py-2.5 border border-slate-200 rounded-xl flex-1 min-w-0"
              />
              {dueDate && (
                <span className="text-sm text-slate-600 font-medium whitespace-nowrap">{formatDateWithWeekday(dueDate)}</span>
              )}
            </div>
            <select
              value={dueTime}
              onChange={(e) => setDueDateTime(`${dueDate || new Date().toISOString().slice(0, 10)}T${e.target.value}`)}
              className="mt-2 w-full min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl"
            >
              {TIME_SLOTS_30MIN.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">우선순위</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full min-h-[44px] px-4 py-2 border border-slate-200 rounded-xl"
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
              취소
            </button>
            <button type="submit" disabled={submitting || !title.trim()} className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "저장 중…" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
