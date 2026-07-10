"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleActionPanel } from "@/components/manager/GoogleActionPanel";
import { QrPreview } from "@/components/manager/QrPreview";
import { ResponseDashboard } from "@/components/dashboard/ResponseDashboard";
import { Badge } from "@/components/ui/Badge";
import { authFetch } from "@/lib/auth/access";
import { buildDrivePath, buildReportFileName, buildResponseSheetName } from "@/lib/drive";
import { isAppsScriptConfigured } from "@/lib/google/apps-script-client";
import { activateSurveyStatus, buildParticipantSurveyUrl } from "@/lib/supabase/responses";
import { surveyRecordToProject } from "@/lib/surveys/utils";
import type { SurveyRecord } from "@/types/platform";

interface ManagerWorkspaceProps {
  survey: SurveyRecord;
  onBack: () => void;
  onRefresh: () => void;
}

export function ManagerWorkspace({ survey, onBack, onRefresh }: ManagerWorkspaceProps) {
  const configured = isAppsScriptConfigured();
  const project = surveyRecordToProject(survey);
  const [isActivated, setIsActivated] = useState(survey.status === "진행중");
  const [status, setStatus] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const surveyUrl = buildParticipantSurveyUrl(survey.id);

  useEffect(() => {
    setIsActivated(survey.status === "진행중");
  }, [survey.status]);

  async function handleActivateSurvey() {
    setIsActivating(true);
    setStatus("설문을 활성화하는 중입니다.");

    try {
      await activateSurveyStatus(survey.id);
      setIsActivated(true);
      setStatus("설문이 활성화되었습니다. 아래 QR 코드를 배포하세요.");
      onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "설문 활성화 중 오류가 발생했습니다.");
    } finally {
      setIsActivating(false);
    }
  }

  async function handleCloseSurvey() {
    const response = await authFetch("/api/surveys", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: survey.id, status: "종료" }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (response.ok && data.ok) {
      setIsActivated(false);
      setStatus("설문이 종료되었습니다.");
      onRefresh();
    } else {
      setStatus(data.error ?? "설문 종료에 실패했습니다.");
    }
  }

  return (
    <>
      <section className="grid gap-6 border-b border-[var(--hairline)] pb-8">
        <button type="button" onClick={onBack} className="label-machined w-fit text-[var(--text-body)] hover:text-white">
          ← 설문 목록
        </button>
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge tone="info">Survey Operations</Badge>
            <h1 className="mt-6 text-4xl font-black uppercase leading-none tracking-[-0.04em] md:text-5xl">{survey.title}</h1>
            <p className="mt-4 text-[var(--text-body)]">
              {survey.year} · {survey.division} · {survey.round}회차 · {survey.programType}
            </p>
          </div>
          <Badge tone={configured ? "success" : "warning"}>{configured ? "Google 연동 준비됨" : "Google URL 미설정"}</Badge>
        </div>
      </section>

      <section className="grid gap-6 py-12 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel p-6">
          <p className="label-machined text-[var(--text-muted)]">Survey Status</p>
          <h2 className="mt-3 text-2xl font-black uppercase">운영 제어</h2>

          <div className="mt-8 grid gap-4">
            <ReadOnlyField label="상태" value={survey.status} />
            <ReadOnlyField label="목표 응답수" value={`${survey.targetResponses}건`} />
            <ReadOnlyField label="문항 수" value={`${survey.questions.length}개`} />
            <ReadOnlyField label="응답자 유형" value={respondentTypeLabel(survey.respondentType)} />
          </div>

          <div className="mt-8 grid gap-3">
            <button
              type="button"
              disabled={isActivating || isActivated}
              onClick={() => void handleActivateSurvey()}
              className="focus-ring label-machined w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-default disabled:opacity-60"
            >
              {isActivated ? "설문 활성화 완료" : isActivating ? "활성화 중" : "설문 활성화"}
            </button>
            {isActivated ? (
              <button
                type="button"
                onClick={() => void handleCloseSurvey()}
                className="focus-ring label-machined w-full border border-[var(--hairline)] px-6 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
              >
                설문 종료
              </button>
            ) : null}
          </div>
          {status ? <p className="mt-4 text-sm text-[var(--text-body)]">{status}</p> : null}
        </div>

        <div className="grid gap-6">
          <section className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="label-machined text-[var(--text-muted)]">Distribution</p>
                <h2 className="mt-3 text-2xl font-black uppercase">링크·QR 배포</h2>
                <Link
                  href={`/survey/${survey.id}?role=user`}
                  className="mt-6 inline-block break-all border border-[var(--hairline)] px-4 py-3 font-mono text-sm text-white hover:border-white"
                >
                  {surveyUrl}
                </Link>
              </div>
              {isActivated ? (
                <QrPreview url={surveyUrl} downloadFileName={`CCON_설문_QR_${survey.subBusiness}.png`} />
              ) : (
                <div className="grid h-56 w-56 place-items-center border border-[var(--hairline)] p-4 text-center text-sm text-[var(--text-muted)]">
                  설문 활성화 후 QR 코드가 생성됩니다.
                </div>
              )}
            </div>
          </section>

          <section className="panel p-6">
            <p className="label-machined text-[var(--text-muted)]">Google Drive Rules</p>
            <h2 className="mt-3 text-2xl font-black uppercase">자동 정리 경로 (2단계)</h2>
            <div className="mt-6 grid gap-4 text-sm">
              <PathRow label="Drive 폴더" value={buildDrivePath(project).join(" / ")} />
              <PathRow label="응답 Sheet" value={buildResponseSheetName(project)} />
              <PathRow label="공식 PDF" value={buildReportFileName(project, "official")} />
              <PathRow label="내부 PDF" value={buildReportFileName(project, "internal")} />
            </div>
          </section>

          <GoogleActionPanel project={project} surveyId={survey.id} questions={survey.questions} />
        </div>
      </section>

      <section className="pb-12">
        <ResponseDashboard role="staff" mode="staff" initialSurveyId={survey.id} questions={survey.questions} />
      </section>
    </>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="label-machined text-[var(--text-muted)]">{label}</label>
      <div className="mt-2 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 py-3 text-white">{value}</div>
    </div>
  );
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 border-b border-[var(--hairline)] pb-4 last:border-b-0 md:grid-cols-[120px_1fr]">
      <span className="label-machined text-[var(--text-muted)]">{label}</span>
      <span className="break-all font-mono text-white">{value}</span>
    </div>
  );
}

function respondentTypeLabel(type: SurveyRecord["respondentType"]) {
  if (type === "org") return "기관";
  if (type === "person") return "개인";
  return "기관+개인";
}
