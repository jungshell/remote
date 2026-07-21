"use client";

import { useEffect, useMemo, useState } from "react";
import { buildManagementExportRows, downloadManagementExcel } from "@/lib/export-excel";
import { authFetch } from "@/lib/auth/access";
import { FilterSelect } from "@/components/ui/FormField";
import type { SurveyResponseRow, SurveyRow } from "@/lib/supabase/database.types";

export function ManagementExportPanel() {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [programTypeFilter, setProgramTypeFilter] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void Promise.all([
      authFetch("/api/surveys").then((response) => response.json()),
      authFetch("/api/survey-responses").then((response) => response.json()),
    ])
      .then(([surveyData, responseData]) => {
        if (surveyData.ok && surveyData.rows) {
          const rows = surveyData.rows as SurveyRow[];
          setSurveys(rows);
          setSelectedIds(rows.map((row) => row.id));
        }

        if (responseData.ok && responseData.rows) {
          setResponses(responseData.rows);
        }
      })
      .catch(() => setStatus("데이터를 불러오지 못했습니다."));
  }, []);

  const yearOptions = useMemo(
    () =>
      Array.from(new Set(surveys.map((survey) => survey.year ?? new Date().getFullYear()))).sort(
        (a, b) => b - a,
      ),
    [surveys],
  );

  const divisionOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.division))),
    [surveys],
  );

  const programTypeOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.program_type))),
    [surveys],
  );

  const filteredSurveys = useMemo(() => {
    return surveys.filter((survey) => {
      if (yearFilter && String(survey.year ?? "") !== yearFilter) {
        return false;
      }
      if (divisionFilter && survey.division !== divisionFilter) {
        return false;
      }
      if (programTypeFilter && survey.program_type !== programTypeFilter) {
        return false;
      }
      return true;
    });
  }, [surveys, yearFilter, divisionFilter, programTypeFilter]);

  const previewRows = useMemo(() => {
    const selected = filteredSurveys.filter((survey) => selectedIds.includes(survey.id));
    return buildManagementExportRows(selected, responses);
  }, [filteredSurveys, responses, selectedIds]);

  const totals = useMemo(() => {
    const responseCount = previewRows.reduce((sum, row) => sum + row.responseCount, 0);
    const targetResponses = previewRows.reduce((sum, row) => sum + row.targetResponses, 0);
    const satisfaction =
      responseCount > 0
        ? Math.round(
            (previewRows.reduce((sum, row) => sum + row.satisfaction * row.responseCount, 0) / responseCount) * 100,
          ) / 100
        : 0;
    const recommendation =
      responseCount > 0
        ? Math.round(
            (previewRows.reduce((sum, row) => sum + row.recommendation * row.responseCount, 0) / responseCount) * 100,
          ) / 100
        : 0;

    return { responseCount, targetResponses, satisfaction, recommendation, surveyCount: previewRows.length };
  }, [previewRows]);

  function toggleSurvey(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function selectFiltered(mode: "all" | "none") {
    if (mode === "all") {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredSurveys.map((survey) => survey.id)])));
      return;
    }

    const filteredIds = new Set(filteredSurveys.map((survey) => survey.id));
    setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  }

  function handleDownload() {
    if (previewRows.length === 0) {
      setStatus("보낼 설문을 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const yearPart = yearFilter || "전체연도";
      downloadManagementExcel(
        previewRows,
        `CCON_경영평가취합_${yearPart}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      setStatus(`${previewRows.length}개 사업 취합 결과(사업별·본부요약)를 Excel로 저장했습니다.`);
    } catch {
      setStatus("Excel 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--hairline)] p-6">
        <p className="label-machined text-[var(--text-muted)]">Management Export</p>
        <h2 className="mt-2 text-2xl font-black uppercase">경영평가·취합보내기</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          연도·본부·사업유형으로 걸러 만족도·추천 의향을 Excel로 취합합니다. (사업별 시트 + 본부 요약 시트)
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FilterSelect
            label="연도"
            value={yearFilter}
            onChange={setYearFilter}
            options={yearOptions.map((year) => ({ value: String(year), label: `${year}년` }))}
          />
          <FilterSelect
            label="본부"
            value={divisionFilter}
            onChange={setDivisionFilter}
            options={divisionOptions.map((division) => ({ value: division, label: division }))}
          />
          <FilterSelect
            label="사업유형"
            value={programTypeFilter}
            onChange={setProgramTypeFilter}
            options={programTypeOptions.map((type) => ({ value: type, label: type }))}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectFiltered("all")}
            className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
          >
            필터 결과 전체 선택
          </button>
          <button
            type="button"
            onClick={() => selectFiltered("none")}
            className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
          >
            필터 결과 선택 해제
          </button>
        </div>
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {filteredSurveys.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">필터 조건에 맞는 설문이 없습니다.</p>
        ) : (
          filteredSurveys.map((survey) => (
            <label key={survey.id} className="flex items-start gap-4 p-6">
              <input
                type="checkbox"
                checked={selectedIds.includes(survey.id)}
                onChange={() => toggleSurvey(survey.id)}
                className="mt-1"
              />
              <div>
                <p className="font-bold text-white">{survey.title}</p>
                <p className="mt-1 text-sm text-[var(--text-body)]">
                  {survey.year}년 {survey.round}회차 · {survey.division} · {survey.program_type} · {survey.status}
                </p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="grid gap-4 border-t border-[var(--hairline)] p-6 md:grid-cols-4">
        <SummaryStat label="선택 사업" value={`${totals.surveyCount}`} />
        <SummaryStat label="응답 합계" value={`${totals.responseCount}`} />
        <SummaryStat label="취합 만족도" value={`${totals.satisfaction}`} />
        <SummaryStat label="취합 추천의향" value={`${totals.recommendation}`} />
      </div>

      <div className="overflow-x-auto border-t border-[var(--hairline)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-soft)] text-left">
            <tr>
              {["연도", "사업명", "본부", "사업유형", "응답인원", "만족도(5점)", "추천(5점)", "응답률"].map((header) => (
                <th key={header} className="px-4 py-3 font-medium text-[var(--text-muted)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={`${row.title}-${row.year}-${row.round}`} className="border-t border-[var(--hairline)]">
                <td className="px-4 py-3">{row.year}</td>
                <td className="px-4 py-3 text-white">{row.title}</td>
                <td className="px-4 py-3">{row.division}</td>
                <td className="px-4 py-3">{row.programType}</td>
                <td className="px-4 py-3">{row.responseCount}</td>
                <td className="px-4 py-3">{row.satisfaction}</td>
                <td className="px-4 py-3">{row.recommendation}</td>
                <td className="px-4 py-3">{row.responseRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--hairline)] p-6">
        <button
          type="button"
          disabled={isLoading || previewRows.length === 0}
          onClick={handleDownload}
          className="focus-ring label-machined border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
        >
          Excel 취합 다운로드
        </button>
        {status ? <p className="mt-4 text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--hairline)] p-4">
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
