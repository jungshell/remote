"use client";

import { useRef } from "react";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

/** 달력 팝업 + 직접 입력을 함께 지원 */
export function DatePickerField({ label, value, onChange, min, max }: DatePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openCalendar() {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") {
      try {
        picker.showPicker();
      } catch {
        // 브라우저가 showPicker를 막으면 기본 date UI에 맡김
      }
    }
  }

  return (
    <div>
      <label className="label-machined text-[var(--text-muted)]">{label}</label>
      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring date-picker-input h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
        />
        <button
          type="button"
          onClick={openCalendar}
          className="focus-ring label-machined shrink-0 border border-[var(--hairline)] px-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
          title="달력 열기"
        >
          달력
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">날짜를 직접 입력하거나, 달력 버튼으로 선택할 수 있습니다.</p>
    </div>
  );
}
