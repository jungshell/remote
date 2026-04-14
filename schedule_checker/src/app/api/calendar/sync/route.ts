import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

async function getAccessToken(uid: string): Promise<string | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const snap = await db.collection("calendar_tokens").doc(uid).get();
  const refreshToken = snap.data()?.refreshToken;
  if (!refreshToken || !CLIENT_ID || !CLIENT_SECRET) return null;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  getAdminFirestore();
  let uid: string;
  try {
    const app = admin.app();
    const decoded = await app.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const accessToken = await getAccessToken(uid);
  if (!accessToken) {
    return NextResponse.json({ error: "Calendar not connected" }, { status: 400 });
  }
  let body: { taskId: string; title: string; dueDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { taskId, title, dueDate } = body;
  if (!taskId || !title) {
    return NextResponse.json({ error: "taskId and title required" }, { status: 400 });
  }
  const start = dueDate ? new Date(dueDate) : new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const event = {
    summary: title,
    start: { dateTime: start.toISOString(), timeZone: "Asia/Seoul" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Seoul" },
  };
  const createRes = await fetch(CALENDAR_EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    return NextResponse.json({ error: "Calendar API error", details: err }, { status: 502 });
  }
  const eventData = (await createRes.json()) as { id?: string };
  const eventId = eventData.id;
  if (eventId) {
    const db = getAdminFirestore();
    if (db) {
      await db.collection("tasks").doc(taskId).set({ calendarEventId: eventId }, { merge: true });
    }
  }
  return NextResponse.json({ success: true, eventId });
}
