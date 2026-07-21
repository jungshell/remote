"use client";

import { cloneElement, useId } from "react";

/**
 * label–컨트롤을 htmlFor/id로 연결하는 공용 필드.
 * 자식은 단일 폼 컨트롤(input/select/textarea)이어야 하며 id가 자동 주입됩니다.
 */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="label-machined text-[var(--text-muted)]">
        {label}
      </label>
      <div className="mt-2">{cloneElement(children, { id })}</div>
    </div>
  );
}

/** "전체" 옵션이 있는 공용 필터 셀렉트 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "전체",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="label-machined text-[var(--text-muted)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
