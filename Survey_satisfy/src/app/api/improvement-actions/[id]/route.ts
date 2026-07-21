import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ImprovementStatus } from "@/lib/improvement/suggest";
import type { Database } from "@/lib/supabase/database.types";

const IMPROVEMENT_STATUSES = new Set<ImprovementStatus>(["등록", "진행중", "완료", "보류"]);

interface PatchBody {
  title?: string;
  ownerName?: string;
  dueDate?: string | null;
  status?: ImprovementStatus;
  memo?: string;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service role이 설정되지 않았습니다." }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await readJsonBody<PatchBody>(request);

  if (!body) {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (body.status && !IMPROVEMENT_STATUSES.has(body.status)) {
    return NextResponse.json({ ok: false, error: "허용되지 않은 상태값입니다." }, { status: 400 });
  }

  const patch: Database["public"]["Tables"]["improvement_actions"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.title === "string") {
    patch.title = body.title.trim();
  }
  if (typeof body.ownerName === "string") {
    patch.owner_name = body.ownerName.trim();
  }
  if (body.dueDate !== undefined) {
    patch.due_date = body.dueDate || null;
  }
  if (body.status) {
    patch.status = body.status;
  }
  if (typeof body.memo === "string") {
    patch.memo = body.memo.trim();
  }

  const { data, error } = await supabase
    .from("improvement_actions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthUser(request, "admin");

  if (auth.response) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service role이 설정되지 않았습니다." }, { status: 503 });
  }

  const { id } = await context.params;
  const { error } = await supabase.from("improvement_actions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
