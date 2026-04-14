import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid");
  if (!uid || !CLIENT_ID) {
    return NextResponse.redirect(new URL("/settings?calendar=error", request.url));
  }
  const redirectUri = `${request.nextUrl.origin}/api/auth/google-calendar/callback`;
  const state = Buffer.from(uid, "utf8").toString("base64url");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
