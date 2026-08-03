import { NextResponse } from "next/server";
import { pollRowToRecord } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** 참여자(공개): 응답용 일정조사 정보 조회 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await supabase.from("schedule_polls").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[schedule-polls/public] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: "일시적인 오류가 발생했습니다." }, { status: 500 });
  }

  if (!data || data.status !== "진행중") {
    return NextResponse.json({ ok: false, error: "진행 중인 일정조사를 찾을 수 없습니다." }, { status: 404 });
  }

  const poll = pollRowToRecord(data);

  // 마감 지난 경우 접수 종료 처리
  if (poll.deadline && new Date(poll.deadline).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "응답 마감된 일정조사입니다." }, { status: 410 });
  }

  return NextResponse.json({ ok: true, poll });
}
