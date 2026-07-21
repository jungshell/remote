import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/http";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surveyId = searchParams.get("survey_id");
  const phoneLast4 = searchParams.get("phone_last4");

  if (!surveyId || !phoneLast4 || !/^\d{4}$/.test(phoneLast4)) {
    return NextResponse.json({ ok: false, error: "survey_id와 phone_last4가 필요합니다." }, { status: 400 });
  }

  // 뒤 4자리는 조합이 1만 개뿐이므로 무차별 대입 열람을 막기 위해 조회 횟수를 강하게 제한
  const ip = getClientIp(request);

  if (!checkRateLimit(`lookup:${ip}`, 10, 60_000) || !checkRateLimit(`lookup:${ip}:${surveyId}`, 6, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "조회 시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("survey_responses")
    .select("answers")
    .eq("survey_id", surveyId)
    .eq("phone_last4", phoneLast4)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: true, exists: false });
  }

  return NextResponse.json({ ok: true, exists: true, answers: data.answers });
}
