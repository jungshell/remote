"use client";

import { useMemo, useState } from "react";
import { divisions, programTypes } from "@/constants/divisions";
import { buildSurveyQuestions } from "@/constants/general-questions";
import {
  getDefaultSelectedQuestionIds,
  getQuestionPool,
  groupQuestionsByCategory,
  resolveRespondentTypeForProgram,
} from "@/constants/question-pool";
import { authFetch } from "@/lib/auth/access";
import type { Division, ProgramType, RespondentType } from "@/types/platform";
import type { SurveyRow } from "@/lib/supabase/database.types";

interface SurveyCreatorProps {
  onCreated: (survey: SurveyRow) => void;
}

export function SurveyCreator({ onCreated }: SurveyCreatorProps) {
  const currentYear = new Date().getFullYear();
  const [title, setTitle] = useState("");
  const [division, setDivision] = useState<Division>("사업총괄실");
  const [business, setBusiness] = useState("");
  const [subBusiness, setSubBusiness] = useState("");
  const [programType, setProgramType] = useState<ProgramType>("교육·인력양성형");
  const [respondentType, setRespondentType] = useState<RespondentType>("both");
  const [year, setYear] = useState(currentYear);
  const [round, setRound] = useState(1);
  const [targetResponses, setTargetResponses] = useState(80);
  const [selectedIds, setSelectedIds] = useState<string[]>(getDefaultSelectedQuestionIds("교육·인력양성형"));
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pool = useMemo(() => getQuestionPool(programType), [programType]);
  const grouped = useMemo(() => groupQuestionsByCategory(pool), [pool]);
  const previewCount = useMemo(
    () => buildSurveyQuestions(programType, respondentType, selectedIds).length,
    [programType, respondentType, selectedIds],
  );

  function handleProgramTypeChange(nextType: ProgramType) {
    setProgramType(nextType);
    setSelectedIds(getDefaultSelectedQuestionIds(nextType));
    setRespondentType(resolveRespondentTypeForProgram(nextType));
  }

  function toggleQuestion(id: string, locked?: boolean) {
    if (locked) {
      return;
    }

    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!title.trim() || !business.trim() || !subBusiness.trim()) {
      setStatus("사업명, 사업, 세부사업을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("설문을 생성하는 중입니다.");

    try {
      const response = await authFetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          division,
          business: business.trim(),
          subBusiness: subBusiness.trim(),
          programType,
          respondentType,
          year,
          round,
          targetResponses,
          selectedQuestionIds: selectedIds,
        }),
      });

      const data = (await response.json()) as { ok: boolean; survey?: SurveyRow; error?: string };

      if (!response.ok || !data.ok || !data.survey) {
        setStatus(data.error ?? "설문 생성에 실패했습니다.");
        return;
      }

      setStatus("설문이 생성되었습니다. 운영 화면으로 이동합니다.");
      onCreated(data.survey);
    } catch {
      setStatus("설문 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel p-6">
      <p className="label-machined text-[var(--text-muted)]">Create Survey</p>
      <h2 className="mt-3 text-2xl font-black uppercase">설문 생성</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
        사업 정보를 입력하고 유형별 문항을 선택하세요. 전반적 만족도와 NPS는 필수입니다.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Field label="설문 제목">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            placeholder="2026 뉴콘텐츠 아카데미 1회차 만족도 조사"
          />
        </Field>
        <Field label="연도">
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </Field>
        <Field label="본부">
          <select
            value={division}
            onChange={(event) => setDivision(event.target.value as Division)}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          >
            {divisions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="회차">
          <input
            type="number"
            min={1}
            value={round}
            onChange={(event) => setRound(Number(event.target.value))}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </Field>
        <Field label="사업">
          <input
            value={business}
            onChange={(event) => setBusiness(event.target.value)}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </Field>
        <Field label="세부사업">
          <input
            value={subBusiness}
            onChange={(event) => setSubBusiness(event.target.value)}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </Field>
        <Field label="사업유형">
          <select
            value={programType}
            onChange={(event) => handleProgramTypeChange(event.target.value as ProgramType)}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          >
            {programTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="응답자 유형">
          <select
            value={respondentType}
            onChange={(event) => setRespondentType(event.target.value as RespondentType)}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          >
            <option value="org">기관</option>
            <option value="person">개인</option>
            <option value="both">기관+개인</option>
          </select>
        </Field>
        <Field label="목표 응답수">
          <input
            type="number"
            min={1}
            value={targetResponses}
            onChange={(event) => setTargetResponses(Number(event.target.value))}
            className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </Field>
      </div>

      <div className="mt-10 border-t border-[var(--hairline)] pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Question Pool</p>
            <h3 className="mt-2 text-xl font-bold">문항 선택 ({selectedIds.length}/{pool.length})</h3>
          </div>
          <p className="text-sm text-[var(--text-body)]">참여자 최종 문항 수: {previewCount}개 (일반사항 포함)</p>
        </div>

        <div className="mt-6 grid gap-6">
          {grouped.map((group) => (
            <div key={group.category} className="border border-[var(--hairline)] p-4">
              <p className="label-machined text-[var(--text-muted)]">{group.category}</p>
              <div className="mt-4 space-y-3">
                {group.items.map((question) => (
                  <label key={question.id} className="flex items-start gap-3 text-sm leading-6 text-[var(--text-body)]">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(question.id)}
                      disabled={question.locked}
                      onChange={() => toggleQuestion(question.id, question.locked)}
                      className="mt-1"
                    />
                    <span>
                      {question.label}
                      {question.locked ? <span className="ml-2 text-[var(--warning)]">필수</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleCreate()}
        className="focus-ring label-machined mt-8 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
      >
        {isSubmitting ? "생성 중" : "설문 생성"}
      </button>
      {status ? <p className="mt-4 text-sm text-[var(--text-body)]">{status}</p> : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-machined text-[var(--text-muted)]">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
