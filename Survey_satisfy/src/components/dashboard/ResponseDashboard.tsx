"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth/access";
import { downloadResponsesCsv } from "@/lib/csv";
import {
  aggregateByCategory,
  aggregateByCommonKpi,
  aggregateByDivision,
  aggregateByProgramType,
  aggregateMetrics,
} from "@/lib/dashboard/aggregate";
import { parseQuestions } from "@/lib/surveys/utils";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question } from "@/types/platform";
import { KpiBarChart } from "@/components/dashboard/KpiBarChart";
import { Field } from "@/components/ui/FormField";
import { StatCard } from "@/components/ui/StatCard";

interface ResponseDashboardProps {
  mode: "staff" | "admin";
  initialSurveyId?: string;
  questions?: Question[];
}

interface SurveyOption {
  id: string;
  title: string;
  sub_business: string;
  division: string;
  program_type: string;
  target_responses: number;
  year?: number;
  custom_questions?: unknown;
}

export function ResponseDashboard({ mode, initialSurveyId, questions: initialQuestions }: ResponseDashboardProps) {
  const [rows, setRows] = useState<SurveyResponseRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(initialSurveyId ?? "");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgramType, setSelectedProgramType] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void authFetch("/api/surveys")
      .then((response) => response.json())
      .then((data: { ok: boolean; rows?: SurveyOption[] }) => {
        if (data.ok && data.rows) {
          setSurveys(data.rows);
          if (initialSurveyId) {
            setSelectedSurveyId(initialSurveyId);
          } else if (data.rows[0]) {
            setSelectedSurveyId(data.rows[0].id);
          }
        }
      })
      .catch(() => setStatus("설문 목록을 불러오지 못했습니다. 새로고침해 주세요."));
  }, [initialSurveyId]);

  useEffect(() => {
    // 필터를 빠르게 바꿀 때 이전 요청이 나중에 도착해 화면을 덮어쓰지 않도록 요청을 취소
    const controller = new AbortController();

    async function loadResponses() {
      setIsLoading(true);
      setStatus("Supabase 응답 데이터를 불러오는 중입니다.");

      const params = new URLSearchParams();

      if (mode === "staff" && selectedSurveyId) {
        params.set("survey_id", selectedSurveyId);
      }

      if (mode === "admin" && selectedDivision) {
        params.set("division", selectedDivision);
      }

      if (mode === "admin" && selectedProgramType) {
        params.set("program_type", selectedProgramType);
      }

      try {
        const response = await authFetch(`/api/survey-responses?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { ok: boolean; rows?: SurveyResponseRow[]; error?: string };

        if (!response.ok || !data.ok) {
          setStatus(data.error ?? "데이터 조회에 실패했습니다.");
          return;
        }

        setRows(data.rows ?? []);
        setStatus(`${data.rows?.length ?? 0}건의 응답을 불러왔습니다.`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setStatus("데이터 조회 중 오류가 발생했습니다.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadResponses();

    return () => controller.abort();
  }, [selectedSurveyId, selectedDivision, selectedProgramType, mode, reloadKey]);

  const yearFilteredSurveys = useMemo(() => {
    if (!selectedYear) {
      return surveys;
    }

    return surveys.filter((survey) => String(survey.year ?? "") === selectedYear);
  }, [surveys, selectedYear]);

  const yearScopedSurveyIds = useMemo(
    () => new Set(yearFilteredSurveys.map((survey) => survey.id)),
    [yearFilteredSurveys],
  );

  const filteredRows = useMemo(() => {
    if (mode !== "admin" || !selectedYear) {
      return rows;
    }

    return rows.filter((row) => yearScopedSurveyIds.has(row.survey_id));
  }, [mode, selectedYear, rows, yearScopedSurveyIds]);

  const activeQuestions = useMemo(() => {
    if (initialQuestions?.length) {
      return initialQuestions;
    }

    const selected = surveys.find((survey) => survey.id === selectedSurveyId);
    return parseQuestions(selected?.custom_questions);
  }, [initialQuestions, selectedSurveyId, surveys]);

  const targetResponses = useMemo(() => {
    if (mode === "staff") {
      return surveys.find((survey) => survey.id === selectedSurveyId)?.target_responses ?? 80;
    }

    const scoped = selectedYear ? yearFilteredSurveys : surveys;
    const total = scoped.reduce((sum, survey) => sum + (survey.target_responses ?? 0), 0);
    return total > 0 ? total : 80;
  }, [mode, selectedSurveyId, surveys, selectedYear, yearFilteredSurveys]);

  const metrics = useMemo(() => aggregateMetrics(filteredRows, targetResponses), [filteredRows, targetResponses]);
  const divisionChartData = useMemo(() => aggregateByDivision(filteredRows), [filteredRows]);
  const programTypeChartData = useMemo(() => aggregateByProgramType(filteredRows), [filteredRows]);
  const categoryChartData = useMemo(
    () => aggregateByCategory(filteredRows, activeQuestions),
    [filteredRows, activeQuestions],
  );
  const commonKpiChartData = useMemo(
    () => aggregateByCommonKpi(filteredRows, activeQuestions),
    [filteredRows, activeQuestions],
  );

  const chartData = useMemo(() => {
    if (mode === "admin") {
      return divisionChartData.map((item) => {
        const group = filteredRows.filter((row) => row.division === item.name);
        return {
          ...item,
          responseRate: aggregateMetrics(group, targetResponses).responseRate,
        };
      });
    }

    const selectedSurvey = surveys.find((survey) => survey.id === selectedSurveyId);

    if (!selectedSurvey) {
      return [];
    }

    return [
      {
        name: selectedSurvey.sub_business,
        satisfaction: metrics.satisfaction,
        responseCount: metrics.responseCount,
        responseRate: metrics.responseRate,
      },
    ];
  }, [mode, divisionChartData, filteredRows, targetResponses, surveys, selectedSurveyId, metrics]);

  const divisionOptions = useMemo(
    () => Array.from(new Set(yearFilteredSurveys.map((survey) => survey.division))),
    [yearFilteredSurveys],
  );

  const programTypeOptions = useMemo(
    () => Array.from(new Set(yearFilteredSurveys.map((survey) => survey.program_type))),
    [yearFilteredSurveys],
  );

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(surveys.map((survey) => survey.year ?? new Date().getFullYear()))).sort(
        (a, b) => b - a,
      ),
    [surveys],
  );

  function handleDownload() {
    const label =
      mode === "staff"
        ? surveys.find((survey) => survey.id === selectedSurveyId)?.sub_business ?? "설문"
        : [selectedYear, selectedDivision, selectedProgramType].filter(Boolean).join("_") || "전체";

    downloadResponsesCsv(filteredRows, `CCON_설문결과_${label}.csv`);
  }

  return (
    <section className="grid gap-6">
      <div className="panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Supabase Live Data</p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              {mode === "staff" ? "담당 설문 실시간 KPI" : "본부·사업유형 KPI"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setReloadKey((key) => key + 1)}
              className="focus-ring label-machined border border-white px-5 py-3 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              새로고침
            </button>
            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={handleDownload}
              className="focus-ring label-machined border border-[var(--hairline)] px-5 py-3 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:opacity-50"
            >
              CSV 다운로드
            </button>
          </div>
        </div>

        <div className={`mt-6 grid gap-4 ${mode === "admin" ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
          {mode === "staff" ? (
            <Field label="세부사업 / 설문회차">
              <select
                value={selectedSurveyId}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
                className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
              >
                {surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.sub_business} · {survey.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="연도">
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                >
                  <option value="">전체</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}년
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="본부">
                <select
                  value={selectedDivision}
                  onChange={(event) => setSelectedDivision(event.target.value)}
                  className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                >
                  <option value="">전체</option>
                  {divisionOptions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="사업유형">
                <select
                  value={selectedProgramType}
                  onChange={(event) => setSelectedProgramType(event.target.value)}
                  className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                >
                  <option value="">전체</option>
                  {programTypeOptions.map((programType) => (
                    <option key={programType} value={programType}>
                      {programType}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>

        {status ? <p className="mt-5 text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="응답수" value={`${metrics.responseCount}`} caption="현재 필터 기준" />
        <StatCard label="응답률(완료율)" value={`${metrics.responseRate}%`} caption={`목표 ${targetResponses}건`} tone="success" />
        <StatCard label="만족도" value={`${metrics.satisfaction}`} caption="리커트 전체 5점 평균" tone="success" />
        <StatCard label="추천 의향" value={`${metrics.recommendation}`} caption="공통 문항 추천 평균 (5점)" />
      </section>

      <section className="panel p-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Common KPI Detail</p>
            <h2 className="mt-2 text-2xl font-black uppercase">공통 문항별 평균</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)]">취합·비교 기준</p>
        </div>
        <div className="h-72">
          <KpiBarChart
            data={commonKpiChartData}
            fill="#c8f542"
            angledLabels
            emptyText="공통 문항 응답이 아직 없습니다. (신규 생성 설문부터 적용)"
          />
        </div>
      </section>

      <section className="panel p-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Satisfaction KPI</p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              {mode === "admin" ? "본부별 만족도" : "담당 설문 만족도"}
            </h2>
          </div>
          <p className="text-sm text-[var(--text-muted)]">단위: 5점</p>
        </div>
        <div className="h-72">
          <KpiBarChart data={chartData} />
        </div>
      </section>

      {mode === "staff" && categoryChartData.length > 0 ? (
        <section className="panel p-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="label-machined text-[var(--text-muted)]">Category KPI</p>
              <h2 className="mt-2 text-2xl font-black uppercase">카테고리별 만족도</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)]">단위: 5점</p>
          </div>
          <div className="h-72">
            <KpiBarChart data={categoryChartData} fill="#2f7dff" />
          </div>
        </section>
      ) : null}

      {mode === "admin" && programTypeChartData.length > 0 ? (
        <section className="panel p-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="label-machined text-[var(--text-muted)]">Program Type KPI</p>
              <h2 className="mt-2 text-2xl font-black uppercase">사업유형별 만족도</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)]">단위: 5점</p>
          </div>
          <div className="h-72">
            <KpiBarChart data={programTypeChartData} />
          </div>
        </section>
      ) : null}

      <section className="panel p-6">
        <div className="mb-8">
          <p className="label-machined text-[var(--text-muted)]">Completion Rate</p>
          <h2 className="mt-2 text-2xl font-black uppercase">응답률(완료율)</h2>
        </div>
        <div className="h-72">
          <KpiBarChart data={chartData} dataKey="responseRate" fill="#2f7dff" domainMax={100} />
        </div>
      </section>
    </section>
  );
}

