import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { generateSchedulePollId, parseDates, parseTimeSlots, pollRowToRecord } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/** 관리자: 일정조사 목록 */
export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "admin");
  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("schedule_polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[schedule-polls] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: "일정조사 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, polls: (data ?? []).map(pollRowToRecord) });
}

interface CreateBody {
  title?: string;
  description?: string;
  dates?: unknown;
  timeSlots?: unknown;
  includeLunch?: boolean;
  includeDinner?: boolean;
  deadline?: string | null;
}

/** 관리자: 일정조사 생성 */
export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "admin");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<CreateBody>(request);
  if (!body || !body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "조사 제목을 입력해 주세요." }, { status: 400 });
  }

  const dates = parseDates(body.dates);
  const timeSlots = parseTimeSlots(body.timeSlots);

  if (dates.length === 0) {
    return NextResponse.json({ ok: false, error: "후보 날짜를 1개 이상 추가해 주세요." }, { status: 400 });
  }
  if (timeSlots.length === 0) {
    return NextResponse.json({ ok: false, error: "시간대를 1개 이상 추가해 주세요." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_polls")
    .insert({
      id: generateSchedulePollId(),
      title: body.title.trim(),
      description: body.description?.trim() || null,
      created_by: auth.user.id,
      dates: dates as unknown as Json,
      time_slots: timeSlots as unknown as Json,
      include_lunch: Boolean(body.includeLunch),
      include_dinner: Boolean(body.includeDinner),
      status: "진행중",
      deadline: body.deadline ? new Date(body.deadline).toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[schedule-polls] 생성 실패:", error.message);
    return NextResponse.json({ ok: false, error: "일정조사 생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, poll: pollRowToRecord(data) });
}
