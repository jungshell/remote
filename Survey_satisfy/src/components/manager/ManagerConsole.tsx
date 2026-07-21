"use client";

import { useEffect, useState } from "react";
import { ManagerSurveyCard } from "@/components/manager/ManagerSurveyCard";
import { ManagerWorkspace } from "@/components/manager/ManagerWorkspace";
import { QrPreview } from "@/components/manager/QrPreview";
import { StaffProfileSetup } from "@/components/manager/StaffProfileSetup";
import { SurveyCreator } from "@/components/manager/SurveyCreator";
import { ChangePasswordPanel } from "@/components/auth/ChangePasswordPanel";
import { Badge } from "@/components/ui/Badge";
import { BrandMark } from "@/components/ui/BrandMark";
import { authFetch, fetchCurrentUser } from "@/lib/auth/access";
import { hasStaffSurveyProfile, type AuthUser } from "@/lib/auth/types";
import { activateSurveyStatus, buildParticipantSurveyUrl } from "@/lib/supabase/responses";
import { buildManagerAlerts } from "@/lib/surveys/manager-alerts";
import { surveyRowToRecord } from "@/lib/surveys/utils";
import type { SurveyRow } from "@/lib/supabase/database.types";
import type { SurveyRecord } from "@/types/platform";

type ViewMode = "list" | "create";

export function ManagerConsole() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyRecord | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [status, setStatus] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [busySurveyId, setBusySurveyId] = useState<string | null>(null);
  const [qrSurvey, setQrSurvey] = useState<SurveyRow | null>(null);
  const [cloneSource, setCloneSource] = useState<SurveyRow | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  async function loadSurveys() {
    try {
      const response = await authFetch("/api/surveys");
      const data = (await response.json()) as {
        ok: boolean;
        rows?: SurveyRow[];
        responseCounts?: Record<string, number>;
        error?: string;
      };

      if (data.ok && data.rows) {
        setSurveys(data.rows);
        setResponseCounts(data.responseCounts ?? {});
      } else {
        setStatus(data.error ?? "설문 목록을 불러오지 못했습니다.");
      }
    } catch {
      setStatus("설문 목록 조회 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    void (async () => {
      const current = await fetchCurrentUser();
      setUser(current);
      setIsLoadingUser(false);
      void loadSurveys();
    })();
  }, []);

  function handleCreated(survey: SurveyRow) {
    setSurveys((prev) => [survey, ...prev.filter((item) => item.id !== survey.id)]);
    setSelectedSurvey(surveyRowToRecord(survey));
    setCloneSource(null);
    setView("list");
  }

  async function handleStart(survey: SurveyRow) {
    setBusySurveyId(survey.id);
    setStatus("");
    try {
      await activateSurveyStatus(survey.id);
      setStatus(`「${survey.title}」을 시작했습니다.`);
      await loadSurveys();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "설문 시작에 실패했습니다.");
    } finally {
      setBusySurveyId(null);
    }
  }

  async function handleCopyLink(survey: SurveyRow) {
    const url = buildParticipantSurveyUrl(survey.id);
    try {
      await navigator.clipboard.writeText(url);
      setStatus("설문 링크를 복사했습니다.");
    } catch {
      setStatus(url);
    }
  }

  async function handleShare(survey: SurveyRow) {
    const url = buildParticipantSurveyUrl(survey.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: survey.title,
          text: `${survey.title} 참여 링크`,
          url,
        });
        return;
      } catch {
        // fall through to copy
      }
    }
    await handleCopyLink(survey);
  }

  if (isLoadingUser) {
    return <p className="py-12 text-sm text-[var(--text-muted)]">담당자 정보를 불러오는 중입니다.</p>;
  }

  if (user && !hasStaffSurveyProfile(user)) {
    return (
      <section className="py-8 sm:py-12">
        <StaffProfileSetup user={user} onSaved={setUser} />
      </section>
    );
  }

  if (selectedSurvey) {
    return (
      <ManagerWorkspace
        survey={selectedSurvey}
        onBack={() => {
          setSelectedSurvey(null);
          void loadSurveys();
        }}
        onRefresh={() => void loadSurveys()}
        onSurveyUpdated={(row) => {
          setSurveys((prev) => prev.map((item) => (item.id === row.id ? row : item)));
          setSelectedSurvey(surveyRowToRecord(row));
        }}
      />
    );
  }

  return (
    <>
      <section className="animate-enter border-b border-[var(--hairline)] pb-6 sm:pb-10">
        <BrandMark compact />
        <div className="mt-4">
          <Badge tone="info">Manager</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:mt-6 sm:text-5xl md:text-6xl">
          내 설문
        </h1>
        <p className="mt-4 text-sm text-[var(--text-body)] sm:mt-6 sm:text-base">
          {user?.business} / {user?.subBusiness}
          <span className="text-[var(--text-muted)]"> · {user?.programType}</span>
        </p>
        <div className="mt-6 hidden sm:block">
          <button
            type="button"
            onClick={() => {
              setCloneSource(null);
              setView(view === "create" ? "list" : "create");
            }}
            className="focus-ring label-machined min-h-12 border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black"
          >
            {view === "create" ? "목록 보기" : "새 설문 만들기"}
          </button>
        </div>
      </section>

      {view === "create" && user ? (
        <section className="pb-28 pt-6 sm:py-12">
          <SurveyCreator
            profile={user}
            onCreated={handleCreated}
            onCancel={() => {
              setCloneSource(null);
              setView("list");
            }}
            cloneSource={cloneSource}
          />
        </section>
      ) : (
        <section className="pb-28 pt-6 sm:py-12">
          <div className="panel overflow-hidden">
            <div className="border-b border-[var(--hairline)] p-4 sm:p-6">
              <p className="label-machined text-[var(--text-muted)]">My Surveys</p>
              <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">설문 목록</h2>
              {surveys.some((survey) =>
                buildManagerAlerts({
                  ...survey,
                  responseCount: responseCounts[survey.id] ?? 0,
                }).length,
              ) ? (
                <p className="mt-2 text-xs text-[var(--warning)]">주의 표시가 있는 설문을 우선 확인해 주세요.</p>
              ) : null}
            </div>
            {status ? <p className="border-b border-[var(--hairline)] px-4 py-3 text-sm text-[var(--text-body)] sm:px-6">{status}</p> : null}
            <div>
              {surveys.length === 0 ? (
                <p className="p-6 text-sm text-[var(--text-muted)]">생성된 설문이 없습니다. 아래 버튼으로 새 설문을 만들어 주세요.</p>
              ) : (
                surveys.map((survey) => (
                  <ManagerSurveyCard
                    key={survey.id}
                    survey={survey}
                    responseCount={responseCounts[survey.id] ?? 0}
                    alerts={buildManagerAlerts({
                      ...survey,
                      responseCount: responseCounts[survey.id] ?? 0,
                    })}
                    isBusy={busySurveyId === survey.id}
                    onOpen={() => setSelectedSurvey(surveyRowToRecord(survey))}
                    onStart={() => void handleStart(survey)}
                    onCopyLink={() => void handleCopyLink(survey)}
                    onShare={() => void handleShare(survey)}
                    onShowQr={() => setQrSurvey(survey)}
                    onClone={() => {
                      setCloneSource(survey);
                      setView("create");
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowChangePassword((prev) => !prev)}
              className="focus-ring label-machined min-h-12 border border-[var(--hairline)] px-6 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
              aria-expanded={showChangePassword}
            >
              비밀번호 변경
            </button>
            {showChangePassword ? (
              <div className="mt-4">
                <ChangePasswordPanel />
              </div>
            ) : null}
          </div>
        </section>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hairline)] bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-2 gap-2 p-3">
          <button
            type="button"
            onClick={() => {
              setCloneSource(null);
              setView("list");
            }}
            className={`focus-ring min-h-12 text-sm font-bold uppercase ${
              view === "list" ? "border border-white bg-white text-black" : "border border-[var(--hairline)] text-[var(--text-body)]"
            }`}
          >
            내 설문
          </button>
          <button
            type="button"
            onClick={() => {
              setCloneSource(null);
              setView("create");
            }}
            className={`focus-ring min-h-12 text-sm font-bold uppercase ${
              view === "create" ? "border border-white bg-white text-black" : "border border-[var(--hairline)] text-[var(--text-body)]"
            }`}
          >
            새 설문
          </button>
        </div>
      </nav>

      {qrSurvey ? (
        <QrPreview
          fullscreen
          url={buildParticipantSurveyUrl(qrSurvey.id)}
          title={qrSurvey.title}
          size={280}
          downloadFileName={`CCON_설문_QR_${qrSurvey.sub_business}.png`}
          onClose={() => setQrSurvey(null)}
        />
      ) : null}
    </>
  );
}
