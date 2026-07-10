import type { SurveyResponseInsert } from "@/lib/supabase/database.types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Project, SurveyAnswer } from "@/types/platform";

interface SubmitSurveyResponseInput {
  surveyId: string;
  project: Project;
  phoneLast4: string;
  answers: SurveyAnswer[];
}

export function buildParticipantSurveyUrl(surveyId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/survey/${surveyId}?role=user`;
}

export async function submitSurveyResponseToSupabase({
  surveyId,
  project,
  phoneLast4,
  answers,
}: SubmitSurveyResponseInput) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 ANON_KEY를 확인하세요.");
  }

  const payload: SurveyResponseInsert = {
    survey_id: surveyId,
    division: project.division,
    business: project.business,
    sub_business: project.subBusiness,
    program_type: project.type,
    phone_last4: phoneLast4,
    answers: answers as unknown as SurveyResponseInsert["answers"],
    submitted_at: new Date().toISOString(),
  };

  const { data: existing, error: lookupError } = await supabase
    .from("survey_responses")
    .select("id")
    .eq("survey_id", surveyId)
    .eq("phone_last4", phoneLast4)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing?.id) {
    const { error } = await supabase.from("survey_responses").update(payload).eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return { updated: true };
  }

  const { error } = await supabase.from("survey_responses").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  return { updated: false };
}

import { authFetch } from "@/lib/auth/access";

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
