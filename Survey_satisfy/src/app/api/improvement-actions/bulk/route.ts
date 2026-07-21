import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import type { ImprovementSuggestion } from "@/lib/improvement/suggest";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_BULK_ITEMS = 200;

interface BulkBody {
  suggestions?: ImprovementSuggestion[];
  ownerName?: string;
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service role이 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<BulkBody>(request);
  const suggestions = body?.suggestions ?? [];

  if (suggestions.length === 0) {
    return NextResponse.json({ ok: false, error: "등록할 초안이 없습니다." }, { status: 400 });
  }

  if (suggestions.length > MAX_BULK_ITEMS) {
    return NextResponse.json({ ok: false, error: `한 번에 ${MAX_BULK_ITEMS}건까지 등록할 수 있습니다.` }, { status: 400 });
  }

  const invalid = suggestions.find(
    (item) => typeof item.surveyId !== "string" || !item.surveyId || typeof item.title !== "string" || !item.title.trim(),
  );

  if (invalid) {
    return NextResponse.json({ ok: false, error: "초안 항목에 설문 ID 또는 과제명이 없습니다." }, { status: 400 });
  }

  // FK 위반으로 배치 전체가 실패하지 않도록 설문 존재 여부를 사전 확인
  const surveyIds = Array.from(new Set(suggestions.map((item) => item.surveyId)));
  const { data: existingSurveys, error: surveyError } = await supabase
    .from("surveys")
    .select("id")
    .in("id", surveyIds);

  if (surveyError) {
    console.error("[improvement-actions/bulk] 설문 확인 실패:", surveyError.message);
    return NextResponse.json({ ok: false, error: "설문 확인 중 오류가 발생했습니다." }, { status: 500 });
  }

  const validIds = new Set((existingSurveys ?? []).map((row) => row.id));
  const missing = surveyIds.filter((id) => !validIds.has(id));

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `존재하지 않는 설문이 포함되어 있습니다: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const due = new Date();
  due.setDate(due.getDate() + 30);
  const dueDate = due.toISOString().slice(0, 10);

  const payload = suggestions.map((item) => ({
    survey_id: item.surveyId,
    title: item.title,
    source: item.source,
    owner_name: body?.ownerName?.trim() ?? "",
    due_date: dueDate,
    status: "등록",
    related_question_id: item.relatedQuestionId ?? null,
    related_question_label: item.relatedQuestionLabel ?? null,
    memo: item.memo,
    division: item.division,
    year: item.year,
    created_by: auth.user!.id,
  }));

  const { data, error } = await supabase.from("improvement_actions").insert(payload).select("*");

  if (error) {
    console.error("[improvement-actions/bulk] 등록 실패:", error.message);
    return NextResponse.json({ ok: false, error: "개선과제 등록 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}
