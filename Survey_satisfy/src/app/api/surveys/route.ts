import { NextResponse } from "next/server";
import { buildSurveyQuestions } from "@/constants/general-questions";
import { getDefaultSelectedQuestionIds } from "@/constants/question-pool";
import { requireAuthUser } from "@/lib/auth/server";
import { generateSurveyId } from "@/lib/surveys/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Division, ProgramType, RespondentType } from "@/types/platform";
import type { Json } from "@/lib/supabase/database.types";

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

  const { data, error } = await supabase.from("surveys").select("*").order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
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

  const body = (await request.json()) as CreateSurveyBody;

  if (!body.title || !body.division || !body.business || !body.subBusiness || !body.programType) {
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
      ends_at: body.endsAt ?? null,
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

  const body = (await request.json()) as { id?: string; status?: string };

  if (!body.id || !body.status) {
    return NextResponse.json({ ok: false, error: "id와 status가 필요합니다." }, { status: 400 });
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
