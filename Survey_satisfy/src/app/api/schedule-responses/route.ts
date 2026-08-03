import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { parseSelections } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { ScheduleResponseRecord } from "@/types/schedule";

/** 관리자: 특정 일정조사의 응답 목록 */
export async function GET(request: Request) {
  const auth = await requireAuthUser(request, "admin");
  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const pollId = searchParams.get("poll_id");
  if (!pollId) {
    return NextResponse.json({ ok: false, error: "poll_id가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_responses")
    .select("*")
    .eq("poll_id", pollId)
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("[schedule-responses] 조회 실패:", error.message);
    return NextResponse.json({ ok: false, error: "응답 조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  const responses: ScheduleResponseRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    respondentName: row.respondent_name,
    selections: parseSelections(row.selections),
    note: row.note ?? "",
    submittedAt: row.submitted_at,
  }));

  return NextResponse.json({ ok: true, responses });
}

interface SubmitBody {
  pollId?: string;
  respondentName?: string;
  selections?: unknown;
  note?: string;
}

/** 참여자(공개): 일정조사 응답 제출 (이름 기준 재제출 시 수정) */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`schedule-submit:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<SubmitBody>(request);
  const pollId = body?.pollId?.trim();
  const respondentName = body?.respondentName?.trim();

  if (!pollId || !respondentName) {
    return NextResponse.json({ ok: false, error: "이름을 입력해 주세요." }, { status: 400 });
  }
  if (respondentName.length > 40) {
    return NextResponse.json({ ok: false, error: "이름이 너무 깁니다." }, { status: 400 });
  }

  const selections = parseSelections(body?.selections).slice(0, 60);
  if (selections.length === 0) {
    return NextResponse.json({ ok: false, error: "가능한 시간을 1개 이상 선택해 주세요." }, { status: 400 });
  }

  const { data: poll, error: pollError } = await supabase
    .from("schedule_polls")
    .select("id, status, deadline")
    .eq("id", pollId)
    .maybeSingle();

  if (pollError) {
    console.error("[schedule-responses] 조사 조회 실패:", pollError.message);
    return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
  if (!poll || poll.status !== "진행중") {
    return NextResponse.json({ ok: false, error: "진행 중인 일정조사가 아닙니다." }, { status: 404 });
  }
  if (poll.deadline && new Date(poll.deadline).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "응답이 마감되었습니다." }, { status: 410 });
  }

  const payload = {
    poll_id: pollId,
    respondent_name: respondentName,
    selections: selections as unknown as Json,
    note: body?.note?.trim() || null,
    submitted_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("schedule_responses")
    .select("id")
    .eq("poll_id", pollId)
    .eq("respondent_name", respondentName)
    .maybeSingle();

  const updated = Boolean(existing?.id);
  const { error } = await supabase
    .from("schedule_responses")
    .upsert(payload, { onConflict: "poll_id,respondent_name" });

  if (error) {
    console.error("[schedule-responses] 저장 실패:", error.message);
    return NextResponse.json({ ok: false, error: "응답 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated });
}
