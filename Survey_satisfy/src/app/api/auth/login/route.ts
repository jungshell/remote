import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, readJsonBody } from "@/lib/api/http";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<LoginBody>(request);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  // 무차별 대입 방어: IP 기준 + 계정 기준 이중 제한
  const ip = getClientIp(request);

  if (!checkRateLimit(`login:${ip}`, 10, 60_000) || !checkRateLimit(`login:${email}`, 8, 300_000)) {
    return NextResponse.json(
      { ok: false, error: "로그인 시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const { data: user, error } = await supabase
    .from("platform_users")
    .select("id, email, name, division, role, status, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    return NextResponse.json({ ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (user.status === "pending") {
    return NextResponse.json(
      { ok: false, error: "총괄 관리자 승인 대기 중입니다. 승인 후 다시 로그인해 주세요." },
      { status: 403 },
    );
  }

  if (user.status === "rejected") {
    return NextResponse.json(
      { ok: false, error: "가입이 거절되었습니다. 관리자에게 문의하세요." },
      { status: 403 },
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      division: user.division,
      role: user.role,
      status: user.status,
    },
  });

  setSessionCookie(response, token, expiresAt);
  return response;
}
