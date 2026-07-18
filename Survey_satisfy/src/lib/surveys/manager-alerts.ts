export type ManagerAlertKind = "ending_soon" | "near_target" | "no_response" | "draft";

export interface ManagerAlert {
  kind: ManagerAlertKind;
  label: string;
}

interface SurveyAlertInput {
  id: string;
  status: string;
  target_responses: number;
  ends_at: string | null;
  starts_at?: string | null;
  responseCount?: number;
}

export function buildManagerAlerts(survey: SurveyAlertInput): ManagerAlert[] {
  const alerts: ManagerAlert[] = [];
  const count = survey.responseCount ?? 0;
  const target = Math.max(1, survey.target_responses || 1);

  if (survey.status === "작성중") {
    alerts.push({ kind: "draft", label: "작성중 · 시작 필요" });
  }

  if (survey.status === "진행중") {
    if (survey.ends_at) {
      const ends = new Date(survey.ends_at).getTime();
      const daysLeft = (ends - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysLeft >= 0 && daysLeft <= 3) {
        alerts.push({ kind: "ending_soon", label: `종료 ${Math.ceil(daysLeft)}일 전` });
      }
    }

    const rate = count / target;
    if (rate >= 0.8) {
      alerts.push({ kind: "near_target", label: `목표 ${Math.round(rate * 100)}%` });
    }

    if (count === 0 && survey.starts_at) {
      const startedDays = (Date.now() - new Date(survey.starts_at).getTime()) / (1000 * 60 * 60 * 24);
      if (startedDays >= 2) {
        alerts.push({ kind: "no_response", label: "응답 0건" });
      }
    } else if (count === 0) {
      alerts.push({ kind: "no_response", label: "응답 0건" });
    }
  }

  return alerts;
}
