import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminFirestore } from "@/lib/firebase-admin";
import { google } from "googleapis";

const CALENDAR_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CALENDAR_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";

export async function GET(request: Request) {
  const app = getAdminApp();
  if (!app) return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.replace("Bearer ", "");
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    const tokenDoc = await db.collection("calendar_tokens").doc(uid).get();
    const data = tokenDoc.data();
    if (!data?.refresh_token) {
      return NextResponse.json({ error: "Calendar not connected", events: [] }, { status: 200 });
    }

    const oauth2Client = new google.auth.OAuth2(
      CALENDAR_CLIENT_ID,
      CALENDAR_CLIENT_SECRET,
      CALENDAR_REDIRECT_URI || `${APP_URL}/api/calendar/callback`
    );
    oauth2Client.setCredentials({
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expiry_date: data.expiry_date,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });
    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary ?? "(제목 없음)",
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
    }));
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json({ error: String(e), events: [] }, { status: 500 });
  }
}
