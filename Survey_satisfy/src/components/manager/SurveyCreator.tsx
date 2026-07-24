"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CustomQuestionsEditor } from "@/components/manager/CustomQuestionsEditor";
import { DatePickerField } from "@/components/manager/DatePickerField";
import { Field } from "@/components/ui/FormField";
import { QuestionPicker } from "@/components/manager/QuestionPicker";
import { SurveyPhonePreview } from "@/components/manager/SurveyPhonePreview";
import { authFetch } from "@/lib/auth/access";
import { parseQuestions, splitStoredSurveyQuestions } from "@/lib/surveys/utils";
import type { AuthUser } from "@/lib/auth/types";
import type { Division, ProgramType, Question, RespondentType } from "@/types/platform";
import type { SurveyRow, SurveyTemplateRow } from "@/lib/supabase/database.types";

interface SurveyCreatorProps {
  profile: AuthUser;
  onCreated: (survey: SurveyRow) => void;
  onCancel?: () => void;
  cloneSource?: SurveyRow | null;
}

function buildAutoTitle(year: number, subBusiness: string, round: number) {
  return `${year} ${subBusiness} ${round}회차 만족도 조사`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDefaultOpenCategories(programType: ProgramType) {
  const defaults: Record<string, boolean> = {};
  for (const group of groupQuestionsByCategory(getQuestionPool(programType))) {
    defaults[group.category] = true;
  }
  return defaults;
}

function parseSelectedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

export function SurveyCreator({ profile, onCreated, onCancel, cloneSource }: SurveyCreatorProps) {
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() =>
    buildDefaultOpenCategories(programType),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(getDefaultSelectedQuestionIds(programType));
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [templates, setTemplates] = useState<SurveyTemplateRow[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [activeTemplateLabel, setActiveTemplateLabel] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const respondentType: RespondentType = resolveRespondentTypeForProgram(programType);
  const autoTitle = buildAutoTitle(year, subBusiness || "세부사업", round);
  const title = titleOverride.trim() || autoTitle;

  const commonKpi = useMemo(() => getCommonKpiQuestions(respondentType), [respondentType]);
  const pool = useMemo(() => getQuestionPool(programType), [programType]);
  const corePool = useMemo(() => pool.filter((question) => question.tier === "core"), [pool]);
  const extendedPool = useMemo(() => pool.filter((question) => question.tier !== "core"), [pool]);
  const coreGrouped = useMemo(() => groupQuestionsByCategory(corePool), [corePool]);
  const extendedGrouped = useMemo(() => groupQuestionsByCategory(extendedPool), [extendedPool]);
  const previewQuestions = useMemo(
    () => buildSurveyQuestions(programType, respondentType, selectedIds, customQuestions),
    [programType, respondentType, selectedIds, customQuestions],
  );
  const previewCount = previewQuestions.length;

  const loadTemplates = useCallback(async () => {
    if (!business || !subBusiness) {
      setTemplates([]);
      return;
    }

    try {
      const params = new URLSearchParams({ business, subBusiness, programType });
      const response = await authFetch(`/api/survey-templates?${params.toString()}`);
      const data = (await response.json()) as { ok: boolean; rows?: SurveyTemplateRow[]; error?: string };
      if (response.ok && data.ok) {
        setTemplates(data.rows ?? []);
      }
    } catch {
      // 템플릿 로드 실패는 설문 생성을 막지 않음
    }
  }, [business, subBusiness, programType]);

  useEffect(() => {
    setSelectedIds(getDefaultSelectedQuestionIds(programType));
    setCustomQuestions([]);
    setSelectedTemplateId("");
    setActiveTemplateLabel("");
  }, [programType]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // 같은 사업·세부사업의 기존 설문이 있으면 회차를 자동으로 다음 차순으로 (복제 중이면 건너뜀)
  useEffect(() => {
    if (cloneSource || !business || !subBusiness) {
      return;
    }
    const controller = new AbortController();
    authFetch("/api/surveys", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { ok: boolean; rows?: SurveyRow[] }) => {
        if (!data.ok || !data.rows) {
          return;
        }
        const rounds = data.rows
          .filter((s) => s.business?.trim() === business && s.sub_business?.trim() === subBusiness)
          .map((s) => s.round ?? 0);
        if (rounds.length > 0) {
          setRound(Math.max(...rounds) + 1);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [business, subBusiness, cloneSource]);

  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    for (const group of [...coreGrouped, ...extendedGrouped]) {
      defaults[group.category] = true;
    }
    setOpenCategories(defaults);
  }, [coreGrouped, extendedGrouped]);

  useEffect(() => {
    if (!cloneSource) {
      return;
    }

    const nextRound = (cloneSource.round ?? 1) + 1;
    const cloneYear = cloneSource.year ?? currentYear;
    const { selectedQuestionIds, customQuestions: clonedCustom } = splitStoredSurveyQuestions(
      cloneSource.custom_questions,
    );

    setRound(nextRound);
    setYear(cloneYear);
    setTargetResponses(cloneSource.target_responses ?? 80);
    setTitleOverride("");
    setSelectedIds(
      selectedQuestionIds.length > 0 ? selectedQuestionIds : getDefaultSelectedQuestionIds(programType),
    );
    setCustomQuestions(clonedCustom);
    setShowAdvancedQuestions(false);
    setStatus(
      `이전 ${cloneSource.round ?? 1}회차 설문의 문항을 불러왔습니다. 회차·기간을 확인하고 생성하세요.`,
    );
  }, [cloneSource, currentYear, programType]);

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

  function applyTemplate(template: SurveyTemplateRow) {
    setSelectedIds(parseSelectedIds(template.selected_question_ids));
    setCustomQuestions(parseQuestions(template.custom_questions));
    setSelectedTemplateId(template.id);
    setActiveTemplateLabel(template.name);
    setTemplateName(template.name);
    setStatus(`템플릿 "${template.name}" 문항을 불러왔습니다. 회차·기간만 확인하세요.`);
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

  function validateForm(): boolean {
    if (!business || !subBusiness) {
      setStatus("담당 사업 프로필이 비어 있습니다. 먼저 프로필을 저장해 주세요.");
      return false;
    }
    if (!startsAt || !endsAt) {
      setStatus("설문 시작일과 종료일을 입력해 주세요.");
      return false;
    }
    if (new Date(endsAt) < new Date(startsAt)) {
      setStatus("종료일은 시작일 이후여야 합니다.");
      return false;
    }
    return true;
  }

  async function handleSaveTemplate() {
    const name = templateName.trim() || `${subBusiness || "사업"} 기본 문항`;
    if (!business || !subBusiness) {
      setStatus("담당 사업 프로필이 비어 있습니다. 먼저 프로필을 저장해 주세요.");
      return;
    }

    setIsSavingTemplate(true);
    setStatus("템플릿을 저장하는 중입니다.");

    try {
      const response = await authFetch("/api/survey-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          division,
          business,
          subBusiness,
          programType,
          respondentType,
          selectedQuestionIds: selectedIds,
          customQuestions,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        template?: SurveyTemplateRow;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.template) {
        setStatus(data.error ?? "템플릿 저장에 실패했습니다.");
        return;
      }

      setStatus(`템플릿 "${data.template.name}"을 저장했습니다. 다음 회차에 바로 불러올 수 있습니다.`);
      setSelectedTemplateId(data.template.id);
      setActiveTemplateLabel(data.template.name);
      await loadTemplates();
    } catch {
      setStatus("템플릿 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      const response = await authFetch(`/api/survey-templates?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "템플릿 삭제에 실패했습니다.");
        return;
      }
      if (selectedTemplateId === id) {
        setSelectedTemplateId("");
        setActiveTemplateLabel("");
      }
      setStatus("템플릿을 삭제했습니다.");
      await loadTemplates();
    } catch {
      setStatus("템플릿 삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleCreate() {
    if (!validateForm()) {
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
          customQuestions,
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
    <section className="grid gap-6 pb-28">
      <div className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Create Survey</p>
            <h2 className="mt-3 text-2xl font-black uppercase">빠른 설문 생성</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
              회차·기간을 정하고 바로 생성하세요. 동일 사업은 템플릿으로 문항을 재사용할 수 있습니다.
            </p>
          </div>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="focus-ring label-machined text-xs text-[var(--text-muted)] underline-offset-4 hover:text-white hover:underline"
            >
              목록으로
            </button>
          ) : null}
        </div>
        {status ? <p className="mt-4 text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>

      <div className="panel p-4 sm:p-6">
        <h3 className="text-xl font-bold">회차·설문 기간</h3>

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
              className="focus-ring min-h-12 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
          </Field>
          <Field label="회차">
            <input
              type="number"
              min={1}
              value={round}
              onChange={(event) => setRound(Number(event.target.value))}
              className="focus-ring min-h-12 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
          </Field>
          <div>
            <DatePickerField
              label="설문 시작일"
              value={startsAt}
              max={endsAt || undefined}
              onChange={setStartsAt}
            />
            <p className="mt-2 text-xs text-[var(--text-muted)]">담당자가 수동으로 설정합니다.</p>
          </div>
          <div>
            <DatePickerField
              label="설문 종료일"
              value={endsAt}
              min={startsAt || undefined}
              onChange={setEndsAt}
            />
            <p className="mt-2 text-xs text-[var(--text-muted)]">담당자가 수동으로 설정합니다.</p>
          </div>
          <Field label="목표 응답수">
            <input
              type="number"
              min={1}
              value={targetResponses}
              onChange={(event) => setTargetResponses(Number(event.target.value))}
              className="focus-ring min-h-12 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
            />
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="설문 제목 (비우면 자동 생성)">
              <input
                value={titleOverride}
                onChange={(event) => setTitleOverride(event.target.value)}
                placeholder={autoTitle}
                className="focus-ring min-h-12 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
              />
            </Field>
            <p className="mt-2 text-xs text-[var(--text-muted)]">자동 제목 미리보기: {title}</p>
          </div>
        </div>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">문항 템플릿</h3>
          {activeTemplateLabel ? <Badge tone="warning">적용중: {activeTemplateLabel}</Badge> : null}
        </div>

        {templates.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-2 border border-[var(--hairline)] px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="focus-ring text-sm font-bold text-white hover:underline"
                >
                  {template.name}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteTemplate(template.id)}
                  className="focus-ring label-machined text-[10px] text-[var(--text-muted)] hover:text-white"
                  aria-label={`${template.name} 삭제`}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-muted)]">저장된 템플릿이 없습니다.</p>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Field label="새 템플릿 이름">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={`${subBusiness || "세부사업"} 기본 문항`}
                className="focus-ring min-h-11 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-sm text-white"
              />
            </Field>
          </div>
          <button
            type="button"
            disabled={isSavingTemplate}
            onClick={() => void handleSaveTemplate()}
            className="focus-ring label-machined min-h-11 h-11 border border-[var(--hairline)] px-4 text-[var(--text-body)] hover:border-white hover:text-white disabled:opacity-50"
          >
            {isSavingTemplate ? "저장 중" : "현재 문항 저장"}
          </button>
        </div>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">문항 구성</h3>
            <p className="mt-2 text-sm text-[var(--text-body)]">
              공통 KPI는 고정입니다. 추천 문항으로 바로 생성하거나 세부 조정하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PresetButton label="추천 문항만" onClick={() => applyPreset("core")} />
            <PresetButton label="유형 전체" onClick={() => applyPreset("all")} />
            <PresetButton
              label={showAdvancedQuestions ? "문항 접기" : "문항 세부 조정"}
              onClick={() => setShowAdvancedQuestions((prev) => !prev)}
            />
            <PresetButton label="미리보기" onClick={() => setShowPreview(true)} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 border border-[var(--hairline)] p-4 text-sm text-[var(--text-body)] md:grid-cols-3">
          <LegendItem title="핵심 문항" body="사업유형별 기본 문항 (기본 선택)" />
          <LegendItem title="추가 선택" body="필요할 때만 더하는 선택 문항" />
          <LegendItem title="공통 고정" body="모든 설문 마지막에 자동 배치되는 공통 문항" />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <SummaryCard label="공통 고정" value={`${commonKpi.length}문항`} hint="자동 포함 · 마지막 배치" />
          <SummaryCard label="유형 선택" value={`${selectedIds.length}/${pool.length}`} hint="핵심 문항 포함 권장" />
          <SummaryCard label="직접 추가" value={`${customQuestions.length}문항`} hint="템플릿 저장 가능" />
          <SummaryCard label="참여자 최종" value={`${previewCount}문항`} hint="공통 고정 포함" />
        </div>

        <div className="mt-6 rounded border border-[var(--hairline)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">공통 고정 문항</Badge>
            <span className="text-sm text-[var(--text-body)]">참여횟수·경로·전반만족·추천의향 등 설문 마지막 자동 배치</span>
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
            <QuestionPicker
              title="추천 포함 문항"
              hint="사업 분석에 필요한 핵심 문항 · 박스 클릭 / Shift 구간 / 드래그 다중 선택"
              groups={coreGrouped}
              selectedIds={selectedIds}
              openCategories={openCategories}
              onToggleOpen={toggleCategoryOpen}
              onSetSelectedIds={setSelectedIds}
              onToggleCategory={toggleCategory}
            />
            {extendedGrouped.length > 0 ? (
              <QuestionPicker
                title="추가 선택 문항"
                hint="필요할 때만 더하세요 · 선택 해제로 삭제와 동일"
                groups={extendedGrouped}
                selectedIds={selectedIds}
                openCategories={openCategories}
                onToggleOpen={toggleCategoryOpen}
                onSetSelectedIds={setSelectedIds}
                onToggleCategory={toggleCategory}
              />
            ) : null}
            <CustomQuestionsEditor questions={customQuestions} onChange={setCustomQuestions} />
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            추천 포함 문항으로 바로 생성할 수 있습니다. 추가·삭제·직접 문항은 &quot;문항 세부 조정&quot;을
            누르세요.
          </p>
        )}
      </div>

      {showPreview ? (
        <SurveyPhonePreview title={title} questions={previewQuestions} onClose={() => setShowPreview(false)} />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hairline)] bg-[var(--surface)]/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:sticky sm:inset-x-auto sm:bottom-0 sm:z-10 sm:mt-2 sm:border sm:border-[var(--hairline)] sm:bg-[var(--surface-soft)] sm:pb-3 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl justify-end px-4 sm:px-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleCreate()}
            className="focus-ring label-machined min-h-12 border border-white px-8 text-white hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
          >
            {isSubmitting ? "생성 중" : "설문 생성"}
          </button>
        </div>
      </div>
    </section>
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

function LegendItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-bold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{body}</p>
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

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-3 py-2 text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
    >
      {label}
    </button>
  );
}
