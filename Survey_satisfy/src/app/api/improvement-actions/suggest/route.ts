import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { buildImprovementSuggestions } from "@/lib/improvement/suggest";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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

  let surveyQuery = supabase.from("surveys").select("*").order("created_at", { ascending: false });
  if (surveyId) {
    surveyQuery = surveyQuery.eq("id", surveyId);
  }
  if (year) {
    surveyQuery = surveyQuery.eq("year", Number(year));
  }

  const { data: surveys, error: surveyError } = await surveyQuery;

  if (surveyError) {
    return NextResponse.json({ ok: false, error: surveyError.message }, { status: 500 });
  }

  const surveyRows = surveys ?? [];
  if (surveyRows.length === 0) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

  const ids = surveyRows.map((survey) => survey.id);
  const { data: responses, error: responseError } = await supabase
    .from("survey_responses")
    .select("*")
    .in("survey_id", ids);

  if (responseError) {
    return NextResponse.json({ ok: false, error: responseError.message }, { status: 500 });
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

  const suggestions = buildImprovementSuggestions(surveyRows, responses ?? []).filter((item) => {
    const key = `${item.surveyId}|${item.source}|${item.relatedQuestionId ?? item.title}`;
    return !existingKeys.has(key);
  });

  return NextResponse.json({ ok: true, suggestions });
}
