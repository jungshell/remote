"use client";

import { Badge } from "@/components/ui/Badge";
import { buildParticipantSurveyUrl } from "@/lib/supabase/responses";
import type { ManagerAlert } from "@/lib/surveys/manager-alerts";
import type { SurveyRow } from "@/lib/supabase/database.types";

interface ManagerSurveyCardProps {
  survey: SurveyRow;
  alerts?: ManagerAlert[];
  responseCount?: number;
  isBusy?: boolean;
  onOpen: () => void;
  onStart: () => void;
  onCopyLink: () => void;
  onShare: () => void;
  onShowQr: () => void;
  onClone: () => void;
}

export function ManagerSurveyCard({
  survey,
  alerts = [],
  responseCount = 0,
  isBusy,
  onOpen,
  onStart,
  onCopyLink,
  onShare,
  onShowQr,
  onClone,
}: ManagerSurveyCardProps) {
  const canStart = survey.status === "작성중" || survey.status === "종료";
  const isActive = survey.status === "진행중";
  const surveyUrl = buildParticipantSurveyUrl(survey.id);

  return (
    <article
      className="animate-stagger border-b border-[var(--hairline)] p-4 transition-colors hover:bg-white/[0.03] sm:p-6"
      style={{ ["--stagger" as string]: "40ms" }}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isActive ? "success" : survey.status === "종료" ? "default" : "warning"}>
            {survey.status}
          </Badge>
          <span className="text-xs text-[var(--text-muted)] sm:text-sm">
            {survey.year ?? "-"} · {survey.round ?? 1}회차 · 응답 {responseCount}/{survey.target_responses}
          </span>
        </div>
        {alerts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {alerts.map((alert) => (
              <span
                key={`${survey.id}-${alert.kind}-${alert.label}`}
                className="border border-[var(--warning)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--warning)]"
              >
                {alert.label}
              </span>
            ))}
          </div>
        ) : null}
        <h3 className="mt-3 text-lg font-bold leading-snug text-white sm:text-xl">{survey.title}</h3>
        <p className="mt-2 text-sm text-[var(--text-body)]">
          {survey.business} / {survey.sub_business}
        </p>
        <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-muted)]">{surveyUrl}</p>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {canStart ? (
          <ActionButton
            label={isBusy ? "시작 중" : survey.status === "종료" ? "다시 시작" : "시작"}
            primary
            onClick={onStart}
            disabled={isBusy}
          />
        ) : null}
        {isActive ? <ActionButton label="QR" primary onClick={onShowQr} /> : null}
        <ActionButton label="링크 복사" onClick={onCopyLink} />
        <ActionButton label="공유" onClick={onShare} />
        <ActionButton label="상세" onClick={onOpen} />
        <ActionButton label="다음 회차" onClick={onClone} />
      </div>
    </article>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`focus-ring min-h-11 px-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50 ${
        primary
          ? "border border-white bg-white text-black"
          : "border border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
