import { NextResponse } from "next/server";
import { buildSurveyQuestions } from "@/constants/general-questions";
import { getDefaultSelectedQuestionIds } from "@/constants/question-pool";
import { readJsonBody } from "@/lib/api/http";
import {
  canAccessSurvey,
  pairInScope,
  staffSurveyScopeMissing,
  userBusinessNames,
  userBusinessPairs,
} from "@/lib/auth/survey-access";
import { requireAuthUser } from "@/lib/auth/server";
import { generateSurveyId, parseQuestions } from "@/lib/surveys/utils";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Division, ProgramType, Question, RespondentType } from "@/types/platform";
import type { Database, Json, SurveyRow } from "@/lib/supabase/database.types";

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
  customQuestions?: Question[];
  activate?: boolean;
}

interface PatchSurveyBody {
  id?: string;
  status?: string;
  title?: string;
  year?: number;
  round?: number;
  targetResponses?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  selectedQuestionIds?: string[];
  customQuestions?: Question[];
}

export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  if (staffSurveyScopeMissing(auth.user)) {
    return NextResponse.json(
      { ok: false, error: "담당 사업 프로필을 먼저 저장해 주세요.", rows: [], responseCounts: {} },
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

  const isAdmin = auth.user.role === "admin";
  const scopePairs = userBusinessPairs(auth.user);
  const scopeNames = userBusinessNames(auth.user);

  const { rows: rawRows, error } = await fetchAllRows<SurveyRow>((from, to) => {
    let query = supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    // 담당자는 본인이 맡은 사업명들로 1차 스코프 (관리자는 전체)
    if (!isAdmin && scopeNames.length > 0) {
      query = query.in("business", scopeNames);
    }

    return query;
  });

  if (error) {
    console.error("[surveys] 조회 실패:", error);
    return NextResponse.json({ ok: false, error: "설문 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 정확한 (사업명, 세부사업) 쌍으로 최종 필터 (소유 설문 포함)
  const rows = isAdmin
    ? rawRows
    : rawRows.filter(
        (row) => row.owner_user_id === auth.user!.id || pairInScope(scopePairs, row.business, row.sub_business),
      );

  const ids = rows.map((row) => row.id);
  const counts: Record<string, number> = {};

  if (ids.length > 0) {
    const { rows: responseRows } = await fetchAllRows<{ survey_id: string }>((from, to) =>
      supabase.from("survey_responses").select("survey_id").in("survey_id", ids).range(from, to),
    );
    for (const row of responseRows) {
      counts[row.survey_id] = (counts[row.survey_id] ?? 0) + 1;
    }
  }

  return NextResponse.json({ ok: true, rows, responseCounts: counts });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  if (staffSurveyScopeMissing(auth.user) && auth.user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "담당 사업 프로필을 먼저 저장해 주세요." }, { status: 403 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const body = await readJsonBody<CreateSurveyBody>(request);

  if (!body || !body.title || !body.division || !body.business || !body.subBusiness || !body.programType) {
    return NextResponse.json({ ok: false, error: "필수 항목을 입력해 주세요." }, { status: 400 });
  }

  // 담당자는 본인이 맡은 사업(다중) 중 하나로만 생성
  if (auth.user.role !== "admin") {
    if (!pairInScope(userBusinessPairs(auth.user), body.business, body.subBusiness)) {
      return NextResponse.json({ ok: false, error: "본인 담당 사업으로만 설문을 만들 수 있습니다." }, { status: 403 });
    }
  }

  const year = body.year ?? new Date().getFullYear();
  const round = body.round ?? 1;
  const respondentType = body.respondentType ?? "both";
  const selectedIds = body.selectedQuestionIds?.length
    ? body.selectedQuestionIds
    : getDefaultSelectedQuestionIds(body.programType);
  const customQuestions = parseQuestions(body.customQuestions ?? []).slice(0, 20);
  const questions = buildSurveyQuestions(body.programType, respondentType, selectedIds, customQuestions);
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
      status: body.activate ? "진행중" : "작성중",
      starts_at: body.startsAt ? new Date(body.startsAt).toISOString() : null,
      ends_at: body.endsAt ? new Date(body.endsAt).toISOString() : null,
      custom_questions: questions as unknown as Json,
      owner_user_id: auth.user.id,
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

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const body = await readJsonBody<PatchSurveyBody>(request);

  if (!body || !body.id) {
    return NextResponse.json({ ok: false, error: "id가 필요합니다." }, { status: 400 });
  }

  if (body.status !== undefined && !SURVEY_STATUSES.has(body.status)) {
    return NextResponse.json({ ok: false, error: "허용되지 않은 상태값입니다." }, { status: 400 });
  }

  const { data: existing, error: lookupError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", body.id)
    .single();

  if (lookupError || !existing) {
    return NextResponse.json({ ok: false, error: lookupError?.message ?? "설문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!canAccessSurvey(auth.user, existing)) {
    return NextResponse.json({ ok: false, error: "이 설문을 수정할 권한이 없습니다." }, { status: 403 });
  }

  const wantsMetaEdit =
    body.title !== undefined ||
    body.year !== undefined ||
    body.round !== undefined ||
    body.targetResponses !== undefined ||
    body.startsAt !== undefined ||
    body.endsAt !== undefined ||
    body.selectedQuestionIds !== undefined ||
    body.customQuestions !== undefined;

  if (wantsMetaEdit && existing.status !== "작성중") {
    return NextResponse.json(
      { ok: false, error: "작성중 상태의 설문만 내용·기간을 수정할 수 있습니다." },
      { status: 400 },
    );
  }

  if (!body.status && !wantsMetaEdit) {
    return NextResponse.json({ ok: false, error: "수정할 항목이 없습니다." }, { status: 400 });
  }

  const patch: Database["public"]["Tables"]["surveys"]["Update"] = {};

  if (body.status) {
    patch.status = body.status;
  }
  if (body.title !== undefined) {
    patch.title = body.title;
  }
  if (body.year !== undefined) {
    patch.year = body.year;
  }
  if (body.round !== undefined) {
    patch.round = body.round;
  }
  if (body.targetResponses !== undefined) {
    patch.target_responses = body.targetResponses;
  }
  if (body.startsAt !== undefined) {
    patch.starts_at = body.startsAt ? new Date(body.startsAt).toISOString() : null;
  }
  if (body.endsAt !== undefined) {
    patch.ends_at = body.endsAt ? new Date(body.endsAt).toISOString() : null;
  }

  if (body.selectedQuestionIds !== undefined || body.customQuestions !== undefined) {
    const programType = existing.program_type as ProgramType;
    const respondentType = (existing.respondent_type as RespondentType) ?? "both";
    const selectedIds = body.selectedQuestionIds?.length
      ? body.selectedQuestionIds
      : getDefaultSelectedQuestionIds(programType);
    const customQuestions = parseQuestions(body.customQuestions ?? []).slice(0, 20);
    patch.custom_questions = buildSurveyQuestions(
      programType,
      respondentType,
      selectedIds,
      customQuestions,
    ) as unknown as Json;
  }

  // 소유자 없는 옛 설문은 첫 수정 담당자를 소유자로 귀속
  if (!existing.owner_user_id) {
    patch.owner_user_id = auth.user.id;
  }

  const { data, error } = await supabase.from("surveys").update(patch).eq("id", body.id).select("*").single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, survey: data });
}
