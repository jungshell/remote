import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { buildImprovementSuggestions } from "@/lib/improvement/suggest";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { SurveyResponseRow, SurveyRow } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service role이 설정되지 않았습니다." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("survey_id");
  const year = searchParams.get("year");

  const { rows: surveyRows, error: surveyError } = await fetchAllRows<SurveyRow>((from, to) => {
    let surveyQuery = supabase.from("surveys").select("*").order("created_at", { ascending: false }).range(from, to);
    if (surveyId) {
      surveyQuery = surveyQuery.eq("id", surveyId);
    }
    if (year) {
      surveyQuery = surveyQuery.eq("year", Number(year));
    }
    return surveyQuery;
  });

  if (surveyError) {
    console.error("[improvement-actions/suggest] 설문 조회 실패:", surveyError);
    return NextResponse.json({ ok: false, error: "설문 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (surveyRows.length === 0) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

  const ids = surveyRows.map((survey) => survey.id);
  const { rows: responses, error: responseError } = await fetchAllRows<SurveyResponseRow>((from, to) =>
    supabase.from("survey_responses").select("*").in("survey_id", ids).order("submitted_at").range(from, to),
  );

  if (responseError) {
    console.error("[improvement-actions/suggest] 응답 조회 실패:", responseError);
    return NextResponse.json({ ok: false, error: "응답 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("improvement_actions")
    .select("survey_id, related_question_id, source, title")
    .in("survey_id", ids);

  const existingKeys = new Set(
    (existing ?? []).map(
      (row) => `${row.survey_id}|${row.source}|${row.related_question_id ?? row.title}`,
    ),
  );

  const suggestions = buildImprovementSuggestions(surveyRows, responses).filter((item) => {
    const key = `${item.surveyId}|${item.source}|${item.relatedQuestionId ?? item.title}`;
    return !existingKeys.has(key);
  });

  return NextResponse.json({ ok: true, suggestions });
}
