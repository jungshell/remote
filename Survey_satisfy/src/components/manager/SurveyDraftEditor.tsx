"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "@/components/manager/DatePickerField";
import { authFetch } from "@/lib/auth/access";
import type { SurveyRow } from "@/lib/supabase/database.types";
import type { SurveyRecord } from "@/types/platform";

interface SurveyDraftEditorProps {
  survey: SurveyRecord;
  onSaved: (row: SurveyRow) => void;
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) {
    return "";
  }
  return iso.slice(0, 10);
}

export function SurveyDraftEditor({ survey, onSaved }: SurveyDraftEditorProps) {
  const [title, setTitle] = useState(survey.title);
  const [year, setYear] = useState(survey.year);
  const [round, setRound] = useState(survey.round);
  const [targetResponses, setTargetResponses] = useState(survey.targetResponses);
  const [startsAt, setStartsAt] = useState(toDateInputValue(survey.startsAt));
  const [endsAt, setEndsAt] = useState(toDateInputValue(survey.endsAt));
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(survey.title);
    setYear(survey.year);
    setRound(survey.round);
    setTargetResponses(survey.targetResponses);
    setStartsAt(toDateInputValue(survey.startsAt));
    setEndsAt(toDateInputValue(survey.endsAt));
  }, [survey]);

  if (survey.status !== "작성중") {
    return null;
  }

  async function handleSave() {
    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      setStatus("종료일은 시작일 이후여야 합니다.");
      return;
    }

    setIsSaving(true);
    setStatus("저장 중...");

    try {
      const response = await authFetch("/api/surveys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: survey.id,
          title: title.trim() || survey.title,
          year,
          round,
          targetResponses,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        }),
      });
      const data = (await response.json()) as { ok: boolean; survey?: SurveyRow; error?: string };
      if (!response.ok || !data.ok || !data.survey) {
        setStatus(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setStatus("작성중 설문을 저장했습니다.");
      onSaved(data.survey);
    } catch {
      setStatus("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel p-4 sm:p-6">
      <p className="label-machined text-[var(--text-muted)]">Draft Edit</p>
      <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">작성중 수정</h2>
      <p className="mt-2 text-sm text-[var(--text-body)]">
        회차·설문 기간·목표·제목을 수정할 수 있습니다. 진행 시작 후에는 잠깁니다.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label-machined text-[var(--text-muted)]">제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </label>
        <label>
          <span className="label-machined text-[var(--text-muted)]">연도</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </label>
        <label>
          <span className="label-machined text-[var(--text-muted)]">회차</span>
          <input
            type="number"
            min={1}
            value={round}
            onChange={(event) => setRound(Number(event.target.value))}
            className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </label>
        <DatePickerField label="설문 시작일" value={startsAt} max={endsAt || undefined} onChange={setStartsAt} />
        <DatePickerField label="설문 종료일" value={endsAt} min={startsAt || undefined} onChange={setEndsAt} />
        <label>
          <span className="label-machined text-[var(--text-muted)]">목표 응답수</span>
          <input
            type="number"
            min={1}
            value={targetResponses}
            onChange={(event) => setTargetResponses(Number(event.target.value))}
            className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void handleSave()}
        className="focus-ring label-machined mt-6 min-h-12 w-full border border-white px-6 py-4 hover:bg-white hover:text-black disabled:opacity-50"
      >
        {isSaving ? "저장 중" : "수정 저장"}
      </button>
      {status ? <p className="mt-3 text-sm text-[var(--text-body)]">{status}</p> : null}
    </section>
  );
}
