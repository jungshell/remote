"use client";

import { programTypes } from "@/constants/divisions";
import type { BusinessAssignment } from "@/lib/auth/types";
import type { ProgramType } from "@/types/platform";

interface BusinessListEditorProps {
  value: BusinessAssignment[];
  onChange: (next: BusinessAssignment[]) => void;
  /** 사업명 → 유형 자동채움 매핑 (선택) */
  businessTypeMap?: Record<string, string>;
}

function emptyRow(): BusinessAssignment {
  return { business: "", subBusiness: "", programType: programTypes[0] };
}

/** 담당 사업(사업명·유형·세부사업)을 여러 개 입력하는 공용 에디터 */
export function BusinessListEditor({ value, onChange, businessTypeMap = {} }: BusinessListEditorProps) {
  const rows = value.length > 0 ? value : [emptyRow()];

  function update(index: number, patch: Partial<BusinessAssignment>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleBusinessChange(index: number, business: string) {
    const patch: Partial<BusinessAssignment> = { business };
    const mapped = businessTypeMap[business.trim()];
    if (mapped && programTypes.includes(mapped as ProgramType)) {
      patch.programType = mapped;
    }
    update(index, patch);
  }

  function add() {
    onChange([...rows, emptyRow()]);
  }

  function remove(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyRow()]);
  }

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => {
        const autoFilled = Boolean(businessTypeMap[row.business.trim()]);
        return (
          <div key={index} className="grid gap-2 border border-[var(--hairline)] bg-[var(--surface-soft)] p-3">
            <div className="flex items-center justify-between">
              <span className="label-machined text-[var(--text-muted)]">담당 사업 {index + 1}</span>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="focus-ring text-xs text-[var(--text-muted)] hover:text-white"
                >
                  삭제
                </button>
              ) : null}
            </div>
            <input
              value={row.business}
              onChange={(event) => handleBusinessChange(index, event.target.value)}
              placeholder="사업명 (예: 지역특화콘텐츠개발)"
              className="focus-ring h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
            />
            <select
              value={row.programType}
              onChange={(event) => update(index, { programType: event.target.value })}
              className="focus-ring h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
            >
              {programTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {autoFilled ? (
              <p className="text-[11px] text-[var(--success)]">기존에 등록된 사업의 유형을 자동 선택했습니다. (수정 가능)</p>
            ) : null}
            <input
              value={row.subBusiness}
              onChange={(event) => update(index, { subBusiness: event.target.value })}
              placeholder="세부사업 (예: 뉴콘텐츠 아카데미)"
              className="focus-ring h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
            />
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="focus-ring label-machined border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
      >
        + 사업 추가
      </button>
    </div>
  );
}
