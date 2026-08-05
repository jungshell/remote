import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { parseDates, parseTimeSlots, pollRowToRecord } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

type SchedulePollUpdate = Database["public"]["Tables"]["schedule_polls"]["Update"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUSES = new Set(["진행중", "종료"]);

interface PatchBody {
  status?: string;
  title?: string;
  description?: string | null;
  dates?: unknown;
  timeSlots?: unknown;
  includeLunch?: boolean;
  includeDinner?: boolean;
  deadline?: string | null;
}

/** 관리자: 일정조사 수정(상태 또는 내용) */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser(request, "admin");
  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { id } = await params;
  const body = await readJsonBody<PatchBody>(request);
  if (!body) {
    return NextResponse.json({ ok: false, error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const update: SchedulePollUpdate = {};

  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: "허용되지 않은 상태값입니다." }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return NextResponse.json({ ok: false, error: "조사 제목을 입력해 주세요." }, { status: 400 });
    }
    update.title = body.title.trim();
  }

  if (body.description !== undefined) {
    update.description = body.description?.trim() || null;
  }

  if (body.dates !== undefined) {
    const dates = parseDates(body.dates);
    if (dates.length === 0) {
      return NextResponse.json({ ok: false, error: "후보 날짜를 1개 이상 선택해 주세요." }, { status: 400 });
    }
    update.dates = dates as unknown as Json;
  }

  if (body.timeSlots !== undefined) {
    const timeSlots = parseTimeSlots(body.timeSlots);
    if (timeSlots.length === 0) {
      return NextResponse.json({ ok: false, error: "가능 시각을 1개 이상 선택해 주세요." }, { status: 400 });
    }
    update.time_slots = timeSlots as unknown as Json;
  }

  if (body.includeLunch !== undefined) {
    update.include_lunch = Boolean(body.includeLunch);
  }
  if (body.includeDinner !== undefined) {
    update.include_dinner = Boolean(body.includeDinner);
  }
  if (body.deadline !== undefined) {
    update.deadline = body.deadline ? new Date(body.deadline).toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_polls")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[schedule-polls] 수정 실패:", error.message);
    return NextResponse.json({ ok: false, error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, poll: pollRowToRecord(data) });
}

/** 관리자: 일정조사 삭제 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser(request, "admin");
  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await supabase.from("schedule_polls").delete().eq("id", id);

  if (error) {
    console.error("[schedule-polls] 삭제 실패:", error.message);
    return NextResponse.json({ ok: false, error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
