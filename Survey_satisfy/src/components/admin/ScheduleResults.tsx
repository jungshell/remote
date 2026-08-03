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

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] p-4 sm:p-6">
        <div>
          <p className="label-machined text-[var(--text-muted)]">Availability</p>
          <h3 className="mt-1 text-lg font-black text-white">{poll.title} · 결과</h3>
          <p className="mt-1 text-sm text-[var(--text-body)]">응답 {responses.length}명 · 초록 배경 = 최다 가능 시간</p>
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
