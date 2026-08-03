"use client";

import { useState } from "react";

interface MultiDatePickerProps {
  value: string[];
  onChange: (dates: string[]) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 달력에서 여러 날짜를 클릭해 복수 선택 */
export function MultiDatePicker({ value, onChange }: MultiDatePickerProps) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = todayStr();

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dateStr(day: number) {
    return `${view.year}-${pad(view.month + 1)}-${pad(day)}`;
  }

  function toggle(day: number) {
    const str = dateStr(day);
    onChange(value.includes(str) ? value.filter((d) => d !== str) : [...value, str].sort());
  }

  function shiftMonth(delta: number) {
    setView((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  return (
    <div className="border border-[var(--hairline)] bg-[var(--surface-soft)] p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="focus-ring min-h-9 border border-[var(--hairline)] px-3 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-white">
          {view.year}년 {view.month + 1}월
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="focus-ring min-h-9 border border-[var(--hairline)] px-3 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--text-muted)]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} />;
          }
          const str = dateStr(day);
          const selected = value.includes(str);
          const past = str < today;
          return (
            <button
              key={str}
              type="button"
              disabled={past}
              aria-pressed={selected}
              onClick={() => toggle(day)}
              className={`focus-ring min-h-10 border text-sm transition-colors ${
                selected
                  ? "border-white bg-white font-black text-black"
                  : past
                    ? "cursor-not-allowed border-transparent text-[var(--text-muted)] opacity-40"
                    : "border-[var(--hairline)] text-white hover:border-white"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {value.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--text-body)]">선택: {value.join(", ")}</p>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-muted)]">날짜를 클릭해 여러 개 선택하세요.</p>
      )}
    </div>
  );
}
