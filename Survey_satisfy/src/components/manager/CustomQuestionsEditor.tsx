"use client";

import { useState } from "react";
import type { Question, QuestionScale } from "@/types/platform";

interface CustomQuestionsEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

const SCALE_OPTIONS: Array<{ value: QuestionScale; label: string }> = [
  { value: "likert5", label: "5점 척도" },
  { value: "nps", label: "NPS (0~10)" },
  { value: "text", label: "서술형" },
  { value: "choice", label: "선택형" },
];

export function CustomQuestionsEditor({ questions, onChange }: CustomQuestionsEditorProps) {
  const [label, setLabel] = useState("");
  const [scale, setScale] = useState<QuestionScale>("likert5");
  const [required, setRequired] = useState(true);
  const [optionsText, setOptionsText] = useState("");

  function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    if (questions.length >= 20) {
      return;
    }

    const options =
      scale === "choice"
        ? optionsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;

    if (scale === "choice" && (!options || options.length < 2)) {
      return;
    }

    const next: Question = {
      id: `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      group: "커스텀",
      category: "추가 문항",
      label: trimmed,
      scale,
      required: scale === "text" ? false : required,
      kpiIncluded: false,
      locked: false,
      tier: "extended",
      options,
      orderNo: questions.length + 1,
    };

    onChange([...questions, next]);
    setLabel("");
    setOptionsText("");
    setScale("likert5");
    setRequired(true);
  }

  function handleRemove(id: string) {
    onChange(questions.filter((question) => question.id !== id));
  }

  return (
    <div className="rounded border border-[var(--hairline)] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-white">추가 문항 (직접 입력)</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            표준 풀에 없는 문항을 넣고, 불필요하면 삭제하세요. 템플릿에 함께 저장됩니다.
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{questions.length}/20</span>
      </div>

      {questions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {questions.map((question) => (
            <li
              key={question.id}
              className="flex items-start justify-between gap-3 border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-3"
            >
              <div>
                <p className="text-sm text-white">{question.label}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {SCALE_OPTIONS.find((item) => item.value === question.scale)?.label ?? question.scale}
                  {question.required ? " · 필수" : " · 선택"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(question.id)}
                className="focus-ring shrink-0 border border-[var(--hairline)] px-2 py-1 text-xs text-[var(--text-body)] hover:border-white hover:text-white"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--text-muted)]">아직 추가한 문항이 없습니다.</p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="label-machined text-[var(--text-muted)]">문항 문구</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="예: 행사 부스 배치가 적절하였다."
            className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-sm text-white"
          />
        </label>
        <label>
          <span className="label-machined text-[var(--text-muted)]">유형</span>
          <select
            value={scale}
            onChange={(event) => setScale(event.target.value as QuestionScale)}
            className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-sm text-white"
          >
            {SCALE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={required}
            disabled={scale === "text"}
            onChange={(event) => setRequired(event.target.checked)}
          />
          <span className="text-sm text-[var(--text-body)]">필수 응답</span>
        </label>
        {scale === "choice" ? (
          <label className="md:col-span-2">
            <span className="label-machined text-[var(--text-muted)]">선택지 (쉼표로 구분, 2개 이상)</span>
            <input
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              placeholder="예: 매우 그렇다, 그렇다, 보통, 아니다"
              className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-sm text-white"
            />
          </label>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!label.trim() || questions.length >= 20}
        className="focus-ring label-machined mt-4 border border-[var(--hairline)] px-4 py-2 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:opacity-40"
      >
        문항 추가
      </button>
    </div>
  );
}
