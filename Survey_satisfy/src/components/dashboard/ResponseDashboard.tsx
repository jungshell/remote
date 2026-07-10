"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authFetch, type PlatformRole } from "@/lib/auth/access";
import { downloadResponsesCsv } from "@/lib/csv";
import {
  aggregateByCategory,
  aggregateByDivision,
  aggregateByProgramType,
  aggregateMetrics,
} from "@/lib/dashboard/aggregate";
import { parseQuestions } from "@/lib/surveys/utils";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question } from "@/types/platform";
import { StatCard } from "@/components/ui/StatCard";

interface ResponseDashboardProps {
  role: PlatformRole;
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
  custom_questions?: unknown;
}

export function ResponseDashboard({ role, mode, initialSurveyId, questions: initialQuestions }: ResponseDashboardProps) {
  const [rows, setRows] = useState<SurveyResponseRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(initialSurveyId ?? "");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgramType, setSelectedProgramType] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      .catch(() => undefined);
  }, [initialSurveyId]);

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
      const response = await authFetch(`/api/survey-responses?${params.toString()}`);
      const data = (await response.json()) as { ok: boolean; rows?: SurveyResponseRow[]; error?: string };

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "데이터 조회에 실패했습니다.");
        return;
      }

      setRows(data.rows ?? []);
      setStatus(`${data.rows?.length ?? 0}건의 응답을 불러왔습니다.`);
    } catch {
      setStatus("데이터 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurveyId, selectedDivision, selectedProgramType, mode]);

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

    return 80;
  }, [mode, selectedSurveyId, surveys]);

  const metrics = useMemo(() => aggregateMetrics(rows, targetResponses), [rows, targetResponses]);
  const divisionChartData = useMemo(() => aggregateByDivision(rows), [rows]);
  const programTypeChartData = useMemo(() => aggregateByProgramType(rows), [rows]);
  const categoryChartData = useMemo(
    () => aggregateByCategory(rows, activeQuestions),
    [rows, activeQuestions],
  );

  const chartData = useMemo(() => {
    if (mode === "admin") {
      return divisionChartData.map((item) => {
        const group = rows.filter((row) => row.division === item.name);
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
  }, [mode, divisionChartData, rows, targetResponses, surveys, selectedSurveyId, metrics]);

  const divisionOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.division))),
    [surveys],
  );

  const programTypeOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.program_type))),
    [surveys],
  );

  function handleDownload() {
    const label =
      mode === "staff"
        ? surveys.find((survey) => survey.id === selectedSurveyId)?.sub_business ?? "설문"
        : selectedDivision || selectedProgramType || "전체";

    downloadResponsesCsv(rows, `CCON_설문결과_${label}.csv`);
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
              onClick={() => void loadResponses()}
              className="focus-ring label-machined border border-white px-5 py-3 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              새로고침
            </button>
            <button
              type="button"
              disabled={rows.length === 0}
              onClick={handleDownload}
              className="focus-ring label-machined border border-[var(--hairline)] px-5 py-3 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:opacity-50"
            >
              CSV 다운로드
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {mode === "staff" ? (
            <FilterField label="세부사업 / 설문회차">
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
          ) : (
            <>
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
            </>
          )}
        </div>

        {status ? <p className="mt-5 text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="응답수" value={`${metrics.responseCount}`} caption="현재 필터 기준" />
        <StatCard label="응답률(완료율)" value={`${metrics.responseRate}%`} caption={`목표 ${targetResponses}건`} tone="success" />
        <StatCard label="만족도" value={`${metrics.satisfaction}`} caption="5점 만점 평균" tone="success" />
        <StatCard label="NPS" value={`${metrics.nps}`} caption="추천 의향" />
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
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={320}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#2d2d2d" vertical={false} />
                <XAxis dataKey="name" stroke="#7d7d7d" tickLine={false} axisLine={false} />
                <YAxis stroke="#7d7d7d" tickLine={false} axisLine={false} domain={[0, 5]} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#111", border: "1px solid #3a3a3a", borderRadius: 0 }}
                />
                <Bar dataKey="satisfaction" fill="#ffffff" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)]">
              표시할 응답 데이터가 없습니다.
            </div>
          )}
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
            <ResponsiveContainer width="100%" height="100%" minWidth={320}>
              <BarChart data={categoryChartData}>
                <CartesianGrid stroke="#2d2d2d" vertical={false} />
                <XAxis dataKey="name" stroke="#7d7d7d" tickLine={false} axisLine={false} />
                <YAxis stroke="#7d7d7d" tickLine={false} axisLine={false} domain={[0, 5]} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#111", border: "1px solid #3a3a3a", borderRadius: 0 }}
                />
                <Bar dataKey="satisfaction" fill="#2f7dff" radius={0} />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height="100%" minWidth={320}>
              <BarChart data={programTypeChartData}>
                <CartesianGrid stroke="#2d2d2d" vertical={false} />
                <XAxis dataKey="name" stroke="#7d7d7d" tickLine={false} axisLine={false} />
                <YAxis stroke="#7d7d7d" tickLine={false} axisLine={false} domain={[0, 5]} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#111", border: "1px solid #3a3a3a", borderRadius: 0 }}
                />
                <Bar dataKey="satisfaction" fill="#ffffff" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <section className="panel p-6">
        <div className="mb-8">
          <p className="label-machined text-[var(--text-muted)]">Completion Rate</p>
          <h2 className="mt-2 text-2xl font-black uppercase">응답률(완료율)</h2>
        </div>
        <div className="h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={320}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#2d2d2d" vertical={false} />
                <XAxis dataKey="name" stroke="#7d7d7d" tickLine={false} axisLine={false} />
                <YAxis stroke="#7d7d7d" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#111", border: "1px solid #3a3a3a", borderRadius: 0 }}
                />
                <Bar dataKey="responseRate" fill="#2f7dff" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)]">
              표시할 응답 데이터가 없습니다.
            </div>
          )}
        </div>
      </section>
    </section>
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
