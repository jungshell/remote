'use client';

import { useEffect, useState, type FormEvent } from "react";
import type { Task, TaskPriority, TaskStatus } from "@/types/models";
import { getTaskDefaults, setTaskDefaults } from "@/lib/taskDefaults";
import { authFetch } from "@/lib/apiClient";

// 마감일 시간: 09시~18시만 선택 가능
const HOURS_9_TO_18 = Array.from({ length: 10 }, (_, i) => (i + 9).toString().padStart(2, "0"));
const MINUTES_30 = ["00", "30"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type NewTaskModalProps = {
  open: boolean;
  contacts: { id: string; name: string; company?: string }[];
  onClose: () => void;
  onCreated: () => void;
  /** 수정 모드: 넣으면 해당 업무로 폼을 채우고 PATCH로 저장 */
  initialTask?: Task | null;
  onUpdated?: () => void;
  /** 로그인한 사용자 ID (없으면 'user1') */
  ownerId?: string;
  /** 템플릿으로 생성 시 미리 채울 제목 */
  initialTitle?: string;
  /** 템플릿으로 생성 시 미리 채울 설명(체크리스트 등) */
  initialDescription?: string;
  /** 초기 마감일 설정 (캘린더에서 날짜 선택 시) */
  initialDueDate?: string;
};

export default function NewTaskModal({
  open,
  contacts,
  onClose,
  onCreated,
  initialTask,
  onUpdated,
  ownerId = "user1",
  initialTitle: initialTitleProp,
  initialDescription: initialDescriptionProp,
  initialDueDate: initialDueDateProp,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueHour, setDueHour] = useState("18");
  const [dueMinute, setDueMinute] = useState("00");
  const [assigner, setAssigner] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(initialTask?.id);

  // 모달 열릴 때: 수정 모드면 initialTask로 폼 채움, 템플릿이면 initialTitle/initialDescription, 아니면 초기화
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDueDate("");
      setDueHour("18");
      setDueMinute("00");
      setAssigner("");
      setReceivedAt("");
      setAssigneeId("");
      setPriority("medium");
      setStatus("todo");
      setError(null);
      setSubmitting(false);
      return;
    }
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description ?? "");
      setAssigner(initialTask.assigner ?? "");
      setAssigneeId(initialTask.assigneeId ?? "");
      setPriority(initialTask.priority);
      setStatus(initialTask.status);
      setReceivedAt(initialTask.receivedAt ? initialTask.receivedAt.slice(0, 10) : "");
      if (initialTask.dueAt) {
        const d = new Date(initialTask.dueAt);
        setDueDate(d.toISOString().slice(0, 10));
        const h = d.getHours();
        const m = d.getMinutes();
        setDueHour(h >= 9 && h <= 18 ? h.toString().padStart(2, "0") : "18");
        setDueMinute(m <= 15 ? "00" : "30");
      } else {
        setDueDate("");
        setDueHour("18");
        setDueMinute("00");
      }
    } else if (initialTitleProp || initialDescriptionProp) {
      setTitle(initialTitleProp ?? "");
      setDescription(initialDescriptionProp ?? "");
    }
    // 초기 마감일 설정 (캘린더에서 날짜 선택 시)
    if (initialDueDateProp && !initialTask && open) {
      const date = new Date(initialDueDateProp);
      setDueDate(date.toISOString().slice(0, 10));
      const h = date.getHours();
      const m = date.getMinutes();
      setDueHour(h >= 9 && h <= 18 ? h.toString().padStart(2, "0") : "18");
      setDueMinute(m <= 15 ? "00" : m <= 45 ? "30" : "00");
    }
    if (!initialTask && open) {
      const defaults = getTaskDefaults();
      if (defaults.assigner !== undefined) setAssigner(defaults.assigner);
      if (defaults.assigneeId !== undefined) setAssigneeId(defaults.assigneeId);
    }
  }, [open, initialTask, initialTitleProp, initialDescriptionProp, initialDueDateProp]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: {
        title: string;
        description?: string;
        status: "todo";
        priority: TaskPriority;
        dueAt?: string;
        ownerId: string;
        assigneeId?: string;
        assigner?: string;
        receivedAt?: string;
      } = {
        title: title.trim(),
        status: "todo",
        priority,
        ownerId,
      };

      if (description.trim()) payload.description = description.trim();
      if (dueDate && dueHour !== "" && dueMinute !== "") {
        payload.dueAt = new Date(`${dueDate}T${dueHour}:${dueMinute}:00`).toISOString();
      }
      if (assigneeId) payload.assigneeId = assigneeId;
      if (assigner.trim()) payload.assigner = assigner.trim();
      if (receivedAt) payload.receivedAt = new Date(receivedAt).toISOString();

      const url = isEdit ? `/api/tasks/${initialTask!.id}` : "/api/tasks";
      const method = isEdit ? "PATCH" : "POST";
      if (isEdit) {
        (payload as Record<string, unknown>).status = status;
      }

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (isEdit ? "업무 수정에 실패했습니다." : "업무 생성에 실패했습니다."));
      }

      setTaskDefaults({ assigner: assigner.trim() || undefined, assigneeId: assigneeId || undefined });
      if (isEdit) onUpdated?.();
      else onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEdit ? "업무 수정에 실패했습니다." : "업무 생성에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg dark:bg-zinc-800 dark:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{isEdit ? "업무 수정" : "새 업무"}</h2>
        {!isEdit && (
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            저장한 업무는 메인 화면의 &quot;오늘의 우선순위&quot;와 &quot;총 업무&quot; 수에 반영됩니다.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="업무 제목을 입력하세요"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              설명
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="업무 설명을 입력하세요 (선택)"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              지시자 (누가 지시했는지)
            </label>
            <input
              type="text"
              value={assigner}
              onChange={(e) => setAssigner(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="예: 팀장, 홍길동 (선택)"
            />
          </div>

          <div>
            <label
              htmlFor="receivedAt"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              업무접수일 (업무를 접수한 날)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="receivedAt"
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="flex-1 min-w-0 rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => setReceivedAt(todayISO())}
                className="shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              >
                지금
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              마감일 (09~18시, 30분 단위)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 min-w-[120px] rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
              <span className="text-zinc-400 dark:text-zinc-500">·</span>
              <select
                value={dueHour}
                onChange={(e) => setDueHour(e.target.value)}
                className="w-16 rounded-2xl border border-zinc-200 px-2 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                aria-label="시 (09–18)"
              >
                {HOURS_9_TO_18.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="font-medium text-zinc-600 dark:text-zinc-400">:</span>
              <select
                value={dueMinute}
                onChange={(e) => setDueMinute(e.target.value)}
                className="w-16 rounded-2xl border border-zinc-200 px-2 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                aria-label="분 (00, 30)"
              >
                {MINUTES_30.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="assigneeId"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              담당자
            </label>
            <select
              id="assigneeId"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            >
              <option value="">담당자 선택 (선택)</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.company ? ` (${contact.company})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              우선순위
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TaskPriority)
              }
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            >
              <option value="low">낮음</option>
              <option value="medium">중간</option>
              <option value="high">높음</option>
              <option value="urgent">긴급</option>
            </select>
          </div>

          {isEdit && (
            <div>
            <label
              htmlFor="status"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              상태
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm focus:border-black focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            >
                <option value="todo">할 일</option>
                <option value="in_progress">진행 중</option>
                <option value="done">완료</option>
                <option value="blocked">보류</option>
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "저장 중..." : isEdit ? "수정 완료" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

