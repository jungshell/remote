"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth/access";
import type { SchedulePoll, ScheduleResponseRecord } from "@/types/schedule";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()] ?? "";
  return `${m}/${d}(${weekday})`;
}

export function ScheduleResults({ poll }: { poll: SchedulePoll }) {
  const isConfirm = poll.pollType === "confirm";
  const [responses, setResponses] = useState<ScheduleResponseRecord[]>([]);
  const [status, setStatus] = useState("불러오는 중...");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    authFetch(`/api/schedule-responses?poll_id=${encodeURIComponent(poll.id)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ok: boolean; responses?: ScheduleResponseRecord[]; error?: string }) => {
        if (data.ok && data.responses) {
          setResponses(data.responses);
          setStatus(data.responses.length === 0 ? "아직 응답이 없습니다." : "");
        } else {
          setStatus(data.error ?? "응답을 불러오지 못했습니다.");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("응답을 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [poll.id, reloadKey]);

  // (date, slotId) → 가능한 응답자 이름 목록
  const availability = useMemo(() => {
    const map = new Map<string, string[]>();
    const mealMap = new Map<string, { lunch: string[]; dinner: string[] }>();
    for (const date of poll.dates) {
      mealMap.set(date, { lunch: [], dinner: [] });
    }
    for (const response of responses) {
      for (const selection of response.selections) {
        for (const slotId of selection.slots) {
          const key = `${selection.date}|${slotId}`;
          const list = map.get(key) ?? [];
          list.push(response.respondentName);
          map.set(key, list);
        }
        const meal = mealMap.get(selection.date);
        if (meal) {
          if (selection.lunch) meal.lunch.push(response.respondentName);
          if (selection.dinner) meal.dinner.push(response.respondentName);
        }
      }
    }
    return { map, mealMap };
  }, [poll.dates, responses]);

  // 최다 가능 (date, slot) 찾기 (하이라이트)
  const bestCount = useMemo(() => {
    let best = 0;
    for (const list of availability.map.values()) {
      best = Math.max(best, list.length);
    }
    return best;
  }, [availability]);

  // 참석확인 유형: 참석/불참/미정 집계 + 식사(참석자 중)
  const confirmSummary = useMemo(() => {
    const attend: string[] = [];
    const absent: string[] = [];
    const tentative: string[] = [];
    const lunch: string[] = [];
    const dinner: string[] = [];
    for (const response of responses) {
      const sel = response.selections[0];
      const name = response.respondentName;
      if (sel?.status === "attend") {
        attend.push(name);
        if (sel.lunch) lunch.push(name);
        if (sel.dinner) dinner.push(name);
      } else if (sel?.status === "absent") {
        absent.push(name);
      } else if (sel?.status === "tentative") {
        tentative.push(name);
      }
    }
    return { attend, absent, tentative, lunch, dinner };
  }, [responses]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] p-4 sm:p-6">
        <div>
          <p className="label-machined text-[var(--text-muted)]">{isConfirm ? "Attendance" : "Availability"}</p>
          <h3 className="mt-1 text-lg font-black text-white">{poll.title} · 결과</h3>
          <p className="mt-1 text-sm text-[var(--text-body)]">
            {isConfirm
              ? `응답 ${responses.length}명 · 참석 ${confirmSummary.attend.length} / 불참 ${confirmSummary.absent.length} / 미정 ${confirmSummary.tentative.length}`
              : `응답 ${responses.length}명 · 초록 배경 = 최다 가능 시간`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="focus-ring label-machined min-h-10 border border-[var(--hairline)] px-4 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
        >
          새로고침
        </button>
      </div>

      {responses.length === 0 ? (
        <p className="p-6 text-sm text-[var(--text-muted)]">{status}</p>
      ) : isConfirm ? (
        <div className="grid gap-3 p-4 sm:p-6">
          <AttendGroup title="참석" tone="success" names={confirmSummary.attend} />
          <AttendGroup title="불참" tone="danger" names={confirmSummary.absent} />
          <AttendGroup title="미정" tone="muted" names={confirmSummary.tentative} />
          {poll.includeLunch || poll.includeDinner ? (
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {poll.includeLunch ? <AttendGroup title="오찬 참석" tone="muted" names={confirmSummary.lunch} /> : null}
              {poll.includeDinner ? <AttendGroup title="석식 참석" tone="muted" names={confirmSummary.dinner} /> : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto p-2 sm:p-4">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-left text-[var(--text-muted)]">
                  날짜
                </th>
                {poll.timeSlots.map((slot) => (
                  <th key={slot.id} className="border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-left text-[var(--text-muted)]">
                    {slot.label}
                  </th>
                ))}
                {poll.includeLunch ? (
                  <th className="border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text-muted)]">오찬</th>
                ) : null}
                {poll.includeDinner ? (
                  <th className="border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-2 text-[var(--text-muted)]">석식</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {poll.dates.map((date) => {
                const meal = availability.mealMap.get(date);
                return (
                  <tr key={date}>
                    <td className="border border-[var(--hairline)] px-3 py-2 font-bold text-white">{formatDate(date)}</td>
                    {poll.timeSlots.map((slot) => {
                      const names = availability.map.get(`${date}|${slot.id}`) ?? [];
                      const isBest = names.length > 0 && names.length === bestCount;
                      return (
                        <td
                          key={slot.id}
                          className={`border border-[var(--hairline)] px-3 py-2 align-top ${
                            isBest ? "bg-[#12351f]" : ""
                          }`}
                        >
                          <span className="font-black text-white">{names.length}</span>
                          {names.length > 0 ? (
                            <span className="mt-1 block text-xs leading-5 text-[var(--text-body)]">{names.join(", ")}</span>
                          ) : (
                            <span className="mt-1 block text-xs text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                      );
                    })}
                    {poll.includeLunch ? (
                      <td className="border border-[var(--hairline)] px-3 py-2 align-top text-xs text-[var(--text-body)]">
                        <span className="font-black text-white">{meal?.lunch.length ?? 0}</span>
                        {meal?.lunch.length ? <span className="mt-1 block">{meal.lunch.join(", ")}</span> : null}
                      </td>
                    ) : null}
                    {poll.includeDinner ? (
                      <td className="border border-[var(--hairline)] px-3 py-2 align-top text-xs text-[var(--text-body)]">
                        <span className="font-black text-white">{meal?.dinner.length ?? 0}</span>
                        {meal?.dinner.length ? <span className="mt-1 block">{meal.dinner.join(", ")}</span> : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {responses.some((response) => response.note) ? (
        <div className="border-t border-[var(--hairline)] p-4 sm:p-6">
          <p className="label-machined text-[var(--text-muted)]">비고</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-body)]">
            {responses
              .filter((response) => response.note)
              .map((response) => (
                <li key={response.id}>
                  <span className="text-white">{response.respondentName}</span>: {response.note}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function AttendGroup({
  title,
  tone,
  names,
}: {
  title: string;
  tone: "success" | "danger" | "muted";
  names: string[];
}) {
  const countColor =
    tone === "success" ? "text-[var(--success)]" : tone === "danger" ? "text-[var(--danger)]" : "text-white";
  return (
    <div className="border border-[var(--hairline)] p-3">
      <div className="flex items-baseline gap-2">
        <span className="label-machined text-[var(--text-muted)]">{title}</span>
        <span className={`text-lg font-black ${countColor}`}>{names.length}</span>
      </div>
      <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
        {names.length > 0 ? names.join(", ") : "-"}
      </p>
    </div>
  );
}
