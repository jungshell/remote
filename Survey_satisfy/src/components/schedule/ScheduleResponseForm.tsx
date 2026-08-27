"use client";

import { useMemo, useState } from "react";
import { formatScheduleDeadline } from "@/lib/schedule/utils";
import type { AttendanceStatus, ScheduleDateSelection, SchedulePoll } from "@/types/schedule";

interface ScheduleResponseFormProps {
  poll: SchedulePoll;
}

interface DatePick {
  slots: string[];
  lunch: boolean;
  dinner: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const ATTEND_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "attend", label: "참석" },
  { value: "absent", label: "불참" },
  { value: "tentative", label: "미정" },
];

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()] ?? "";
  return `${m}월 ${d}일 (${weekday})`;
}

export function ScheduleResponseForm({ poll }: ScheduleResponseFormProps) {
  const isConfirm = poll.pollType === "confirm";
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 가용시간 유형 상태
  const [picks, setPicks] = useState<Record<string, DatePick>>({});
  // 참석확인 유형 상태
  const [attend, setAttend] = useState<AttendanceStatus | null>(null);
  const [confirmLunch, setConfirmLunch] = useState(false);
  const [confirmDinner, setConfirmDinner] = useState(false);

  const totalSelected = useMemo(
    () => Object.values(picks).reduce((sum, pick) => sum + pick.slots.length, 0),
    [picks],
  );

  function pickFor(date: string): DatePick {
    return picks[date] ?? { slots: [], lunch: false, dinner: false };
  }

  function toggleSlot(date: string, slotId: string) {
    setPicks((prev) => {
      const current = prev[date] ?? { slots: [], lunch: false, dinner: false };
      const has = current.slots.includes(slotId);
      const slots = has ? current.slots.filter((s) => s !== slotId) : [...current.slots, slotId];
      return { ...prev, [date]: { ...current, slots } };
    });
  }

  function toggleMeal(date: string, meal: "lunch" | "dinner") {
    setPicks((prev) => {
      const current = prev[date] ?? { slots: [], lunch: false, dinner: false };
      return { ...prev, [date]: { ...current, [meal]: !current[meal] } };
    });
  }

  async function submit(selections: ScheduleDateSelection[]) {
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/schedule-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, respondentName: name.trim(), selections, note }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "응답 저장에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch {
      setMessage("응답 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setMessage("이름을 입력해 주세요.");
      return;
    }

    if (isConfirm) {
      if (!attend) {
        setMessage("참석 여부를 선택해 주세요.");
        return;
      }
      const attending = attend === "attend";
      const selection: ScheduleDateSelection = {
        date: poll.dates[0] ?? "",
        slots: [],
        status: attend,
        ...(poll.includeLunch ? { lunch: attending && confirmLunch } : {}),
        ...(poll.includeDinner ? { dinner: attending && confirmDinner } : {}),
      };
      await submit([selection]);
      return;
    }

    const selections: ScheduleDateSelection[] = poll.dates
      .filter((date) => pickFor(date).slots.length > 0)
      .map((date) => {
        const pick = pickFor(date);
        return {
          date,
          slots: pick.slots,
          ...(poll.includeLunch ? { lunch: pick.lunch } : {}),
          ...(poll.includeDinner ? { dinner: pick.dinner } : {}),
        };
      });

    if (selections.length === 0) {
      setMessage("가능한 시간을 1개 이상 선택해 주세요.");
      return;
    }
    await submit(selections);
  }

  if (done) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="panel p-6 text-center sm:p-8">
          <p className="label-machined text-[var(--success)]">Complete</p>
          <h1 className="mt-4 text-2xl font-black uppercase sm:text-3xl">응답이 제출되었습니다</h1>
          <p className="mt-4 leading-7 text-[var(--text-body)]">
            참여해 주셔서 감사합니다. 같은 이름으로 다시 접속해 제출하면 응답을 수정할 수 있습니다.
          </p>
        </div>
      </section>
    );
  }

  const confirmedDate = poll.dates[0] ?? "";
  const confirmedTime = poll.timeSlots[0]?.label ?? "";
  const attending = attend === "attend";
  const submitLabel = isConfirm ? "제출" : `제출 (${totalSelected}개 선택)`;

  return (
    <section className="mx-auto max-w-2xl pb-[max(6rem,env(safe-area-inset-bottom))]">
      <div className="panel overflow-hidden">
        <div className="border-b border-[var(--hairline)] p-5 sm:p-6">
          <p className="label-machined text-[var(--accent)]">충남콘텐츠진흥원 · 일정 조사</p>
          <h1 className="mt-3 text-2xl font-black uppercase leading-tight sm:text-3xl">{poll.title}</h1>
          {poll.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-body)]">{poll.description}</p>
          ) : null}
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {isConfirm ? "아래 확정 일정에 참석 여부를 선택해 주세요." : "가능한 시간을 모두 선택해 주세요. (복수 선택)"}
            {poll.deadline ? ` · 마감 ${formatScheduleDeadline(poll.deadline)}` : ""}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <label className="block">
            <span className="label-machined text-[var(--text-muted)]">이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="성함을 입력해 주세요"
              className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
          </label>

          {isConfirm ? (
            <div className="mt-6 space-y-4">
              <fieldset className="border border-[var(--hairline)] p-4">
                <legend className="px-1 text-base font-bold text-white">확정 일시</legend>
                <p className="mt-1 text-lg font-black text-white">
                  {confirmedDate ? formatDate(confirmedDate) : "-"} · {confirmedTime}
                </p>
                <div className="mt-4">
                  <span className="label-machined text-[var(--text-muted)]">참석 여부</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {ATTEND_OPTIONS.map((option) => {
                      const active = attend === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setAttend(option.value)}
                          className={`focus-ring min-h-12 border px-4 py-3 text-sm font-bold transition-colors ${
                            active
                              ? "border-white bg-white text-black"
                              : "border-[var(--hairline)] bg-[var(--surface-soft)] text-white hover:border-white"
                          }`}
                        >
                          {active ? "✓ " : ""}
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(poll.includeLunch || poll.includeDinner) && attending ? (
                  <div className="mt-4">
                    <span className="label-machined text-[var(--text-muted)]">식사 참석 (참석 시)</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {poll.includeLunch ? (
                        <MealToggle label="오찬 참석" active={confirmLunch} onClick={() => setConfirmLunch((v) => !v)} />
                      ) : null}
                      {poll.includeDinner ? (
                        <MealToggle label="석식 참석" active={confirmDinner} onClick={() => setConfirmDinner((v) => !v)} />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </fieldset>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {poll.dates.map((date) => {
                const pick = pickFor(date);
                return (
                  <fieldset key={date} className="border border-[var(--hairline)] p-4">
                    <legend className="px-1 text-base font-bold text-white">{formatDate(date)}</legend>
                    <div className="mt-2 grid gap-2">
                      {poll.timeSlots.map((slot) => {
                        const active = pick.slots.includes(slot.id);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleSlot(date, slot.id)}
                            className={`focus-ring min-h-12 border px-4 py-3 text-left text-sm transition-colors ${
                              active
                                ? "border-white bg-white text-black"
                                : "border-[var(--hairline)] bg-[var(--surface-soft)] text-white hover:border-white"
                            }`}
                          >
                            {active ? "✓ " : ""}
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>

                    {poll.includeLunch || poll.includeDinner ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {poll.includeLunch ? (
                          <MealToggle label="오찬 가능" active={pick.lunch} onClick={() => toggleMeal(date, "lunch")} />
                        ) : null}
                        {poll.includeDinner ? (
                          <MealToggle label="석식 가능" active={pick.dinner} onClick={() => toggleMeal(date, "dinner")} />
                        ) : null}
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>
          )}

          <label className="mt-6 block">
            <span className="label-machined text-[var(--text-muted)]">비고 (선택)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="특이사항이 있으면 적어 주세요."
              className="focus-ring mt-2 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] p-3 text-sm text-white"
            />
          </label>

          {message ? <p className="mt-4 text-sm text-[var(--warning)]">{message}</p> : null}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="focus-ring label-machined mt-6 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
          >
            {isSubmitting ? "제출 중" : submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function MealToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring min-h-10 border px-4 text-sm transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-black"
          : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
      }`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
