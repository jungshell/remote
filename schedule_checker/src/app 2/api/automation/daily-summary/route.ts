import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

// Vercel Cron sends CRON_SECRET in Authorization header when configured
const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin not configured", summary: null },
      { status: 500 }
    );
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const tasksSnap = await db.collection("tasks").get();
    let totalTasks = 0;
    let completedInLast24h = 0;

    tasksSnap.docs.forEach((doc) => {
      const d = doc.data();
      totalTasks += 1;
      const updatedAt = d.updatedAt?.toMillis?.() ?? 0;
      if (d.completed === true && updatedAt >= oneDayAgo.getTime()) {
        completedInLast24h += 1;
      }
    });

    const summary = {
      date: now.toISOString().slice(0, 10),
      totalTasks,
      completedInLast24h,
      generatedAt: now.toISOString(),
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("daily-summary error", e);
    return NextResponse.json(
      { error: String(e), summary: null },
      { status: 500 }
    );
  }
}
