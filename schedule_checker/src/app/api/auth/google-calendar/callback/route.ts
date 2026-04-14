import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const origin = request.nextUrl.origin;
  const redirectSettings = `${origin}/settings?calendar=connected`;

  if (!code || !state || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/settings?calendar=error", origin));
  }
  let uid: string;
  try {
    uid = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return NextResponse.redirect(new URL("/settings?calendar=error", origin));
  }
  const redirectUri = `${origin}/api/auth/google-calendar/callback`;
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/settings?calendar=error", origin));
  }
  const data = (await tokenRes.json()) as { refresh_token?: string };
  const refreshToken = data.refresh_token;
  if (!refreshToken) {
    return NextResponse.redirect(new URL("/settings?calendar=error", origin));
  }
  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection("calendar_tokens").doc(uid).set({ refreshToken, updatedAt: new Date().toISOString() }, { merge: true });
      await db.collection("user_settings").doc(uid).set({ googleCalendarConnected: true, updatedAt: new Date().toISOString() }, { merge: true });
    } catch {
      return NextResponse.redirect(new URL("/settings?calendar=error", origin));
    }
  }
  return NextResponse.redirect(redirectSettings);
}
