import { NextResponse } from "next/server";
import type { AuthUser, PlatformRole } from "@/lib/auth/types";
import { getAuthUserFromRequest, isRoleAllowed } from "@/lib/auth/session";

export async function resolveAuthUser(request: Request): Promise<AuthUser | null> {
  const user = await getAuthUserFromRequest(request);

  if (!user || user.status !== "approved") {
    return null;
  }

  return user;
}

export async function requireAuthUser(request: Request, requiredRole: PlatformRole) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  if (user.status === "pending") {
    return {
      user: null,
      response: NextResponse.json({ ok: false, error: "총괄 관리자 승인 대기 중입니다." }, { status: 403 }),
    };
  }

  if (user.status === "rejected") {
    return {
      user: null,
      response: NextResponse.json({ ok: false, error: "가입이 거절되었습니다. 관리자에게 문의하세요." }, { status: 403 }),
    };
  }

  if (!isRoleAllowed(user, requiredRole)) {
    return {
      user: null,
      response: NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

/** @deprecated 공유 비밀번호 방식 — 계정 로그인으로 대체됨 */
export function resolveAuthorizedRole(_request: Request): PlatformRole | null {
  return null;
}
