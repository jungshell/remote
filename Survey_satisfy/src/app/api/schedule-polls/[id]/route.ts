import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { pollRowToRecord } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STATUSES = new Set(["진행중", "종료"]);

/** 관리자: 일정조사 상태 변경(진행중/종료) */
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
  const body = await readJsonBody<{ status?: string }>(request);

  if (!body || !body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ ok: false, error: "허용되지 않은 상태값입니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_polls")
    .update({ status: body.status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[schedule-polls] 수정 실패:", error.message);
    return NextResponse.json({ ok: false, error: "상태 변경 중 오류가 발생했습니다." }, { status: 500 });
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
