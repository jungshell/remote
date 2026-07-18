"use client";

import { useState } from "react";
import { createProjectRound, generateReport } from "@/lib/google/apps-script-client";
import type { Project, Question } from "@/types/platform";

interface GoogleActionPanelProps {
  project: Project;
  surveyId: string;
  questions: Question[];
}

export function GoogleActionPanel({ project, surveyId, questions }: GoogleActionPanelProps) {
  const [status, setStatus] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL);

  async function handleCreateRound() {
    setIsLoading(true);
    setReportUrl("");
    setStatus("Google Drive 폴더와 응답 Sheet를 생성 중입니다.");

    try {
      const result = await createProjectRound(project, surveyId, questions);
      setStatus(`생성 완료: ${result.folderPath.join(" / ")} · Sheet ID ${result.sheetId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "회차 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReport(reportType: "official" | "internal") {
    setIsLoading(true);
    setReportUrl("");
    setStatus(`${reportType === "official" ? "공식 보고용" : "내부 분석용"} PDF 생성을 요청 중입니다.`);

    try {
      const result = await generateReport(surveyId, reportType);
      setReportUrl(result.url || "");
      setStatus(result.message || (result.url ? "보고서 생성 완료" : "보고서 생성 결과 URL이 없습니다."));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "보고서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel animate-enter p-4 sm:p-6">
      <p className="label-machined text-[var(--text-muted)]">Google Reports</p>
      <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">Drive · PDF (선택)</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
        Supabase가 기본 저장소입니다. Google 연동은 보고용 Drive 폴더·PDF가 필요할 때만 사용하세요.
      </p>

      {!isConfigured ? (
        <p className="mt-4 border border-[var(--warning)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--warning)]">
          아직 Apps Script URL이 없습니다. `docs/OPTIONAL_FEATURES_GUIDE.md`의 Google 설정 단계를 따라
          `.env.local`에 `NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL`을 넣은 뒤 서버를 재시작하세요.
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={isLoading || !isConfigured}
          onClick={() => void handleCreateRound()}
          className="focus-ring label-machined border border-white px-4 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
        >
          Drive·Sheet 생성
        </button>
        <button
          type="button"
          disabled={isLoading || !isConfigured}
          onClick={() => void handleReport("official")}
          className="focus-ring label-machined border border-[var(--hairline)] px-4 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          공식 PDF
        </button>
        <button
          type="button"
          disabled={isLoading || !isConfigured}
          onClick={() => void handleReport("internal")}
          className="focus-ring label-machined border border-[var(--hairline)] px-4 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          내부 PDF
        </button>
      </div>

      {status ? (
        <div className="mt-5 border border-[var(--hairline)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--text-body)]">
          {status}
          {reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noreferrer"
              className="label-machined mt-3 block text-white underline underline-offset-4"
            >
              PDF 열기
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
