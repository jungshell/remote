import { NextResponse } from "next/server";
import { surveyRowToRecord } from "@/lib/surveys/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await supabase.from("surveys").select("*").eq("id", id).maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data || data.status !== "진행중") {
    return NextResponse.json({ ok: false, error: "진행 중인 설문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, survey: surveyRowToRecord(data) });
}
