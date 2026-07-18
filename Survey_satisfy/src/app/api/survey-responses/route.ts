import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { canAccessSurvey, staffSurveyScopeMissing } from "@/lib/auth/survey-access";
import { requireAuthUser } from "@/lib/auth/server";
import type { Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { SurveyAnswer } from "@/types/platform";

function isAnswerArray(value: unknown): value is SurveyAnswer[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "questionId" in item &&
        "value" in item &&
        typeof (item as SurveyAnswer).questionId === "string",
    )
  );
}

/** 담당자/관리자: 스코프 내 응답 조회 */
export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  if (staffSurveyScopeMissing(auth.user)) {
    return NextResponse.json(
      { ok: false, error: "담당 사업 프로필을 먼저 저장해 주세요." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("survey_id");
  const division = searchParams.get("division");
  const subBusiness = searchParams.get("sub_business");
  const programType = searchParams.get("program_type");

  let query = supabase.from("survey_responses").select("*").order("submitted_at", { ascending: false });

  if (auth.user.role !== "admin") {
    query = query.eq("business", auth.user.business!.trim()).eq("sub_business", auth.user.subBusiness!.trim());
  }

  if (surveyId) {
    const { data: survey } = await supabase.from("surveys").select("*").eq("id", surveyId).maybeSingle();
    if (!survey || !canAccessSurvey(auth.user, survey)) {
      return NextResponse.json({ ok: false, error: "해당 설문 응답에 접근할 수 없습니다." }, { status: 403 });
    }
    query = query.eq("survey_id", surveyId);
  }

  if (division) {
    query = query.eq("division", division);
  }
  if (subBusiness) {
    query = query.eq("sub_business", subBusiness);
  }
  if (programType) {
    query = query.eq("program_type", programType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 관리자 화면에 edit_token 노출 불필요
  const rows = (data ?? []).map((row) => {
    const { edit_token: _token, ...rest } = row;
    return rest;
  });

  return NextResponse.json({ ok: true, rows });
}

/** 참여자: 응답 제출/수정 (서버 only) */
export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = (await request.json()) as {
    surveyId?: string;
    phoneLast4?: string;
    editToken?: string | null;
    answers?: SurveyAnswer[];
  };

  const surveyId = body.surveyId?.trim() ?? "";
  const phoneLast4 = body.phoneLast4?.trim() ?? "";
  const editToken = body.editToken?.trim() || null;

  if (!surveyId || !/^\d{4}$/.test(phoneLast4)) {
    return NextResponse.json({ ok: false, error: "설문 ID와 휴대폰 뒤 4자리가 필요합니다." }, { status: 400 });
  }

  if (!isAnswerArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ ok: false, error: "응답 내용이 필요합니다." }, { status: 400 });
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .maybeSingle();

  if (surveyError || !survey) {
    return NextResponse.json({ ok: false, error: "설문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (survey.status !== "진행중") {
    return NextResponse.json({ ok: false, error: "진행 중인 설문만 응답할 수 있습니다." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("survey_responses")
    .select("id, edit_token")
    .eq("survey_id", surveyId)
    .eq("phone_last4", phoneLast4)
    .maybeSingle();

  if (existing?.id) {
    if (!editToken || !existing.edit_token || existing.edit_token !== editToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "이미 제출된 응답입니다. 같은 기기에서 다시 접속하거나, 처음 제출 시 저장된 수정 권한이 필요합니다.",
        },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("survey_responses")
      .update({
        answers: body.answers as unknown as Json,
        submitted_at: new Date().toISOString(),
        division: survey.division,
        business: survey.business,
        sub_business: survey.sub_business,
        program_type: survey.program_type,
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: true, editToken: existing.edit_token });
  }

  const newToken = randomBytes(24).toString("hex");
  const { error } = await supabase.from("survey_responses").insert({
    survey_id: surveyId,
    division: survey.division,
    business: survey.business,
    sub_business: survey.sub_business,
    program_type: survey.program_type,
    phone_last4: phoneLast4,
    answers: body.answers as unknown as Json,
    edit_token: newToken,
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: false, editToken: newToken });
}
