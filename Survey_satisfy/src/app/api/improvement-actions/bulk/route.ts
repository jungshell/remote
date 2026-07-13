import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import type { ImprovementSuggestion } from "@/lib/improvement/suggest";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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

  const body = (await request.json()) as BulkBody;
  const suggestions = body.suggestions ?? [];

  if (suggestions.length === 0) {
    return NextResponse.json({ ok: false, error: "등록할 초안이 없습니다." }, { status: 400 });
  }

  const due = new Date();
  due.setDate(due.getDate() + 30);
  const dueDate = due.toISOString().slice(0, 10);

  const payload = suggestions.map((item) => ({
    survey_id: item.surveyId,
    title: item.title,
    source: item.source,
    owner_name: body.ownerName?.trim() ?? "",
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}
