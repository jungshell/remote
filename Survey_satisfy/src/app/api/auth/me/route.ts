import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user });
}
