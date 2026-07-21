import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY를 추가하세요." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("survey_id");
  const division = searchParams.get("division");
  const subBusiness = searchParams.get("sub_business");
  const programType = searchParams.get("program_type");

  const { rows, error } = await fetchAllRows<SurveyResponseRow>((from, to) => {
    let query = supabase
      .from("survey_responses")
      .select("*")
      .order("submitted_at", { ascending: false })
      .range(from, to);

    if (surveyId) {
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

    return query;
  });

  if (error) {
    console.error("[survey-responses] 조회 실패:", error);
    return NextResponse.json({ ok: false, error: "응답 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows });
}

interface SubmitBody {
  surveyId?: string;
  phoneLast4?: string | null;
  answers?: Array<{ questionId?: unknown; value?: unknown }>;
}

const MAX_ANSWERS = 200;
const MAX_TEXT_LENGTH = 5000;

/** 참여자 응답 제출 — 인증 없이 허용하되 rate limit + 설문 상태 검증 + 서버 파생값 사용 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!checkRateLimit(`submit:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<SubmitBody>(request);

  if (!body || typeof body.surveyId !== "string" || !body.surveyId) {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const phoneLast4 = body.phoneLast4 ?? null;

  if (phoneLast4 !== null && !/^\d{4}$/.test(phoneLast4)) {
    return NextResponse.json({ ok: false, error: "휴대폰 뒤 4자리 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > MAX_ANSWERS) {
    return NextResponse.json({ ok: false, error: "답변 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const answers: Array<{ questionId: string; value: string | number }> = [];

  for (const answer of body.answers) {
    if (typeof answer?.questionId !== "string" || answer.questionId.length === 0 || answer.questionId.length > 100) {
      return NextResponse.json({ ok: false, error: "답변 형식이 올바르지 않습니다." }, { status: 400 });
    }

    if (typeof answer.value === "number" && Number.isFinite(answer.value)) {
      answers.push({ questionId: answer.questionId, value: answer.value });
    } else if (typeof answer.value === "string") {
      answers.push({ questionId: answer.questionId, value: answer.value.slice(0, MAX_TEXT_LENGTH) });
    } else {
      return NextResponse.json({ ok: false, error: "답변 형식이 올바르지 않습니다." }, { status: 400 });
    }
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, division, business, sub_business, program_type, status")
    .eq("id", body.surveyId)
    .maybeSingle();

  if (surveyError) {
    console.error("[survey-responses] 설문 조회 실패:", surveyError.message);
    return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (!survey || survey.status !== "진행중") {
    return NextResponse.json({ ok: false, error: "진행 중인 설문이 아닙니다." }, { status: 404 });
  }

  // division 등 분류값은 클라이언트 입력이 아닌 설문 원본에서 파생
  const payload = {
    survey_id: survey.id,
    division: survey.division,
    business: survey.business,
    sub_business: survey.sub_business,
    program_type: survey.program_type,
    phone_last4: phoneLast4,
    answers: answers as unknown as SurveyResponseRow["answers"],
    submitted_at: new Date().toISOString(),
  };

  let updated = false;

  if (phoneLast4) {
    const { count } = await supabase
      .from("survey_responses")
      .select("id", { count: "exact", head: true })
      .eq("survey_id", survey.id)
      .eq("phone_last4", phoneLast4);

    updated = (count ?? 0) > 0;

    const { error } = await supabase
      .from("survey_responses")
      .upsert(payload, { onConflict: "survey_id,phone_last4" });

    if (error) {
      console.error("[survey-responses] 저장 실패:", error.message);
      return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from("survey_responses").insert(payload);

    if (error) {
      console.error("[survey-responses] 저장 실패:", error.message);
      return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, updated });
}
