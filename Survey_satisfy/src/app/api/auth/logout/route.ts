import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSession, getSessionTokenFromRequest } from "@/lib/auth/session";

export async function POST(request: Request) {
  const token = await getSessionTokenFromRequest(request);

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
