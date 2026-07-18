"use client";

import { useMemo, useState } from "react";
import { extractTextOpinions } from "@/lib/dashboard/aggregate";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question } from "@/types/platform";

interface OpinionSummaryPanelProps {
  rows: SurveyResponseRow[];
  questions?: Question[];
}

interface SummaryResult {
  summary: string;
  keywords: string[];
  actionItems: string[];
}

export function OpinionSummaryPanel({ rows, questions }: OpinionSummaryPanelProps) {
  const opinions = useMemo(() => extractTextOpinions(rows, questions), [rows, questions]);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSummarize() {
    if (opinions.length === 0) {
      setStatus("요약할 주관식 의견이 없습니다.");
      return;
    }

    setIsLoading(true);
    setStatus("주관식 의견을 요약하는 중입니다.");
    setResult(null);

    try {
      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opinions, purpose: "satisfaction_survey" }),
      });
      const data = (await response.json()) as SummaryResult & { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "요약에 실패했습니다. GEMINI_API_KEY를 확인해 주세요.");
        return;
      }

      setResult({
        summary: data.summary ?? "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
      });
      setStatus(`${opinions.length}건 의견을 요약했습니다. 공식 보고 전 반드시 검토하세요.`);
    } catch {
      setStatus("요약 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel chart-reveal overflow-hidden p-4 sm:p-6" style={{ ["--stagger" as string]: "300ms" }}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-machined text-[var(--text-muted)]">AI Summary</p>
          <h3 className="mt-2 text-xl font-black uppercase sm:text-2xl">주관식 의견 요약</h3>
          <p className="mt-2 text-sm text-[var(--text-body)]">
            수집된 주관식 {opinions.length}건 · Gemini로 요약·키워드·개선과제 초안
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading || opinions.length === 0}
          onClick={() => void handleSummarize()}
          className="focus-ring label-machined min-h-11 border border-white px-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
        >
          {isLoading ? "요약 중" : "AI 요약 실행"}
        </button>
      </div>

      {status ? <p className="mb-4 text-sm text-[var(--text-muted)]">{status}</p> : null}

      {result ? (
        <div className="animate-enter grid gap-4">
          <div className="border border-[var(--hairline)] bg-[var(--surface-soft)] p-4">
            <p className="label-machined text-[var(--text-muted)]">요약</p>
            <p className="mt-3 text-sm leading-7 text-white">{result.summary || "요약 결과 없음"}</p>
          </div>
          {result.keywords.length > 0 ? (
            <div>
              <p className="label-machined text-[var(--text-muted)]">키워드</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.keywords.map((keyword) => (
                  <span key={keyword} className="border border-[var(--hairline)] px-3 py-1 text-xs text-[var(--text-body)]">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {result.actionItems.length > 0 ? (
            <div>
              <p className="label-machined text-[var(--text-muted)]">개선과제 초안</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-body)]">
                {result.actionItems.map((item) => (
                  <li key={item} className="border-l border-[var(--accent)] pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : opinions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">주관식 응답이 쌓이면 여기서 요약할 수 있습니다.</p>
      ) : null}
    </section>
  );
}
