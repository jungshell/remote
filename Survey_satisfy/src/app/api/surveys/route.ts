import { NextResponse } from "next/server";
import { buildSurveyQuestions } from "@/constants/general-questions";
import { getDefaultSelectedQuestionIds } from "@/constants/question-pool";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { generateSurveyId } from "@/lib/surveys/utils";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Division, ProgramType, RespondentType } from "@/types/platform";
import type { Json, SurveyRow } from "@/lib/supabase/database.types";

const SURVEY_STATUSES = new Set(["작성중", "진행중", "종료"]);

interface CreateSurveyBody {
  title?: string;
  division?: Division;
  business?: string;
  subBusiness?: string;
  programType?: ProgramType;
  respondentType?: RespondentType;
  year?: number;
  round?: number;
  targetResponses?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  selectedQuestionIds?: string[];
}

export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { rows, error } = await fetchAllRows<SurveyRow>((from, to) =>
    supabase.from("surveys").select("*").order("created_at", { ascending: false }).range(from, to),
  );

  if (error) {
    console.error("[surveys] 조회 실패:", error);
    return NextResponse.json({ ok: false, error: "설문 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service role이 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<CreateSurveyBody>(request);

  if (!body || !body.title || !body.division || !body.business || !body.subBusiness || !body.programType) {
    return NextResponse.json({ ok: false, error: "필수 항목을 입력해 주세요." }, { status: 400 });
  }

  const year = body.year ?? new Date().getFullYear();
  const round = body.round ?? 1;
  const respondentType = body.respondentType ?? "both";
  const selectedIds = body.selectedQuestionIds?.length
    ? body.selectedQuestionIds
    : getDefaultSelectedQuestionIds(body.programType);
  const questions = buildSurveyQuestions(body.programType, respondentType, selectedIds);
  const id = generateSurveyId(body.subBusiness, round);

  const { data, error } = await supabase
    .from("surveys")
    .insert({
      id,
      title: body.title,
      division: body.division,
      business: body.business,
      sub_business: body.subBusiness,
      program_type: body.programType,
      respondent_type: respondentType,
      year,
      round,
      target_responses: body.targetResponses ?? 80,
      status: "작성중",
      starts_at: body.startsAt ? new Date(body.startsAt).toISOString() : null,
      ends_at: body.endsAt ? new Date(body.endsAt).toISOString() : null,
      custom_questions: questions as unknown as Json,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, survey: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service role이 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<{ id?: string; status?: string }>(request);

  if (!body || !body.id || !body.status) {
    return NextResponse.json({ ok: false, error: "id와 status가 필요합니다." }, { status: 400 });
  }

  if (!SURVEY_STATUSES.has(body.status)) {
    return NextResponse.json({ ok: false, error: "허용되지 않은 상태값입니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("surveys")
    .update({ status: body.status })
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, survey: data });
}
