import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { google } from "googleapis";

const CALENDAR_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CALENDAR_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";

export async function POST(request: Request) {
  const app = getAdminApp();
  if (!app) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const auth = getAuth(app);
  if (!CALENDAR_CLIENT_ID || !CALENDAR_CLIENT_SECRET) {
    return NextResponse.json({ error: "Calendar OAuth not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const idToken = body.idToken as string | undefined;
  if (!idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const oauth2Client = new google.auth.OAuth2(
      CALENDAR_CLIENT_ID,
      CALENDAR_CLIENT_SECRET,
      CALENDAR_REDIRECT_URI || `${APP_URL}/api/calendar/callback`
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"],
      prompt: "consent",
      state: Buffer.from(JSON.stringify({ uid })).toString("base64url"),
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
