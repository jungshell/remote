"use client";

import { useEffect, useState } from "react";
import { ManagerWorkspace } from "@/components/manager/ManagerWorkspace";
import { SurveyCreator } from "@/components/manager/SurveyCreator";
import { Badge } from "@/components/ui/Badge";
import { authFetch } from "@/lib/auth/access";
import { surveyRowToRecord } from "@/lib/surveys/utils";
import type { SurveyRow } from "@/lib/supabase/database.types";
import type { SurveyRecord } from "@/types/platform";

type ViewMode = "list" | "create";

export function ManagerConsole() {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyRecord | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [status, setStatus] = useState("");

  async function loadSurveys() {
    try {
      const response = await authFetch("/api/surveys");
      const data = (await response.json()) as { ok: boolean; rows?: SurveyRow[]; error?: string };

      if (data.ok && data.rows) {
        setSurveys(data.rows);
      } else {
        setStatus(data.error ?? "설문 목록을 불러오지 못했습니다.");
      }
    } catch {
      setStatus("설문 목록 조회 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    void loadSurveys();
  }, []);

  function handleCreated(survey: SurveyRow) {
    setSurveys((prev) => [survey, ...prev]);
    setSelectedSurvey(surveyRowToRecord(survey));
    setView("list");
  }

  if (selectedSurvey) {
    return (
      <ManagerWorkspace
        survey={selectedSurvey}
        onBack={() => setSelectedSurvey(null)}
        onRefresh={() => void loadSurveys()}
      />
    );
  }

  return (
    <>
      <section className="grid gap-10 border-b border-[var(--hairline)] pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Badge tone="info">Manager Console</Badge>
          <h1 className="mt-6 text-5xl font-black uppercase leading-none tracking-[-0.04em] md:text-6xl">
            담당자 설문
            <br />
            생성·운영
          </h1>
          <p className="mt-6 max-w-2xl text-[var(--text-body)]">
            설문을 생성하고 활성화한 뒤 QR·링크로 배포하세요. 실시간 KPI는 Supabase 응답 기준입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView(view === "create" ? "list" : "create")}
          className="focus-ring label-machined border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black"
        >
          {view === "create" ? "목록 보기" : "새 설문 만들기"}
        </button>
      </section>

      {view === "create" ? (
        <section className="py-12">
          <SurveyCreator onCreated={handleCreated} />
        </section>
      ) : (
        <section className="py-12">
          <div className="panel overflow-hidden">
            <div className="border-b border-[var(--hairline)] p-6">
              <p className="label-machined text-[var(--text-muted)]">My Surveys</p>
              <h2 className="mt-2 text-2xl font-black uppercase">내 설문 목록</h2>
            </div>
            {status ? <p className="p-6 text-sm text-[var(--text-body)]">{status}</p> : null}
            <div className="divide-y divide-[var(--hairline)]">
              {surveys.length === 0 ? (
                <p className="p-6 text-sm text-[var(--text-muted)]">생성된 설문이 없습니다. 새 설문을 만들어 주세요.</p>
              ) : (
                surveys.map((survey) => (
                  <button
                    key={survey.id}
                    type="button"
                    onClick={() => setSelectedSurvey(surveyRowToRecord(survey))}
                    className="grid w-full gap-4 p-6 text-left transition-colors hover:bg-[var(--surface-soft)] md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={survey.status === "진행중" ? "success" : survey.status === "종료" ? "default" : "warning"}>
                          {survey.status}
                        </Badge>
                        <span className="text-sm text-[var(--text-muted)]">
                          {survey.year ?? "-"} · {survey.division} · {survey.round ?? 1}회차
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-white">{survey.title}</h3>
                      <p className="mt-2 text-sm text-[var(--text-body)]">
                        {survey.business} / {survey.sub_business} · {survey.program_type}
                      </p>
                    </div>
                    <span className="label-machined text-white">운영하기 →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
