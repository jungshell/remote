import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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
  const status = searchParams.get("status");

  let query = supabase
    .from("platform_users")
    .select("id, email, name, division, business, sub_business, program_type, role, status, created_at, approved_at")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    division: row.division,
    business: row.business ?? "",
    subBusiness: row.sub_business ?? "",
    programType: row.program_type ?? "",
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    approved_at: row.approved_at,
  }));

  return NextResponse.json({ ok: true, rows });
}
