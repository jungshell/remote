"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth/access";
import { Badge } from "@/components/ui/Badge";
import { ScheduleResults } from "@/components/admin/ScheduleResults";
import { DEFAULT_TIME_SLOTS, type SchedulePoll, type ScheduleTimeSlot } from "@/types/schedule";

type View = "list" | "create" | "results";

function scheduleUrl(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/schedule/${id}`;
}

export function ScheduleConsole() {
  const [polls, setPolls] = useState<SchedulePoll[]>([]);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<SchedulePoll | null>(null);
  const [status, setStatus] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    authFetch("/api/schedule-polls", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ok: boolean; polls?: SchedulePoll[]; error?: string }) => {
        if (data.ok && data.polls) {
          setPolls(data.polls);
        } else {
          setStatus(data.error ?? "일정조사를 불러오지 못했습니다.");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("일정조사를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  async function handleCopyLink(id: string) {
    try {
      await navigator.clipboard.writeText(scheduleUrl(id));
      setStatus("참여 링크를 복사했습니다.");
    } catch {
      setStatus(scheduleUrl(id));
    }
  }

  async function handleToggleStatus(poll: SchedulePoll) {
    const next = poll.status === "진행중" ? "종료" : "진행중";
    const response = await authFetch(`/api/schedule-polls/${poll.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "상태 변경에 실패했습니다.");
      return;
    }
    setReloadKey((key) => key + 1);
  }

  async function handleDelete(poll: SchedulePoll) {
    if (!window.confirm(`"${poll.title}" 일정조사를 삭제할까요? 응답도 함께 삭제됩니다.`)) {
      return;
    }
    const response = await authFetch(`/api/schedule-polls/${poll.id}`, { method: "DELETE" });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    setStatus("삭제했습니다.");
    setReloadKey((key) => key + 1);
  }

  if (view === "create") {
    return (
      <SchedulePollCreator
        onCancel={() => setView("list")}
        onCreated={() => {
          setView("list");
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (view === "results" && selected) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView("list")}
            className="label-machined text-[var(--text-body)] transition-colors hover:text-white"
          >
            ← 일정조사 목록
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLink(selected.id)}
              className="focus-ring label-machined min-h-10 border border-[var(--hairline)] px-4 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
            >
              참여 링크 복사
            </button>
          </div>
        </div>
        <ScheduleResults poll={selected} />
        {status ? <p className="text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--hairline)] p-4 sm:p-6">
        <div>
          <p className="label-machined text-[var(--text-muted)]">Schedule</p>
          <h2 className="mt-2 text-2xl font-black uppercase">위원 일정조사</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            후보 날짜·시간대를 정해 링크를 배포하면, 위원별 가능 시간을 취합해 한눈에 봅니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView("create")}
          className="focus-ring label-machined border border-white px-5 py-3 hover:bg-white hover:text-black"
        >
          + 새 일정조사
        </button>
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {polls.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">아직 만든 일정조사가 없습니다. &quot;+ 새 일정조사&quot;로 시작하세요.</p>
        ) : (
          polls.map((poll) => (
            <article key={poll.id} className="grid gap-3 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={poll.status === "진행중" ? "success" : "default"}>{poll.status}</Badge>
                  <h3 className="text-lg font-bold text-white">{poll.title}</h3>
                </div>
                <p className="mt-2 text-sm text-[var(--text-body)]">
                  후보 {poll.dates.length}일 · 시간대 {poll.timeSlots.length}개
                  {poll.includeLunch ? " · 오찬" : ""}
                  {poll.includeDinner ? " · 석식" : ""}
                  {poll.deadline ? ` · 마감 ${poll.deadline.slice(0, 10)}` : ""}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-muted)]">{scheduleUrl(poll.id)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label="결과 보기"
                  primary
                  onClick={() => {
                    setSelected(poll);
                    setView("results");
                  }}
                />
                <ActionButton label="링크 복사" onClick={() => void handleCopyLink(poll.id)} />
                <ActionButton
                  label={poll.status === "진행중" ? "종료" : "재개"}
                  onClick={() => void handleToggleStatus(poll)}
                />
                <ActionButton label="삭제" danger onClick={() => void handleDelete(poll)} />
              </div>
            </article>
          ))
        )}
      </div>

      {status ? <p className="border-t border-[var(--hairline)] p-4 text-sm text-[var(--text-body)] sm:p-6">{status}</p> : null}
    </section>
  );
}

function ActionButton({
  label,
  primary,
  danger,
  onClick,
}: {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const tone = primary
    ? "border-white text-white hover:bg-white hover:text-black"
    : danger
      ? "border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-black"
      : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white";
  return (
    <button type="button" onClick={onClick} className={`focus-ring label-machined min-h-11 border px-4 text-xs ${tone}`}>
      {label}
    </button>
  );
}

function newSlotId() {
  return `s_${Math.random().toString(36).slice(2, 7)}`;
}

function SchedulePollCreator({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [slots, setSlots] = useState<ScheduleTimeSlot[]>(DEFAULT_TIME_SLOTS.map((slot) => ({ ...slot })));
  const [includeLunch, setIncludeLunch] = useState(false);
  const [includeDinner, setIncludeDinner] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function addDate() {
    if (!dateInput) return;
    setDates((prev) => (prev.includes(dateInput) ? prev : [...prev, dateInput].sort()));
    setDateInput("");
  }

  function addSlot() {
    setSlots((prev) => [...prev, { id: newSlotId(), label: "" }]);
  }

  async function handleCreate() {
    const cleanSlots = slots.map((slot) => ({ id: slot.id, label: slot.label.trim() })).filter((slot) => slot.label);
    if (!title.trim()) {
      setStatus("조사 제목을 입력해 주세요.");
      return;
    }
    if (dates.length === 0) {
      setStatus("후보 날짜를 1개 이상 추가해 주세요.");
      return;
    }
    if (cleanSlots.length === 0) {
      setStatus("시간대를 1개 이상 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setStatus("");
    try {
      const response = await authFetch("/api/schedule-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          dates,
          timeSlots: cleanSlots,
          includeLunch,
          includeDinner,
          deadline: deadline || null,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "생성에 실패했습니다.");
        return;
      }
      onCreated();
    } catch {
      setStatus("생성 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-machined text-[var(--text-muted)]">New Schedule</p>
          <h2 className="mt-2 text-2xl font-black uppercase">새 일정조사</h2>
        </div>
        <button type="button" onClick={onCancel} className="label-machined text-[var(--text-body)] hover:text-white">
          ← 목록
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="block">
          <span className="label-machined text-[var(--text-muted)]">제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 2026 상반기 인사위원회 일정 조사"
            className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </label>

        <label className="block">
          <span className="label-machined text-[var(--text-muted)]">안내 문구 (선택)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="위원님들께 보여줄 안내 문구"
            className="focus-ring mt-2 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] p-3 text-sm text-white"
          />
        </label>

        {/* 후보 날짜 */}
        <div>
          <span className="label-machined text-[var(--text-muted)]">후보 날짜</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              className="focus-ring h-11 border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
            />
            <button
              type="button"
              onClick={addDate}
              className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-4 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
            >
              날짜 추가
            </button>
          </div>
          {dates.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {dates.map((date) => (
                <span key={date} className="flex items-center gap-2 border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-1.5 text-sm text-white">
                  {date}
                  <button
                    type="button"
                    onClick={() => setDates((prev) => prev.filter((d) => d !== date))}
                    className="text-[var(--text-muted)] hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* 시간대 */}
        <div>
          <span className="label-machined text-[var(--text-muted)]">시간대 (기본값 제공 · 수정 가능)</span>
          <div className="mt-2 grid gap-2">
            {slots.map((slot, index) => (
              <div key={slot.id} className="flex gap-2">
                <input
                  value={slot.label}
                  onChange={(event) =>
                    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, label: event.target.value } : s)))
                  }
                  placeholder="예: 오전 10~11"
                  className="focus-ring h-11 flex-1 border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                />
                <button
                  type="button"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                  className="focus-ring min-h-11 border border-[var(--hairline)] px-3 text-sm text-[var(--text-muted)] hover:border-white hover:text-white"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addSlot}
            className="focus-ring label-machined mt-2 border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
          >
            + 시간대 추가
          </button>
        </div>

        {/* 오찬/석식/마감 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleField label="오찬 참석 조사 포함" active={includeLunch} onClick={() => setIncludeLunch((v) => !v)} />
          <ToggleField label="석식 참석 조사 포함" active={includeDinner} onClick={() => setIncludeDinner((v) => !v)} />
          <label className="block">
            <span className="label-machined text-[var(--text-muted)]">응답 마감 (선택)</span>
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleCreate()}
          className="focus-ring label-machined mt-2 border border-white px-6 py-4 hover:bg-white hover:text-black disabled:opacity-50"
        >
          {isSaving ? "생성 중" : "일정조사 생성 · 링크 발급"}
        </button>
        {status ? <p className="text-sm text-[var(--warning)]">{status}</p> : null}
      </div>
    </section>
  );
}

function ToggleField({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring min-h-[3.75rem] border px-4 text-sm transition-colors ${
        active
          ? "border-white bg-white text-black"
          : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
      }`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
