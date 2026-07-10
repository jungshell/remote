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
    <section className="panel p-6">
      <p className="label-machined text-[var(--text-muted)]">Google Test</p>
      <h2 className="mt-3 text-2xl font-black uppercase">연동 테스트</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
        먼저 회차 생성 버튼을 눌러 Drive 폴더와 응답 Sheet가 만들어지는지 확인하세요.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleCreateRound}
          className="focus-ring label-machined border border-white px-4 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
        >
          회차 Sheet 생성
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleReport("official")}
          className="focus-ring label-machined border border-[var(--hairline)] px-4 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          공식 PDF 테스트
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleReport("internal")}
          className="focus-ring label-machined border border-[var(--hairline)] px-4 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white disabled:cursor-wait disabled:opacity-50"
        >
          내부 PDF 테스트
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
