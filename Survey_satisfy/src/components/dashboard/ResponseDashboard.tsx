"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authFetch } from "@/lib/auth/access";
import { downloadResponsesCsv } from "@/lib/csv";
import {
  aggregateByCategory,
  aggregateByCommonKpi,
  aggregateByDivision,
  aggregateByProgramType,
  aggregateByYear,
  aggregateMetrics,
} from "@/lib/dashboard/aggregate";
import { parseQuestions } from "@/lib/surveys/utils";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question } from "@/types/platform";
import { OpinionSummaryPanel } from "@/components/dashboard/OpinionSummaryPanel";
import { QuestionResultsPanel } from "@/components/dashboard/QuestionResultsPanel";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { BrandMark } from "@/components/ui/BrandMark";
import { StatCard } from "@/components/ui/StatCard";

interface ResponseDashboardProps {
  mode: "staff" | "admin";
  initialSurveyId?: string;
  questions?: Question[];
  onOpenQr?: () => void;
  surveyLabel?: string;
}

interface SurveyOption {
  id: string;
  title: string;
  business: string;
  sub_business: string;
  division: string;
  program_type: string;
  target_responses: number;
  year?: number;
  round?: number;
  custom_questions?: unknown;
}

function scoreColor(value: number, max = 5) {
  const ratio = value / max;
  if (ratio >= 0.8) return "#23b26d";
  if (ratio >= 0.6) return "#f4b400";
  return "#ff5c5c";
}

export function ResponseDashboard({
  mode,
  initialSurveyId,
  questions: initialQuestions,
  onOpenQr,
  surveyLabel,
}: ResponseDashboardProps) {
  const [rows, setRows] = useState<SurveyResponseRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(initialSurveyId ?? "");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgramType, setSelectedProgramType] = useState("");
  // 관리자 화면은 처음 진입 시 당해년도를 기본 선택
  const [selectedYear, setSelectedYear] = useState(mode === "admin" ? String(new Date().getFullYear()) : "");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
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
    // 필터를 빠르게 바꿀 때 이전 요청이 나중에 도착해 화면을 덮어쓰지 않도록 취소
    const controller = new AbortController();

    async function loadResponses() {
      setIsLoading(true);
      setStatus("응답 데이터를 불러오는 중입니다.");

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
        setStatus(`${data.rows?.length ?? 0}건의 응답`);
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
    if (!selectedYear) return surveys;
    return surveys.filter((survey) => String(survey.year ?? "") === selectedYear);
  }, [surveys, selectedYear]);

  const surveyById = useMemo(() => new Map(surveys.map((survey) => [survey.id, survey] as const)), [surveys]);

  const filteredRows = useMemo(() => {
    if (mode !== "admin" || (!selectedYear && !selectedRound && !selectedBusiness)) return rows;
    return rows.filter((row) => {
      const survey = surveyById.get(row.survey_id);
      if (!survey) return false;
      if (selectedYear && String(survey.year ?? "") !== selectedYear) return false;
      if (selectedRound && String(survey.round ?? "") !== selectedRound) return false;
      if (selectedBusiness && survey.business !== selectedBusiness) return false;
      return true;
    });
  }, [mode, selectedYear, selectedRound, selectedBusiness, rows, surveyById]);

  const activeQuestions = useMemo(() => {
    if (initialQuestions?.length) return initialQuestions;
    const selected = surveys.find((survey) => survey.id === selectedSurveyId);
    return parseQuestions(selected?.custom_questions);
  }, [initialQuestions, selectedSurveyId, surveys]);

  const selectedSurvey = useMemo(
    () => surveys.find((survey) => survey.id === selectedSurveyId),
    [surveys, selectedSurveyId],
  );

  const targetResponses = useMemo(() => {
    if (mode === "staff") {
      return selectedSurvey?.target_responses ?? 80;
    }
    const scoped = selectedYear ? yearFilteredSurveys : surveys;
    const total = scoped.reduce((sum, survey) => sum + (survey.target_responses ?? 0), 0);
    return total > 0 ? total : 80;
  }, [mode, selectedSurvey, surveys, selectedYear, yearFilteredSurveys]);

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

  const yearChartData = useMemo(() => {
    if (mode !== "admin") return [];
    const yearBySurveyId = new Map(
      surveys.map((survey) => [survey.id, survey.year ?? new Date().getFullYear()] as const),
    );
    const targetByYear = new Map<number, number>();
    for (const survey of surveys) {
      const year = survey.year ?? new Date().getFullYear();
      targetByYear.set(year, (targetByYear.get(year) ?? 0) + (survey.target_responses ?? 0));
    }
    return aggregateByYear(rows, yearBySurveyId, targetByYear);
  }, [mode, surveys, rows]);

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
    if (!selectedSurvey) return [];
    return [
      {
        name: selectedSurvey.sub_business,
        satisfaction: metrics.satisfaction,
        responseCount: metrics.responseCount,
        responseRate: metrics.responseRate,
      },
    ];
  }, [mode, divisionChartData, filteredRows, targetResponses, selectedSurvey, metrics]);

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
      Array.from(new Set(surveys.map((survey) => survey.year ?? new Date().getFullYear()))).sort((a, b) => b - a),
    [surveys],
  );
  const roundOptions = useMemo(
    () => Array.from(new Set(yearFilteredSurveys.map((survey) => survey.round ?? 1))).sort((a, b) => a - b),
    [yearFilteredSurveys],
  );
  const businessOptions = useMemo(
    () => Array.from(new Set(yearFilteredSurveys.map((survey) => survey.business).filter(Boolean))).sort(),
    [yearFilteredSurveys],
  );

  // 사업명을 고르면 그 사업의 사업유형을 자동 선택
  function handleBusinessFilterChange(value: string) {
    setSelectedBusiness(value);
    if (value) {
      const match = surveys.find((survey) => survey.business === value);
      if (match?.program_type) {
        setSelectedProgramType(match.program_type);
      }
    } else {
      setSelectedProgramType("");
    }
  }

  const isEmpty = !isLoading && metrics.responseCount === 0;
  const heroTitle =
    surveyLabel ||
    (mode === "staff"
      ? selectedSurvey
        ? `${selectedSurvey.sub_business} · ${selectedSurvey.title}`
        : "설문 결과"
      : "기관 KPI 리포트");

  function handleDownload() {
    const label =
      mode === "staff"
        ? selectedSurvey?.sub_business ?? "설문"
        : [selectedYear, selectedDivision, selectedProgramType].filter(Boolean).join("_") || "전체";
    downloadResponsesCsv(filteredRows, `CCON_설문결과_${label}.csv`);
  }

  return (
    <section className="grid gap-6">
      <div className="report-hero animate-fade-scale p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <BrandMark />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setReloadKey((key) => key + 1)}
              className="focus-ring label-machined min-h-11 border border-white px-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              새로고침
            </button>
            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={handleDownload}
              className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:opacity-50"
            >
              CSV
            </button>
          </div>
        </div>

        <p className="label-machined mt-8 text-[var(--text-muted)]">
          {mode === "staff" ? "Survey Report" : "KPI Command"}
        </p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-4xl md:text-5xl">
          {heroTitle}
        </h2>
        <p className="mt-3 text-sm text-[var(--text-body)]">
          {mode === "staff" ? "설문 결과를 한눈에 보고·공유하세요." : "본부·유형별 만족도 KPI를 관제합니다."}
        </p>

        <div className="mt-8 grid gap-6 border-t border-[var(--hairline)] pt-8 sm:grid-cols-3">
          <HeroMetric
            label="종합 만족도"
            value={metrics.satisfaction}
            decimals={2}
            suffix="/5"
            caption="5점 만점 평균"
            delay={0}
          />
          <HeroMetric
            label="응답수"
            value={metrics.responseCount}
            caption={`목표 ${targetResponses}건`}
            delay={80}
          />
          <HeroMetric
            label="목표 달성률"
            value={metrics.responseRate}
            suffix="%"
            caption="응답 완료율"
            delay={160}
          />
        </div>
      </div>

      <div className="panel animate-enter p-4 sm:p-6" style={{ animationDelay: "60ms" }}>
        <div className={`grid gap-4 ${mode === "admin" ? "grid-cols-2 md:grid-cols-5" : ""}`}>
          {mode === "staff" ? (
            !initialSurveyId ? (
              <FilterField label="설문 선택">
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
              </FilterField>
            ) : null
          ) : (
            <>
              <FilterField label="연도">
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
              </FilterField>
              <FilterField label="본부">
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
              </FilterField>
              <FilterField label="사업명">
                <select
                  value={selectedBusiness}
                  onChange={(event) => handleBusinessFilterChange(event.target.value)}
                  className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                >
                  <option value="">전체</option>
                  {businessOptions.map((business) => (
                    <option key={business} value={business}>
                      {business}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="사업유형">
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
              </FilterField>
              <FilterField label="회차">
                <select
                  value={selectedRound}
                  onChange={(event) => setSelectedRound(event.target.value)}
                  className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                >
                  <option value="">전체</option>
                  {roundOptions.map((round) => (
                    <option key={round} value={String(round)}>
                      {round}회차
                    </option>
                  ))}
                </select>
              </FilterField>
            </>
          )}
        </div>
        {status ? <p className="mt-4 text-sm text-[var(--text-muted)]">{status}</p> : null}
      </div>

      {isEmpty ? (
        <EmptyReportState mode={mode} onOpenQr={onOpenQr} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="응답수" value={`${metrics.responseCount}`} caption={`목표 ${targetResponses}건`} delay={0} />
            <StatCard label="응답률" value={`${metrics.responseRate}%`} caption="완료율" tone="success" delay={60} />
            <StatCard label="만족도" value={`${metrics.satisfaction}`} caption="5점 평균" tone="success" delay={120} />
            <StatCard label="추천" value={`${metrics.recommendation}`} caption="공통 문항 5점" delay={180} />
          </section>

          {mode === "admin" && yearChartData.length >= 2 ? (
            <ChartPanel title="연도별 비교" eyebrow="Year Over Year" hint="만족도 · 응답률" delay={80}>
              <div className="h-80 sm:h-[22rem]">
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <LineChart data={yearChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#2d2d2d" vertical={false} />
                    <XAxis dataKey="name" stroke="#bdbdbd" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="sat" domain={[0, 5]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }} />
                    <Legend />
                    <Line
                      yAxisId="sat"
                      type="monotone"
                      dataKey="satisfaction"
                      name="만족도"
                      stroke="#23b26d"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      isAnimationActive
                      animationDuration={900}
                    />
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="responseRate"
                      name="응답률%"
                      stroke="#2f7dff"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      isAnimationActive
                      animationDuration={900}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {yearChartData.map((point) => (
                  <div key={point.year} className="border border-[var(--hairline)] p-3 text-sm text-[var(--text-body)]">
                    <p className="font-bold text-white">{point.year}년</p>
                    <p className="mt-1">
                      만족 {point.satisfaction} · 응답 {point.responseCount} · 추천 {point.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </ChartPanel>
          ) : null}

          <ChartPanel title="공통 문항별 평균" eyebrow="Common KPI" hint="5점 만점 · 색=수준" delay={100}>
            <div className="h-[380px] sm:h-[440px]">
              {commonKpiChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <BarChart data={commonKpiChartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid stroke="#2d2d2d" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      stroke="#bdbdbd"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }}
                    />
                    <Bar dataKey="satisfaction" radius={0} barSize={22} isAnimationActive animationDuration={900}>
                      {commonKpiChartData.map((entry) => (
                        <Cell key={entry.name} fill={scoreColor(entry.satisfaction)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="공통 문항 응답이 아직 없습니다. (신규 생성 설문부터 적용)" />
              )}
            </div>
          </ChartPanel>

          {commonKpiChartData.length > 2 ? (
            <ChartPanel title="공통 문항 한눈에" eyebrow="Radar" delay={160} className="hidden md:block">
              <div className="mx-auto h-[360px] max-w-xl sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={commonKpiChartData}>
                    <PolarGrid stroke="#3a3a3a" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: "#bdbdbd", fontSize: 11 }} />
                    <Radar
                      dataKey="satisfaction"
                      stroke="#ffffff"
                      fill="#2f7dff"
                      fillOpacity={0.35}
                      isAnimationActive
                      animationDuration={1100}
                    />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          ) : null}

          <ChartPanel
            title={mode === "admin" ? "본부별 만족도" : "이번 설문 만족도"}
            eyebrow="Satisfaction"
            delay={200}
          >
            <div className="h-80 sm:h-[22rem]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#2d2d2d" vertical={false} />
                    <XAxis dataKey="name" stroke="#bdbdbd" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 5]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }} />
                    <Bar dataKey="satisfaction" radius={0} barSize={48} isAnimationActive animationDuration={900}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={scoreColor(entry.satisfaction)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="표시할 응답 데이터가 없습니다." />
              )}
            </div>
          </ChartPanel>

          {mode === "staff" && categoryChartData.length > 0 ? (
            <ChartPanel title="카테고리별 만족도" eyebrow="Category" delay={240}>
              <div className="h-80 sm:h-[22rem]">
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke="#2d2d2d" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={96}
                      stroke="#bdbdbd"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }} />
                    <Bar dataKey="satisfaction" radius={0} barSize={20} isAnimationActive animationDuration={900}>
                      {categoryChartData.map((entry) => (
                        <Cell key={entry.name} fill={scoreColor(entry.satisfaction)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          ) : null}

          {mode === "admin" && programTypeChartData.length > 0 ? (
            <ChartPanel title="사업유형별 만족도" eyebrow="Program Type" delay={260} className="hidden md:block">
              <div className="h-80 sm:h-[22rem]">
                <ResponsiveContainer width="100%" height="100%" minWidth={320}>
                  <BarChart data={programTypeChartData}>
                    <CartesianGrid stroke="#2d2d2d" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#bdbdbd"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis domain={[0, 5]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }} />
                    <Bar dataKey="satisfaction" radius={0} isAnimationActive animationDuration={900}>
                      {programTypeChartData.map((entry) => (
                        <Cell key={entry.name} fill={scoreColor(entry.satisfaction)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          ) : null}

          <ChartPanel title="응답률" eyebrow="Response Rate" delay={280}>
            <div className="h-72 sm:h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="#2d2d2d" vertical={false} />
                    <XAxis dataKey="name" stroke="#bdbdbd" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#7d7d7d" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #3a3a3a" }} />
                    <Bar
                      dataKey="responseRate"
                      fill="#2f7dff"
                      radius={0}
                      barSize={48}
                      isAnimationActive
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="표시할 응답 데이터가 없습니다." />
              )}
            </div>
          </ChartPanel>

          <OpinionSummaryPanel rows={filteredRows} questions={activeQuestions} />

          <QuestionResultsPanel rows={filteredRows} questions={activeQuestions} />
        </>
      )}
    </section>
  );
}

function HeroMetric({
  label,
  value,
  decimals = 0,
  suffix = "",
  caption,
  delay = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  caption: string;
  delay?: number;
}) {
  return (
    <div className="animate-stagger" style={{ ["--stagger" as string]: `${delay}ms` }}>
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl">
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </p>
      <p className="mt-2 text-sm text-[var(--text-body)]">{caption}</p>
    </div>
  );
}

function ChartPanel({
  title,
  eyebrow,
  hint,
  delay = 0,
  className = "",
  children,
}: {
  title: string;
  eyebrow: string;
  hint?: string;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`panel chart-reveal overflow-hidden p-4 sm:p-6 ${className}`}
      style={{ ["--stagger" as string]: `${delay}ms` }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-machined text-[var(--text-muted)]">{eyebrow}</p>
          <h3 className="mt-2 text-xl font-black uppercase sm:text-2xl">{title}</h3>
        </div>
        {hint ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyReportState({ mode, onOpenQr }: { mode: "staff" | "admin"; onOpenQr?: () => void }) {
  return (
    <section className="panel animate-fade-scale grid min-h-[320px] place-items-center p-8 text-center sm:min-h-[380px]">
      <div className="max-w-md">
        <div className="empty-pulse mx-auto mb-6 h-16 w-16 border border-[var(--hairline)] bg-[var(--surface-soft)]" />
        <p className="label-machined text-[var(--accent)]">Waiting for responses</p>
        <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em]">아직 응답이 없습니다</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          {mode === "staff"
            ? "설문을 시작한 뒤 QR·링크를 배포하면, 여기에 그래프가 쌓입니다."
            : "조건에 맞는 응답이 들어오면 KPI 그래프가 표시됩니다."}
        </p>
        {mode === "staff" && onOpenQr ? (
          <button
            type="button"
            onClick={onOpenQr}
            className="focus-ring label-machined mt-8 min-h-12 border border-white px-6 transition-colors hover:bg-white hover:text-black"
          >
            QR로 배포하기
          </button>
        ) : null}
      </div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-full place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-machined text-[var(--text-muted)]">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
