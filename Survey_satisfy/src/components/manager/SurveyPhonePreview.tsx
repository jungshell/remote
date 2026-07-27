"use client";

import type { Question } from "@/types/platform";

interface SurveyPhonePreviewProps {
  title: string;
  questions: Question[];
  onClose: () => void;
}

export function SurveyPhonePreview({ title, questions, onClose }: SurveyPhonePreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center">
      <div className="flex h-[min(92vh,820px)] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] border border-[var(--hairline)] bg-black shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Participant Preview</p>
            <p className="mt-1 line-clamp-1 text-sm font-bold text-white">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-3 text-xs text-[var(--text-body)]"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-xs text-[var(--text-muted)]">참여자 화면에 보이는 문항 미리보기입니다. 응답은 저장되지 않습니다.</p>
          <ol className="mt-4 space-y-4">
            {questions.map((question, index) => (
              <li key={question.id} className="border border-[var(--hairline)] bg-[var(--surface-soft)] p-4">
                <p className="text-xs text-[var(--text-muted)]">
                  {String(index + 1).padStart(2, "0")} · {question.category ?? question.group}
                  {question.required ? " · 필수" : ""}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-white">{question.label}</p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">{scaleLabel(question.scale)}</p>
                {question.scale === "likert5" ? (
                  <div className="mt-3 grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <div
                        key={score}
                        className="grid min-h-9 place-items-center border border-[var(--hairline)] text-xs text-[var(--text-body)]"
                      >
                        {score}
                      </div>
                    ))}
                  </div>
                ) : null}
                {question.scale === "nps" ? (
                  <div className="mt-3 grid grid-cols-6 gap-1">
                    {Array.from({ length: 11 }, (_, score) => (
                      <div
                        key={score}
                        className="grid min-h-9 place-items-center border border-[var(--hairline)] text-[10px] text-[var(--text-body)]"
                      >
                        {score}
                      </div>
                    ))}
                  </div>
                ) : null}
                {question.scale === "choice" && question.options ? (
                  <div className="mt-3 grid gap-1.5">
                    {question.options.map((option) => (
                      <div
                        key={option}
                        className="min-h-10 border border-[var(--hairline)] px-3 py-2 text-xs text-[var(--text-body)]"
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                ) : null}
                {question.scale === "text" ? (
                  <div className="mt-3 min-h-20 border border-dashed border-[var(--hairline)] px-3 py-2 text-xs text-[var(--text-muted)]">
                    서술 입력란
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function scaleLabel(scale: Question["scale"]) {
  if (scale === "likert5") return "5점 척도";
  if (scale === "nps") return "NPS 0~10";
  if (scale === "choice") return "선택형";
  return "서술형";
}
