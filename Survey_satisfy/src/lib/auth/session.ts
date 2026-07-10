import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthUser, PlatformRole } from "@/lib/auth/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const SESSION_COOKIE = "platform_session";
const SESSION_DAYS = 7;

interface SessionRow {
  token: string;
  user_id: string;
  expires_at: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  division: string;
  role: PlatformRole;
  status: AuthUser["status"];
}

export async function createSession(userId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다.");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("user_sessions").insert({
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase.from("user_sessions").delete().eq("token", token);
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionTokenFromRequest(request: Request) {
  const header = request.headers.get("cookie");

  if (!header) {
    return null;
  }

  const match = header.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getAuthUserFromToken(token: string | null): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data: session, error: sessionError } = await supabase
    .from("user_sessions")
    .select("token, user_id, expires_at")
    .eq("token", token)
    .maybeSingle<SessionRow>();

  if (sessionError || !session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from("user_sessions").delete().eq("token", token);
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("platform_users")
    .select("id, email, name, division, role, status")
    .eq("id", session.user_id)
    .maybeSingle<UserRow>();

  if (userError || !user) {
    return null;
  }

  return user;
}

export async function getAuthUserFromRequest(request: Request) {
  const token = await getSessionTokenFromRequest(request);
  return getAuthUserFromToken(token);
}

export async function getAuthUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  return getAuthUserFromToken(token);
}

export function isRoleAllowed(user: AuthUser, requiredRole: PlatformRole) {
  if (user.status !== "approved") {
    return false;
  }

  if (requiredRole === "staff") {
    return user.role === "staff" || user.role === "admin";
  }

  return user.role === "admin";
}
