import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { PlatformRole, UserStatus } from "@/lib/auth/types";
import type { Database } from "@/lib/supabase/database.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  status?: UserStatus;
  role?: PlatformRole;
  name?: string;
  division?: string;
  business?: string;
  subBusiness?: string;
  programType?: string;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser(request, "admin");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as PatchBody;

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data: target, error: targetError } = await supabase
    .from("platform_users")
    .select("id, role, status, email")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const patch: Database["public"]["Tables"]["platform_users"]["Update"] = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "이름을 입력해 주세요." }, { status: 400 });
    }
    patch.name = name;
  }

  if (body.division !== undefined) {
    patch.division = body.division.trim();
  }

  if (body.business !== undefined) {
    patch.business = body.business.trim();
  }

  if (body.subBusiness !== undefined) {
    patch.sub_business = body.subBusiness.trim();
  }

  if (body.programType !== undefined) {
    patch.program_type = body.programType.trim();
  }

  if (body.status !== undefined) {
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ ok: false, error: "유효하지 않은 상태입니다." }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = auth.user.id;
    } else if (body.status === "rejected" || body.status === "pending") {
      patch.approved_at = null;
      patch.approved_by = body.status === "rejected" ? auth.user.id : null;
    }
  }

  if (body.role !== undefined) {
    if (body.role !== "admin" && body.role !== "staff") {
      return NextResponse.json({ ok: false, error: "권한은 admin 또는 staff만 가능합니다." }, { status: 400 });
    }

    // 자기 자신 권한 강등 방지
    if (id === auth.user.id && body.role !== "admin") {
      return NextResponse.json({ ok: false, error: "본인 관리자 권한은 해제할 수 없습니다." }, { status: 400 });
    }

    // 마지막 관리자 강등 방지
    if (target.role === "admin" && body.role === "staff") {
      const { count, error: countError } = await supabase
        .from("platform_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("status", "approved");

      if (countError) {
        return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json({ ok: false, error: "마지막 관리자 권한은 해제할 수 없습니다." }, { status: 400 });
      }
    }

    patch.role = body.role;
    // 관리자로 올리면 자동 승인
    if (body.role === "admin" && body.status === undefined) {
      patch.status = "approved";
      patch.approved_at = new Date().toISOString();
      patch.approved_by = auth.user.id;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "수정할 항목이 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("platform_users")
    .update(patch)
    .eq("id", id)
    .select("id, email, name, division, business, sub_business, program_type, role, status, created_at, approved_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: data.id,
      email: data.email,
      name: data.name,
      division: data.division,
      business: data.business ?? "",
      subBusiness: data.sub_business ?? "",
      programType: data.program_type ?? "",
      role: data.role,
      status: data.status,
      created_at: data.created_at,
      approved_at: data.approved_at,
    },
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAuthUser(request, "admin");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  if (id === auth.user.id) {
    return NextResponse.json({ ok: false, error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabase
    .from("platform_users")
    .select("id, role, email, name")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.role === "admin") {
    const { count, error: countError } = await supabase
      .from("platform_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "approved");

    if (countError) {
      return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ ok: false, error: "마지막 관리자 계정은 삭제할 수 없습니다." }, { status: 400 });
    }
  }

  // approved_by 참조 해제 (FK 차단 방지)
  await supabase.from("platform_users").update({ approved_by: null }).eq("approved_by", id);

  const { error } = await supabase.from("platform_users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: { id: target.id, email: target.email, name: target.name } });
}
