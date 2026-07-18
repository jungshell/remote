import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { parseQuestions } from "@/lib/surveys/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Question, RespondentType } from "@/types/platform";
import type { Json } from "@/lib/supabase/database.types";

function parseSelectedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const business = searchParams.get("business")?.trim() ?? "";
  const subBusiness = searchParams.get("subBusiness")?.trim() ?? "";
  const programType = searchParams.get("programType")?.trim() ?? "";

  let query = supabase
    .from("survey_templates")
    .select("*")
    .eq("owner_user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (business) {
    query = query.eq("business", business);
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

  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    division?: string;
    business?: string;
    subBusiness?: string;
    programType?: string;
    respondentType?: RespondentType;
    selectedQuestionIds?: string[];
    customQuestions?: Question[];
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "템플릿 이름을 입력해 주세요." }, { status: 400 });
  }

  const customQuestions = (body.customQuestions ?? []).slice(0, 20);
  const selectedQuestionIds = body.selectedQuestionIds ?? [];

  const { data, error } = await supabase
    .from("survey_templates")
    .insert({
      owner_user_id: auth.user.id,
      name,
      division: body.division ?? "",
      business: body.business ?? "",
      sub_business: body.subBusiness ?? "",
      program_type: body.programType ?? "",
      respondent_type: body.respondentType ?? "both",
      selected_question_ids: selectedQuestionIds as unknown as Json,
      custom_questions: customQuestions as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, template: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    selectedQuestionIds?: string[];
    customQuestions?: Question[];
  };

  if (!body.id) {
    return NextResponse.json({ ok: false, error: "템플릿 id가 필요합니다." }, { status: 400 });
  }

  const patch: {
    name?: string;
    selected_question_ids?: Json;
    custom_questions?: Json;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (body.name?.trim()) {
    patch.name = body.name.trim();
  }
  if (body.selectedQuestionIds) {
    patch.selected_question_ids = body.selectedQuestionIds as unknown as Json;
  }
  if (body.customQuestions) {
    patch.custom_questions = body.customQuestions.slice(0, 20) as unknown as Json;
  }

  const { data, error } = await supabase
    .from("survey_templates")
    .update(patch)
    .eq("id", body.id)
    .eq("owner_user_id", auth.user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    template: data,
    selectedIds: parseSelectedIds(data.selected_question_ids),
    customQuestions: parseQuestions(data.custom_questions),
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase service role이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "템플릿 id가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("survey_templates")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
