import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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

  let query = supabase.from("survey_responses").select("*").order("submitted_at", { ascending: false });

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

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}
