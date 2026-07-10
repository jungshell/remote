"use client";

import { useEffect, useMemo, useState } from "react";
import { buildManagementExportRows, downloadManagementExcel } from "@/lib/export-excel";
import { authFetch } from "@/lib/auth/access";
import type { SurveyResponseRow, SurveyRow } from "@/lib/supabase/database.types";

export function ManagementExportPanel() {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void Promise.all([
      authFetch("/api/surveys").then((response) => response.json()),
      authFetch("/api/survey-responses").then((response) => response.json()),
    ])
      .then(([surveyData, responseData]) => {
        if (surveyData.ok && surveyData.rows) {
          setSurveys(surveyData.rows);
          setSelectedIds(surveyData.rows.map((row: SurveyRow) => row.id));
        }

        if (responseData.ok && responseData.rows) {
          setResponses(responseData.rows);
        }
      })
      .catch(() => setStatus("데이터를 불러오지 못했습니다."));
  }, []);

  const previewRows = useMemo(() => {
    const selected = surveys.filter((survey) => selectedIds.includes(survey.id));
    return buildManagementExportRows(selected, responses);
  }, [surveys, responses, selectedIds]);

  function toggleSurvey(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function handleDownload() {
    if (previewRows.length === 0) {
      setStatus("보낼 설문을 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      downloadManagementExcel(previewRows, `CCON_경영평가_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setStatus(`${previewRows.length}개 사업 결과를 Excel로 저장했습니다.`);
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
        <h2 className="mt-2 text-2xl font-black uppercase">경영평가보내기</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          사업을 선택해 응답인원·5점 만족도 평균·NPS를 Excel로 다운로드합니다.
        </p>
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {surveys.map((survey) => (
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
                {survey.division} · {survey.program_type} · {survey.status}
              </p>
            </div>
          </label>
        ))}
      </div>

      <div className="overflow-x-auto border-t border-[var(--hairline)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface-soft)] text-left">
            <tr>
              {["사업명", "사업유형", "응답인원", "만족도(5점)", "NPS", "응답률"].map((header) => (
                <th key={header} className="px-4 py-3 font-medium text-[var(--text-muted)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.title} className="border-t border-[var(--hairline)]">
                <td className="px-4 py-3 text-white">{row.title}</td>
                <td className="px-4 py-3">{row.programType}</td>
                <td className="px-4 py-3">{row.responseCount}</td>
                <td className="px-4 py-3">{row.satisfaction}</td>
                <td className="px-4 py-3">{row.nps}</td>
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
          Excel 다운로드
        </button>
        {status ? <p className="mt-4 text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>
    </section>
  );
}
