import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { shouldRunDailyReportOrSlack } from "@/lib/workday";

const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

function buildReportHtml(data: {
  dateLabel: string;
  yesterdayCount: number;
  todayCount: number;
  weekCount: number;
  yesterdayItems: string[];
  todayItems: string[];
  weekItems: string[];
}): string {
  const { dateLabel, yesterdayCount, todayCount, weekCount, yesterdayItems, todayItems, weekItems } = data;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>업무 보고서</title></head>
<body style="margin:0;font-family:sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);color:#fff;padding:24px;text-align:center;">
      <h1 style="margin:0;font-size:20px;">AutoFlow</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${dateLabel} 업무 보고서</p>
    </div>
    <div style="padding:24px;">
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#eef2ff;border-radius:12px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#4338ca;">${yesterdayCount}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6366f1;">어제 완료</p>
        </div>
        <div style="flex:1;background:#fef3c7;border-radius:12px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#b45309;">${todayCount}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#d97706;">오늘 할 일</p>
        </div>
        <div style="flex:1;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#475569;">${weekCount}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">이번 주 마감</p>
        </div>
      </div>
      ${yesterdayItems.length ? `<section style="margin-bottom:20px;"><h2 style="font-size:14px;color:#64748b;margin:0 0 8px;">어제 완료</h2><ul style="margin:0;padding-left:20px;color:#334155;">${yesterdayItems.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></section>` : ""}
      ${todayItems.length ? `<section style="margin-bottom:20px;"><h2 style="font-size:14px;color:#64748b;margin:0 0 8px;">오늘 할 일</h2><ul style="margin:0;padding-left:20px;color:#334155;">${todayItems.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></section>` : ""}
      ${weekItems.length ? `<section><h2 style="font-size:14px;color:#64748b;margin:0 0 8px;">이번 주 마감</h2><ul style="margin:0;padding-left:20px;color:#334155;">${weekItems.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></section>` : ""}
    </div>
    <div style="padding:16px 24px;background:#f8fafc;text-align:center;">
      <a href="${APP_URL}" style="color:#4f46e5;text-decoration:none;font-size:14px;">AutoFlow에서 자세히 보기</a>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSlackText(data: {
  dateLabel: string;
  yesterdayCompleted: { id: string; title: string }[];
  todayDue: { id: string; title: string }[];
  weekDue: { id: string; title: string }[];
}): string {
  const { dateLabel, yesterdayCompleted, todayDue, weekDue } = data;
  const uniqueIds = new Set<string>();
  yesterdayCompleted.forEach((t) => uniqueIds.add(t.id));
  todayDue.forEach((t) => uniqueIds.add(t.id));
  weekDue.forEach((t) => uniqueIds.add(t.id));
  const total = uniqueIds.size;
  const done = yesterdayCompleted.length;
  const overdue = Math.max(0, total - done - todayDue.length);
  const doneRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const lines: string[] = [];
  lines.push(`[AutoFlow] ${dateLabel} 업무 요약`);
  lines.push("");
  lines.push(`• 총 업무(요약 기준): ${total}건 (완료 ${done}건, 지연 ${overdue}건)`);
  lines.push(`• 완료율: ${doneRate}%`);
  lines.push("");
  if (todayDue.length) {
    lines.push(`[오늘 할 일]`);
    todayDue.slice(0, 10).forEach((t) => lines.push(`- ${t.title}`));
    lines.push("");
  }
  if (yesterdayCompleted.length) {
    lines.push(`[어제 완료]`);
    yesterdayCompleted.slice(0, 10).forEach((t) => lines.push(`- ${t.title}`));
    lines.push("");
  }
  if (weekDue.length) {
    lines.push(`[이번 주 마감]`);
    weekDue.slice(0, 10).forEach((t) => lines.push(`- ${t.title}`));
    lines.push("");
  }
  lines.push(`<${APP_URL}|AutoFlow에서 자세히 보기>`);
  return lines.join("\n");
}

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getYesterdayStartEnd(): { start: Date; end: Date } {
  const end = getTodayStart();
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start, end };
}

function getThisWeekEnd(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() + (7 - diff));
  return d;
}

export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  if (!shouldRunDailyReportOrSlack(now)) {
    return NextResponse.json({
      skip: true,
      reason: "weekend_or_holiday",
      date: now.toISOString().slice(0, 10),
      message: "주말 또는 공휴일에는 일일 보고·슬랙을 실행하지 않습니다.",
    });
  }
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Firestore Admin not configured" }, { status: 500 });
  }
  const dateLabel = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const { start: yesterdayStart, end: yesterdayEnd } = getYesterdayStartEnd();
  const todayStart = getTodayStart();
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = getThisWeekEnd();

  const settingsSnap = await db.collection("user_settings").get();
  const recipients: { uid: string; email: string }[] = [];
  settingsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.dailyReportEnabled === true && data.email) {
      recipients.push({ uid: d.id, email: data.email });
    }
  });

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const { uid, email } of recipients) {
    try {
      const tasksSnap = await db.collection("tasks").where("ownerId", "==", uid).get();
      const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as Array<{
        id: string;
        completed: boolean;
        title: string;
        dueDate?: { seconds: number };
        updatedAt?: { seconds: number };
      }>;

      const yesterdayCompleted = tasks.filter((t) => {
        if (!t.completed || !t.updatedAt) return false;
        const sec = t.updatedAt.seconds * 1000;
        return sec >= yesterdayStart.getTime() && sec < yesterdayEnd.getTime();
      });
      const todayDue = tasks.filter((t) => {
        if (t.completed || !t.dueDate) return false;
        const sec = t.dueDate.seconds * 1000;
        return sec >= todayStart.getTime() && sec < todayEnd.getTime();
      });
      const weekDue = tasks.filter((t) => {
        if (t.completed || !t.dueDate) return false;
        const sec = t.dueDate.seconds * 1000;
        return sec >= todayStart.getTime() && sec < weekEnd.getTime();
      });

      const html = buildReportHtml({
        dateLabel,
        yesterdayCount: yesterdayCompleted.length,
        todayCount: todayDue.length,
        weekCount: weekDue.length,
        yesterdayItems: yesterdayCompleted.map((t) => t.title),
        todayItems: todayDue.map((t) => t.title),
        weekItems: weekDue.slice(0, 10).map((t) => t.title),
      });

      if (RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "AutoFlow <onboarding@resend.dev>",
            to: email,
            subject: `[AutoFlow] ${dateLabel} 업무 보고서`,
            html,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          results.push({ email, ok: false, error: err });
        } else {
          results.push({ email, ok: true });
        }
      } else {
        results.push({ email, ok: true });
      }

      if (SLACK_WEBHOOK_URL) {
        const text = buildSlackText({
          dateLabel,
          yesterdayCompleted: yesterdayCompleted.map((t) => ({ id: t.id, title: t.title })),
          todayDue: todayDue.map((t) => ({ id: t.id, title: t.title })),
          weekDue: weekDue.map((t) => ({ id: t.id, title: t.title })),
        });
        try {
          await fetch(SLACK_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
        } catch {
          // 슬랙 오류는 이메일 발송 결과에 영향 주지 않음
        }
      }
    } catch (e) {
      results.push({ email, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ date: dateLabel, sent: results.filter((r) => r.ok).length, results });
}
