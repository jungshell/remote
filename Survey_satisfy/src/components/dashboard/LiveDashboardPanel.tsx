"use client";

import { useState } from "react";
import { getDashboardData, type LiveDashboardData } from "@/lib/google/apps-script-client";

interface LiveDashboardPanelProps {
  surveyId: string;
}

export function LiveDashboardPanel({ surveyId }: LiveDashboardPanelProps) {
  const [data, setData] = useState<LiveDashboardData | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLoad() {
    setIsLoading(true);
    setStatus("Google Sheet 실데이터를 불러오는 중입니다.");

    try {
      const result = await getDashboardData(surveyId);
      setData(result);
      setStatus("실데이터를 불러왔습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "실데이터 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-machined text-[var(--text-muted)]">Live Sheet Data</p>
          <h2 className="mt-2 text-2xl font-black uppercase">실데이터 조회</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
            Apps Script 배포 후 회차별 Sheet의 집계결과, 주관식, 개선과제를 읽어옵니다.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleLoad}
          className="focus-ring label-machined border border-white px-5 py-3 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50"
        >
          실데이터 불러오기
        </button>
      </div>

      {status ? <p className="mt-5 text-sm text-[var(--text-body)]">{status}</p> : null}

      {data ? (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <LiveMetric label="응답수" value={String(data.summary["응답수"] ?? data.responseCount ?? "-")} />
          <LiveMetric label="응답률" value={String(data.summary["응답률"] ?? "-")} />
          <LiveMetric label="만족도" value={String(data.summary["만족도(긍정응답률)"] ?? "-")} />
          <LiveMetric label="NPS" value={String(data.summary["NPS"] ?? "-")} />
        </div>
      ) : null}

      {data && data.actionItems.length > 0 ? (
        <div className="mt-6 border-t border-[var(--hairline)] pt-5">
          <p className="label-machined text-[var(--text-muted)]">Action Items</p>
          <div className="mt-3 grid gap-3">
            {data.actionItems.slice(0, 3).map((item, index) => (
              <div key={`${item.title}-${index}`} className="border border-[var(--hairline)] p-3 text-sm">
                <p className="font-bold text-white">{String(item.title ?? "")}</p>
                <p className="mt-1 text-[var(--text-body)]">
                  {String(item.status ?? "")} · {String(item.owner ?? "")} · {String(item.dueDate ?? "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--hairline)] p-4">
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
