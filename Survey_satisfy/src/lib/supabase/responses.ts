import { authFetch } from "@/lib/auth/access";
import type { SurveyAnswer } from "@/types/platform";

interface SubmitSurveyResponseInput {
  surveyId: string;
  phoneLast4: string;
  answers: SurveyAnswer[];
}

export function buildParticipantSurveyUrl(surveyId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/survey/${surveyId}?role=user`;
}

/** 참여자 응답 제출 — 서버 라우트를 통해 저장 (anon 키 직접 DB 접근 없음) */
export async function submitSurveyResponseToSupabase({
  surveyId,
  phoneLast4,
  answers,
}: SubmitSurveyResponseInput) {
  const response = await fetch("/api/survey-responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      surveyId,
      phoneLast4: phoneLast4 || null,
      answers,
    }),
  });

  const data = (await response.json()) as { ok: boolean; updated?: boolean; error?: string };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "응답 저장에 실패했습니다.");
  }

  return { updated: Boolean(data.updated) };
}

export async function activateSurveyStatus(surveyId: string) {
  const response = await authFetch("/api/surveys", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: surveyId, status: "진행중" }),
  });

  const data = (await response.json()) as { ok: boolean; error?: string };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "설문 활성화에 실패했습니다.");
  }

  return true;
}
