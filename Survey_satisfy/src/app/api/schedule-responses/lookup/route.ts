import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, readJsonBody } from "@/lib/api/http";
import { parseSelections } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * 참여자(공개): 이름으로 본인의 이전 응답을 조회해 폼에 다시 채우기 위한 용도.
 * 이름은 URL이 아닌 요청 본문으로 받는다(개인정보 보호).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`schedule-lookup:${ip}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<{ pollId?: string; respondentName?: string }>(request);
  const pollId = body?.pollId?.trim();
  const respondentName = body?.respondentName?.trim();

  if (!pollId || !respondentName) {
    return NextResponse.json({ ok: false, error: "이름을 입력해 주세요." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_responses")
    .select("selections, note")
    .eq("poll_id", pollId)
    .eq("respondent_name", respondentName)
    .maybeSingle();

  if (error) {
    console.error("[schedule-responses/lookup] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: true, found: false });
  }

  return NextResponse.json({
    ok: true,
    found: true,
    response: { selections: parseSelections(data.selections), note: data.note ?? "" },
  });
}
