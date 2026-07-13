"use client";

import { useEffect, useMemo, useState } from "react";
import { getCommonKpiQuestions } from "@/constants/common-kpi-questions";
import { buildSurveyQuestions } from "@/constants/general-questions";
import {
  getAllTypeQuestionIds,
  getDefaultSelectedQuestionIds,
  getQuestionPool,
  groupQuestionsByCategory,
  resolveRespondentTypeForProgram,
} from "@/constants/question-pool";
import { Badge } from "@/components/ui/Badge";
import { authFetch } from "@/lib/auth/access";
import type { AuthUser } from "@/lib/auth/types";
import type { Division, ProgramType, Question, RespondentType } from "@/types/platform";
import type { SurveyRow } from "@/lib/supabase/database.types";

interface SurveyCreatorProps {
  profile: AuthUser;
  onCreated: (survey: SurveyRow) => void;
}

function buildAutoTitle(year: number, subBusiness: string, round: number) {
  return `${year} ${subBusiness} ${round}회차 만족도 조사`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function SurveyCreator({ profile, onCreated }: SurveyCreatorProps) {
  const currentYear = new Date().getFullYear();
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() + 14);
    return end;
  }, []);

  const division = (profile.division as Division) || "사업총괄실";
  const business = profile.business?.trim() || "";
  const subBusiness = profile.subBusiness?.trim() || "";
  const programType = (profile.programType as ProgramType) || "교육·인력양성형";

  const [year, setYear] = useState(currentYear);
  const [round, setRound] = useState(1);
  const [startsAt, setStartsAt] = useState(toDateInputValue(today));
  const [endsAt, setEndsAt] = useState(toDateInputValue(defaultEnd));
  const [targetResponses, setTargetResponses] = useState(80);
  const [titleOverride, setTitleOverride] = useState("");
  const [showAdvancedQuestions, setShowAdvancedQuestions] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>(getDefaultSelectedQuestionIds(programType));
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const respondentType: RespondentType = resolveRespondentTypeForProgram(programType);
  const autoTitle = buildAutoTitle(year, subBusiness || "세부사업", round);
  const title = titleOverride.trim() || autoTitle;

  const commonKpi = useMemo(() => getCommonKpiQuestions(), []);
  const pool = useMemo(() => getQuestionPool(programType), [programType]);
  const corePool = useMemo(() => pool.filter((question) => question.tier === "core"), [pool]);
  const extendedPool = useMemo(() => pool.filter((question) => question.tier !== "core"), [pool]);
  const coreGrouped = useMemo(() => groupQuestionsByCategory(corePool), [corePool]);
  const extendedGrouped = useMemo(() => groupQuestionsByCategory(extendedPool), [extendedPool]);
  const previewCount = useMemo(
    () => buildSurveyQuestions(programType, respondentType, selectedIds).length,
    [programType, respondentType, selectedIds],
  );

  useEffect(() => {
    setSelectedIds(getDefaultSelectedQuestionIds(programType));
  }, [programType]);

  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    for (const group of [...coreGrouped, ...extendedGrouped]) {
      defaults[group.category] = true;
    }
    setOpenCategories(defaults);
  }, [coreGrouped, extendedGrouped]);

  const periodLabel = programType.includes("교육")
    ? "교육 기간"
    : programType.includes("행사")
      ? "행사 기간"
      : "운영 기간";

  function applyPreset(mode: "core" | "all" | "clear") {
    if (mode === "core") {
      setSelectedIds(getDefaultSelectedQuestionIds(programType));
      return;
    }
    if (mode === "all") {
      setSelectedIds(getAllTypeQuestionIds(programType));
      return;
    }
    setSelectedIds([]);
  }

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleCategory(ids: string[], selectAll: boolean) {
    setSelectedIds((prev) => {
      if (selectAll) {
        return Array.from(new Set([...prev, ...ids]));
      }
      const remove = new Set(ids);
      return prev.filter((id) => !remove.has(id));
    });
  }

  function toggleCategoryOpen(category: string) {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  async function handleCreate() {
    if (!business || !subBusiness) {
      setStatus("담당 사업 프로필이 비어 있습니다. 먼저 프로필을 저장해 주세요.");
      return;
    }

    if (!startsAt || !endsAt) {
      setStatus(`${periodLabel}을 입력해 주세요.`);
      return;
    }

    if (new Date(endsAt) < new Date(startsAt)) {
      setStatus("종료일은 시작일 이후여야 합니다.");
      return;
    }

    setIsSubmitting(true);
    setStatus("설문을 생성하는 중입니다.");

    try {
      const response = await authFetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          division,
          business,
          subBusiness,
          programType,
          respondentType,
          year,
          round,
          targetResponses,
          startsAt,
          endsAt,
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
    <section className="grid gap-6">
      <div className="panel p-6">
        <p className="label-machined text-[var(--text-muted)]">Create Survey</p>
        <h2 className="mt-3 text-2xl font-black uppercase">빠른 설문 생성</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          가입 시 등록한 사업 정보가 자동 연동됩니다. 회차와 {periodLabel}만 확인하면 됩니다.
        </p>

        <div className="mt-6 grid gap-3 border border-[var(--hairline)] bg-[var(--surface-soft)] p-4 md:grid-cols-2">
          <InfoRow label="본부" value={division} />
          <InfoRow label="사업유형" value={programType} />
          <InfoRow label="담당 사업" value={business} />
          <InfoRow label="세부사업" value={subBusiness} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="연도">
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
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
          <Field label={`${periodLabel} 시작`}>
            <input
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
          </Field>
          <Field label={`${periodLabel} 종료`}>
            <input
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
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
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="설문 제목 (비우면 자동 생성)">
              <input
                value={titleOverride}
                onChange={(event) => setTitleOverride(event.target.value)}
                placeholder={autoTitle}
                className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
              />
            </Field>
            <p className="mt-2 text-xs text-[var(--text-muted)]">자동 제목 미리보기: {title}</p>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Questions</p>
            <h3 className="mt-2 text-xl font-bold">문항 구성</h3>
            <p className="mt-2 text-sm text-[var(--text-body)]">
              공통 KPI는 고정 · 유형 기본세트는 이미 선택됨 · 필요 시만 조정
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PresetButton label="기본세트" onClick={() => applyPreset("core")} />
            <PresetButton label="유형 전체" onClick={() => applyPreset("all")} />
            <PresetButton
              label={showAdvancedQuestions ? "문항 접기" : "문항 세부 조정"}
              onClick={() => setShowAdvancedQuestions((prev) => !prev)}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SummaryCard label="공통 KPI" value={`${commonKpi.length}문항`} hint="자동 포함 · 고정" />
          <SummaryCard
            label="유형 선택"
            value={`${selectedIds.length}/${pool.length}`}
            hint="기본세트 권장"
          />
          <SummaryCard label="참여자 최종" value={`${previewCount}문항`} hint="일반사항 포함" />
        </div>

        <div className="mt-6 rounded border border-[var(--hairline)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">공통 KPI 고정</Badge>
            <span className="text-sm text-[var(--text-body)]">만족도·절차·응대·NPS 등 취합 기준 문항</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {commonKpi.map((question) => (
              <span
                key={question.id}
                className="border border-[var(--hairline)] px-3 py-2 text-xs text-[var(--text-body)]"
              >
                {question.label.replace(/\?$/, "").slice(0, 18)}
              </span>
            ))}
          </div>
        </div>

        {showAdvancedQuestions ? (
          <div className="mt-6 space-y-4">
            <QuestionAccordion
              title="유형 기본세트"
              hint="사업 분석에 필요한 핵심 문항"
              groups={coreGrouped}
              selectedIds={selectedIds}
              openCategories={openCategories}
              onToggleOpen={toggleCategoryOpen}
              onToggleQuestion={toggleQuestion}
              onToggleCategory={toggleCategory}
            />
            {extendedGrouped.length > 0 ? (
              <QuestionAccordion
                title="유형 확장 문항"
                hint="필요할 때만 추가"
                groups={extendedGrouped}
                selectedIds={selectedIds}
                openCategories={openCategories}
                onToggleOpen={toggleCategoryOpen}
                onToggleQuestion={toggleQuestion}
                onToggleCategory={toggleCategory}
              />
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            기본세트로 바로 생성할 수 있습니다. 문항을 바꾸려면 &quot;문항 세부 조정&quot;을 누르세요.
          </p>
        )}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleCreate()}
          className="focus-ring label-machined mt-8 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
        >
          {isSubmitting ? "생성 중" : "설문 생성"}
        </button>
        {status ? <p className="mt-4 text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>
    </section>
  );
}

function QuestionAccordion({
  title,
  hint,
  groups,
  selectedIds,
  openCategories,
  onToggleOpen,
  onToggleQuestion,
  onToggleCategory,
}: {
  title: string;
  hint: string;
  groups: Array<{ category: string; items: Question[] }>;
  selectedIds: string[];
  openCategories: Record<string, boolean>;
  onToggleOpen: (category: string) => void;
  onToggleQuestion: (id: string) => void;
  onToggleCategory: (ids: string[], selectAll: boolean) => void;
}) {
  return (
    <div className="border border-[var(--hairline)]">
      <div className="border-b border-[var(--hairline)] p-4">
        <p className="label-machined text-[var(--text-muted)]">{title}</p>
        <p className="mt-2 text-sm text-[var(--text-body)]">{hint}</p>
      </div>
      <div className="divide-y divide-[var(--hairline)]">
        {groups.map((group) => {
          const ids = group.items.map((item) => item.id);
          const selectedCount = ids.filter((id) => selectedIds.includes(id)).length;
          const allSelected = selectedCount === ids.length;
          const isOpen = openCategories[group.category] ?? true;

          return (
            <div key={group.category}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button type="button" onClick={() => onToggleOpen(group.category)} className="text-left">
                  <p className="font-bold text-white">{group.category}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {selectedCount}/{ids.length} 선택 · {isOpen ? "접기" : "펼치기"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCategory(ids, !allSelected)}
                  className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
                >
                  {allSelected ? "카테고리 해제" : "카테고리 전체"}
                </button>
              </div>
              {isOpen ? (
                <div className="space-y-2 px-4 pb-4">
                  {group.items.map((question) => (
                    <label
                      key={question.id}
                      className="flex cursor-pointer items-start gap-3 border border-[var(--hairline)] bg-[var(--surface-soft)] p-3 text-sm leading-6 text-[var(--text-body)]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(question.id)}
                        onChange={() => onToggleQuestion(question.id)}
                        className="mt-1"
                      />
                      <span className="flex-1">
                        <span className="text-white">{question.label}</span>
                        <span className="mt-2 flex flex-wrap gap-2">
                          {question.group === "지침" ? <Badge tone="info">지침</Badge> : null}
                          {question.tier === "core" ? <Badge tone="success">기본</Badge> : <Badge>확장</Badge>}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-white">{value || "-"}</p>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border border-[var(--hairline)] p-4">
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
    </div>
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

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
    >
      {label}
    </button>
  );
}
