import { NextResponse } from "next/server";
import { divisions } from "@/constants/divisions";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
  division?: string;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = (await request.json()) as RegisterBody;
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();
  const division = body.division?.trim();

  if (!email || !password || !name || !division) {
    return NextResponse.json({ ok: false, error: "모든 항목을 입력해 주세요." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  if (!divisions.includes(division as (typeof divisions)[number])) {
    return NextResponse.json({ ok: false, error: "올바른 본부를 선택해 주세요." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from("platform_users")
    .insert({
      email,
      password_hash: passwordHash,
      name,
      division,
      role: "staff",
      status: "pending",
    })
    .select("id, email, name, division, role, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "이미 등록된 이메일입니다." }, { status: 409 });
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "가입 신청이 완료되었습니다. 총괄 관리자 승인 후 로그인할 수 있습니다.",
    user: data,
  });
}
