import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ImprovementSource, ImprovementStatus } from "@/lib/improvement/suggest";

interface CreateBody {
  surveyId?: string;
  title?: string;
  source?: ImprovementSource;
  ownerName?: string;
  dueDate?: string | null;
  status?: ImprovementStatus;
  relatedQuestionId?: string | null;
  relatedQuestionLabel?: string | null;
  memo?: string;
  division?: string;
  year?: number;
}

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
  const division = searchParams.get("division");
  const year = searchParams.get("year");
  const status = searchParams.get("status");

  let query = supabase.from("improvement_actions").select("*").order("created_at", { ascending: false });

  if (surveyId) {
    query = query.eq("survey_id", surveyId);
  }
  if (division) {
    query = query.eq("division", division);
  }
  if (year) {
    query = query.eq("year", Number(year));
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
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

  const body = (await request.json()) as CreateBody;

  if (!body.surveyId || !body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "설문과 과제명을 입력해 주세요." }, { status: 400 });
  }

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("id, division, year, title")
    .eq("id", body.surveyId)
    .maybeSingle();

  if (surveyError || !survey) {
    return NextResponse.json({ ok: false, error: "설문을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("improvement_actions")
    .insert({
      survey_id: body.surveyId,
      title: body.title.trim(),
      source: body.source ?? "manual",
      owner_name: body.ownerName?.trim() ?? "",
      due_date: body.dueDate || null,
      status: body.status ?? "등록",
      related_question_id: body.relatedQuestionId ?? null,
      related_question_label: body.relatedQuestionLabel ?? null,
      memo: body.memo?.trim() ?? "",
      division: body.division ?? survey.division,
      year: body.year ?? survey.year ?? new Date().getFullYear(),
      created_by: auth.user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: data });
}
