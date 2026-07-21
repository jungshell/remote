import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ImprovementActionRow } from "@/lib/supabase/database.types";
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

  const { rows, error } = await fetchAllRows<ImprovementActionRow>((from, to) => {
    let query = supabase
      .from("improvement_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

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

    return query;
  });

  if (error) {
    console.error("[improvement-actions] 조회 실패:", error);
    return NextResponse.json({ ok: false, error: "개선과제 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows });
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

  const body = await readJsonBody<CreateBody>(request);

  if (!body || !body.surveyId || !body.title?.trim()) {
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
