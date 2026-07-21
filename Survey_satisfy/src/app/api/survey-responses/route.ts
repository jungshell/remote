import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { checkRateLimit, getClientIp, readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { canAccessSurvey, staffSurveyScopeMissing } from "@/lib/auth/survey-access";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json, SurveyResponseRow } from "@/lib/supabase/database.types";

/** 담당자/관리자: 스코프 내 응답 조회 (담당자는 본인 사업만) */
export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const user = auth.user;

  if (staffSurveyScopeMissing(user)) {
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

  // 특정 설문 조회 시 접근 권한 사전 검증
  if (surveyId) {
    const { data: survey } = await supabase.from("surveys").select("*").eq("id", surveyId).maybeSingle();
    if (!survey || !canAccessSurvey(user, survey)) {
      return NextResponse.json({ ok: false, error: "해당 설문 응답에 접근할 수 없습니다." }, { status: 403 });
    }
  }

  const { rows, error } = await fetchAllRows<SurveyResponseRow>((from, to) => {
    let query = supabase
      .from("survey_responses")
      .select("*")
      .order("submitted_at", { ascending: false })
      .range(from, to);

    // 담당자는 본인 사업 범위로 강제 스코프 (관리자는 전체)
    if (user.role !== "admin") {
      query = query
        .eq("business", (user.business ?? "").trim())
        .eq("sub_business", (user.subBusiness ?? "").trim());
    }

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

  // 관리 화면에 edit_token 노출 불필요
  const safeRows = rows.map((row) => {
    const { edit_token, ...rest } = row as SurveyResponseRow & { edit_token?: string | null };
    void edit_token;
    return rest;
  });

  return NextResponse.json({ ok: true, rows: safeRows });
}

interface SubmitBody {
  surveyId?: string;
  phoneLast4?: string | null;
  editToken?: string | null;
  answers?: Array<{ questionId?: unknown; value?: unknown }>;
}

const MAX_ANSWERS = 200;
const MAX_TEXT_LENGTH = 5000;

/**
 * 참여자 응답 제출/수정 (서버 only).
 * - rate limit + 입력 검증 + 설문 상태 검증 + 서버 파생 분류값
 * - 뒤 4자리 제공 시: 최초 제출에 수정 토큰(edit_token) 발급, 수정은 토큰 일치 시에만 허용
 * - 뒤 4자리 미제공(익명): 단순 삽입, 수정 불가
 */
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

  const surveyId = body.surveyId.trim();
  const phoneLast4 = body.phoneLast4 ? String(body.phoneLast4).trim() : null;
  const editToken = body.editToken ? String(body.editToken).trim() : null;

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
    .eq("id", surveyId)
    .maybeSingle();

  if (surveyError) {
    console.error("[survey-responses] 설문 조회 실패:", surveyError.message);
    return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (!survey || survey.status !== "진행중") {
    return NextResponse.json({ ok: false, error: "진행 중인 설문이 아닙니다." }, { status: 404 });
  }

  // 분류값은 클라이언트 입력이 아닌 설문 원본에서 파생
  const basePayload = {
    survey_id: survey.id,
    division: survey.division,
    business: survey.business,
    sub_business: survey.sub_business,
    program_type: survey.program_type,
    phone_last4: phoneLast4,
    answers: answers as unknown as Json,
    submitted_at: new Date().toISOString(),
  };

  // 익명 응답: 단순 삽입 (중복 방지·수정 불가)
  if (!phoneLast4) {
    const { error } = await supabase.from("survey_responses").insert(basePayload);
    if (error) {
      console.error("[survey-responses] 저장 실패:", error.message);
      return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, updated: false });
  }

  // 기존 응답 확인 → 수정은 토큰 일치 시에만
  const { data: existing } = await supabase
    .from("survey_responses")
    .select("id, edit_token")
    .eq("survey_id", survey.id)
    .eq("phone_last4", phoneLast4)
    .maybeSingle();

  if (existing?.id) {
    if (!editToken || !existing.edit_token || existing.edit_token !== editToken) {
      return NextResponse.json(
        { ok: false, error: "이미 제출된 응답입니다. 처음 제출한 기기에서만 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("survey_responses")
      .update({
        division: survey.division,
        business: survey.business,
        sub_business: survey.sub_business,
        program_type: survey.program_type,
        answers: basePayload.answers,
        submitted_at: basePayload.submitted_at,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[survey-responses] 수정 실패:", error.message);
      return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: true, editToken: existing.edit_token });
  }

  const newToken = randomBytes(24).toString("hex");
  const { error } = await supabase.from("survey_responses").insert({ ...basePayload, edit_token: newToken });

  if (error) {
    console.error("[survey-responses] 저장 실패:", error.message);
    return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: false, editToken: newToken });
}
