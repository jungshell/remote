import type { SurveyAnswer } from "@/types/platform";
import { authFetch } from "@/lib/auth/access";

export function buildParticipantSurveyUrl(surveyId: string) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : envBase || "http://localhost:3000";
  const baseUrl = typeof window !== "undefined" ? origin : envBase || origin;
  return `${baseUrl}/survey/${surveyId}?role=user`;
}

function editTokenStorageKey(surveyId: string, phoneLast4: string) {
  return `survey-edit-token:${surveyId}:${phoneLast4}`;
}

export function getStoredEditToken(surveyId: string, phoneLast4: string) {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(editTokenStorageKey(surveyId, phoneLast4));
}

export function storeEditToken(surveyId: string, phoneLast4: string, token: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(editTokenStorageKey(surveyId, phoneLast4), token);
}

export async function submitSurveyResponseToSupabase({
  surveyId,
  phoneLast4,
  answers,
}: {
  surveyId: string;
  phoneLast4: string;
  answers: SurveyAnswer[];
}) {
  const editToken = getStoredEditToken(surveyId, phoneLast4);
  const response = await fetch("/api/survey-responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      surveyId,
      phoneLast4,
      editToken,
      answers,
    }),
  });

  const data = (await response.json()) as {
    ok: boolean;
    updated?: boolean;
    editToken?: string;
    error?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "응답 저장에 실패했습니다.");
  }

  if (data.editToken) {
    storeEditToken(surveyId, phoneLast4, data.editToken);
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
