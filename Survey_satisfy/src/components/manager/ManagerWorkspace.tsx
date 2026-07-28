"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GoogleActionPanel } from "@/components/manager/GoogleActionPanel";
import { QrPreview } from "@/components/manager/QrPreview";
import { SurveyDraftEditor } from "@/components/manager/SurveyDraftEditor";
import { StaffImprovementPanel } from "@/components/manager/StaffImprovementPanel";
import { ResponseDashboard } from "@/components/dashboard/ResponseDashboard";
import { Badge } from "@/components/ui/Badge";
import { BrandMark } from "@/components/ui/BrandMark";
import { authFetch } from "@/lib/auth/access";
import { activateSurveyStatus, buildParticipantSurveyUrl } from "@/lib/supabase/responses";
import { surveyRecordToProject, surveyRowToRecord } from "@/lib/surveys/utils";
import type { SurveyRow } from "@/lib/supabase/database.types";
import type { SurveyRecord } from "@/types/platform";

interface ManagerWorkspaceProps {
  survey: SurveyRecord;
  onBack: () => void;
  onRefresh: () => void;
  onSurveyUpdated?: (row: SurveyRow) => void;
}

export function ManagerWorkspace({ survey, onBack, onRefresh, onSurveyUpdated }: ManagerWorkspaceProps) {
  const [current, setCurrent] = useState(survey);
  const [isActivated, setIsActivated] = useState(survey.status === "진행중");
  const [trackedSurvey, setTrackedSurvey] = useState(survey);
  const [status, setStatus] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const surveyUrl = buildParticipantSurveyUrl(current.id);
  const project = useMemo(() => surveyRecordToProject(current), [current]);

  // survey prop이 바뀌면 렌더 중 로컬 상태 동기화 (effect 없이, lint-clean)
  if (trackedSurvey !== survey) {
    setTrackedSurvey(survey);
    setCurrent(survey);
    setIsActivated(survey.status === "진행중");
  }

  // 설문 운영 화면이 열리면(또는 다른 설문으로 바뀌면) 맨 위로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [survey.id]);

  async function handleActivateSurvey() {
    setIsActivating(true);
    setStatus("설문을 시작하는 중입니다.");
    try {
      await activateSurveyStatus(current.id);
      setIsActivated(true);
      setCurrent((prev) => ({ ...prev, status: "진행중" }));
      setStatus("설문이 시작되었습니다. QR을 배포하세요.");
      onRefresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "설문 시작에 실패했습니다.");
    } finally {
      setIsActivating(false);
    }
  }

  async function handleCloseSurvey() {
    const response = await authFetch("/api/surveys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, status: "종료" }),
    });
    const data = (await response.json()) as { ok: boolean; survey?: SurveyRow; error?: string };
    if (response.ok && data.ok) {
      setIsActivated(false);
      if (data.survey) {
        setCurrent(surveyRowToRecord(data.survey));
        onSurveyUpdated?.(data.survey);
      } else {
        setCurrent((prev) => ({ ...prev, status: "종료" }));
      }
      setStatus("설문을 종료했습니다.");
      onRefresh();
    } else {
      setStatus(data.error ?? "설문 종료에 실패했습니다.");
    }
  }

  const shareMessage =
    `[충남콘텐츠진흥원 만족도 조사] "${current.title}" 설문에 참여해 주세요.\n` +
    `소중한 의견이 사업 개선에 큰 도움이 됩니다. (약 2~3분 소요)\n${surveyUrl}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(surveyUrl);
      setStatus("설문 링크를 복사했습니다.");
    } catch {
      setStatus(surveyUrl);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${current.title} 참여 요청`,
          text: shareMessage,
          url: surveyUrl,
        });
        return;
      } catch {
        // fall through (사용자 취소 등)
      }
    }
    // 공유 미지원 브라우저: 안내 문구 전체를 클립보드로 복사
    try {
      await navigator.clipboard.writeText(shareMessage);
      setStatus("참여 요청 문구와 링크를 복사했습니다. 붙여넣어 공유하세요.");
    } catch {
      setStatus(shareMessage);
    }
  }

  return (
    <>
      <section className="animate-enter grid gap-4 border-b border-[var(--hairline)] pb-6">
        <button type="button" onClick={onBack} className="label-machined w-fit min-h-11 text-[var(--text-body)] transition-colors hover:text-white">
          ← 설문 목록
        </button>
        <BrandMark compact />
        <div>
          <Badge tone={isActivated ? "success" : current.status === "종료" ? "default" : "warning"}>
            {current.status}
          </Badge>
          <h1 className="mt-4 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-4xl">
            {current.title}
          </h1>
          <p className="mt-3 text-sm text-[var(--text-body)]">
            {current.year} · {current.round}회차 · {current.subBusiness} · {current.division}
          </p>
        </div>
      </section>

      <div className="grid gap-6 py-6 lg:grid-cols-2">
        <section className="panel animate-rise p-4 sm:p-6">
          <p className="label-machined text-[var(--text-muted)]">Operate</p>
          <h2 className="mt-2 text-xl font-black uppercase">운영</h2>
          <div className="mt-5 grid gap-2 text-sm text-[var(--text-body)]">
            <p>목표 {current.targetResponses}건 · 문항 {current.questions.length}개</p>
            {current.startsAt || current.endsAt ? (
              <p>
                설문 기간{" "}
                {(current.startsAt ?? "").slice(0, 10) || "-"} ~ {(current.endsAt ?? "").slice(0, 10) || "-"}
              </p>
            ) : null}
          </div>
          <div className="mt-6 hidden gap-2 sm:grid">
            <button
              type="button"
              disabled={isActivating || isActivated || current.status === "종료"}
              onClick={() => void handleActivateSurvey()}
              className="focus-ring label-machined min-h-12 border border-white px-4 hover:bg-white hover:text-black disabled:opacity-50"
            >
              {isActivated ? "진행 중" : isActivating ? "시작 중" : "설문 시작"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void handleCopyLink()} className="focus-ring min-h-11 border border-[var(--hairline)] text-xs font-bold text-[var(--text-body)]">
                링크 복사
              </button>
              <button type="button" onClick={() => void handleShare()} className="focus-ring min-h-11 border border-[var(--hairline)] text-xs font-bold text-[var(--text-body)]">
                공유
              </button>
            </div>
            {isActivated ? (
              <>
                <button type="button" onClick={() => setShowQr(true)} className="focus-ring label-machined min-h-12 border border-white px-4 hover:bg-white hover:text-black">
                  QR 전체화면
                </button>
                <button type="button" onClick={() => void handleCloseSurvey()} className="focus-ring min-h-11 border border-[var(--hairline)] text-xs font-bold text-[var(--text-body)]">
                  설문 종료
                </button>
              </>
            ) : null}
          </div>
          {status ? <p className="mt-3 text-sm text-[var(--text-body)]">{status}</p> : null}
        </section>

        <section className="panel animate-rise p-4 sm:p-6" style={{ animationDelay: "80ms" }}>
          <p className="label-machined text-[var(--text-muted)]">Share</p>
          <h2 className="mt-2 text-xl font-black uppercase">링크·QR</h2>
          <Link href={`/survey/${current.id}?role=user`} className="mt-4 block break-all border border-[var(--hairline)] px-3 py-3 font-mono text-xs text-white hover:border-white">
            {surveyUrl}
          </Link>
          <div className="mt-4 flex justify-center sm:justify-start">
            {isActivated ? (
              <QrPreview url={surveyUrl} title={current.title} downloadFileName={`CCON_설문_QR_${current.subBusiness}.png`} />
            ) : (
              <div className="grid h-40 w-full place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)] sm:w-56">
                시작 후 QR 표시
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="pb-8">
        <ResponseDashboard
          mode="staff"
          initialSurveyId={current.id}
          questions={current.questions}
          surveyLabel={`${current.subBusiness} · ${current.title}`}
          onOpenQr={
            isActivated
              ? () => setShowQr(true)
              : () => {
                  setStatus("먼저 설문을 시작한 뒤 QR을 배포할 수 있습니다.");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
          }
        />
      </section>

      <div className="pb-28 sm:pb-12">
        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="focus-ring label-machined mb-4 border border-[var(--hairline)] px-4 py-3 text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
        >
          {showMore ? "추가 기능 접기" : "작성중 수정 · 개선과제 · Google"}
        </button>
        {showMore ? (
          <div className="animate-enter grid gap-6">
            <SurveyDraftEditor
              survey={current}
              onSaved={(row) => {
                setCurrent(surveyRowToRecord(row));
                onSurveyUpdated?.(row);
                onRefresh();
              }}
            />
            <StaffImprovementPanel survey={current} />
            <GoogleActionPanel project={project} surveyId={current.id} questions={current.questions} />
          </div>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hairline)] bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-2 gap-2 p-3">
          {!isActivated && current.status !== "종료" ? (
            <button
              type="button"
              disabled={isActivating}
              onClick={() => void handleActivateSurvey()}
              className="focus-ring col-span-2 min-h-12 border border-white bg-white text-sm font-bold text-black disabled:opacity-50"
            >
              {isActivating ? "시작 중" : "설문 시작"}
            </button>
          ) : null}
          <button type="button" onClick={() => void handleCopyLink()} className="focus-ring min-h-11 border border-[var(--hairline)] text-xs font-bold text-[var(--text-body)]">
            링크
          </button>
          <button type="button" onClick={() => void handleShare()} className="focus-ring min-h-11 border border-[var(--hairline)] text-xs font-bold text-[var(--text-body)]">
            공유
          </button>
          {isActivated ? (
            <>
              <button type="button" onClick={() => setShowQr(true)} className="focus-ring min-h-11 border border-white text-xs font-bold">
                QR
              </button>
              <button type="button" onClick={() => void handleCloseSurvey()} className="focus-ring min-h-11 border border-[var(--hairline)] text-xs font-bold text-[var(--text-body)]">
                종료
              </button>
            </>
          ) : null}
        </div>
      </nav>

      {showQr ? (
        <QrPreview
          fullscreen
          url={surveyUrl}
          title={current.title}
          size={280}
          downloadFileName={`CCON_설문_QR_${current.subBusiness}.png`}
          onClose={() => setShowQr(false)}
        />
      ) : null}
    </>
  );
}
