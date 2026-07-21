import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || newPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "현재 비밀번호와 새 비밀번호(8자 이상)를 입력해 주세요." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const { data: user, error } = await supabase
    .from("platform_users")
    .select("id, password_hash")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from("platform_users")
    .update({ password_hash: passwordHash })
    .eq("id", auth.user.id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
