import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { google } from "googleapis";

const CALENDAR_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CALENDAR_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/tasks?calendar=error`);
  }
  let uid: string;
  try {
    uid = JSON.parse(Buffer.from(state, "base64url").toString())?.uid;
  } catch {
    return NextResponse.redirect(`${APP_URL}/tasks?calendar=error`);
  }
  if (!uid) return NextResponse.redirect(`${APP_URL}/tasks?calendar=error`);

  if (!CALENDAR_CLIENT_ID || !CALENDAR_CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/tasks?calendar=config`);
  }

  const oauth2Client = new google.auth.OAuth2(
    CALENDAR_CLIENT_ID,
    CALENDAR_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI || `${APP_URL}/api/calendar/callback`
  );
  const { tokens } = await oauth2Client.getToken(code);
  const db = getAdminFirestore();
  if (db) {
    await db.collection("calendar_tokens").doc(uid).set({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      updatedAt: new Date(),
    });
  }
  return NextResponse.redirect(`${APP_URL}/tasks?calendar=connected`);
}
