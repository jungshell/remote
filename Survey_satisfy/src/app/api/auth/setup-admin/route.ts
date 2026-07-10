import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface SetupBody {
  secret?: string;
  email?: string;
  password?: string;
  name?: string;
  division?: string;
}

export async function POST(request: Request) {
  const setupSecret = process.env.ADMIN_SETUP_SECRET;

  if (!setupSecret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_SETUP_SECRET이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = (await request.json()) as SetupBody;

  if (body.secret !== setupSecret) {
    return NextResponse.json({ ok: false, error: "설정 키가 올바르지 않습니다." }, { status: 403 });
  }

  const { count, error: countError } = await supabase
    .from("platform_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (countError) {
    return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: false, error: "이미 관리자 계정이 존재합니다." }, { status: 409 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "총괄관리자";
  const division = body.division?.trim() ?? "경영혁신본부";

  if (!email || password.length < 8) {
    return NextResponse.json({ ok: false, error: "이메일과 비밀번호(8자 이상)가 필요합니다." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("platform_users")
    .insert({
      email,
      password_hash: passwordHash,
      name,
      division,
      role: "admin",
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id, email, name, division, role, status")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ ok: true, user });
  setSessionCookie(response, token, expiresAt);
  return response;
}
