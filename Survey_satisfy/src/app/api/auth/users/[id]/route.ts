import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  status?: "approved" | "rejected";
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser(request, "admin");

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const body = await readJsonBody<PatchBody>(request);

  if (!body) {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ ok: false, error: "status는 approved 또는 rejected여야 합니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data: target, error: targetError } = await supabase
    .from("platform_users")
    .select("id, role, status")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.role === "admin") {
    return NextResponse.json({ ok: false, error: "관리자 계정은 이 화면에서 변경할 수 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("platform_users")
    .update({
      status: body.status,
      approved_at: body.status === "approved" ? new Date().toISOString() : null,
      approved_by: auth.user!.id,
    })
    .eq("id", id)
    .select("id, email, name, division, role, status, created_at, approved_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: data });
}
