import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const match = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return value;
  const [, year, monthRaw, dayRaw] = match;
  const month = monthRaw.padStart(2, "0");
  const day = dayRaw.padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  try {
    const date = new Date(`${iso}T12:00:00Z`);
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getUTCDay()] ?? "";
    return `${year}. ${month}. ${day}.(${weekday})`;
  } catch {
    return `${year}. ${month}. ${day}.`;
  }
}

export async function POST() {
  try {
    const snapshot = await adminDb.collection("diaries").get();
    const batch = adminDb.batch();
    let count = 0;

    (snapshot.docs || []).forEach((doc: any) => {
      const data = doc.data();
      const updates: any = {};

      if (data.date && !data.date.includes("(")) {
        updates.dateFormatted = formatDisplayDate(data.date);
      }

      if (!data.keywords && data.summary) {
        const cleaned = data.summary.replace(/[^\p{L}\p{N}\s]/gu, " ");
        const tokens = cleaned
          .split(/\s+/)
          .map((token: string) => token.trim())
          .filter((token: string) => token.length >= 2);
        const unique = Array.from(new Set(tokens));
        updates.keywords = unique.slice(0, 4);
      }

      if (!data.moodScore) {
        updates.moodScore = 3;
      }

      if (!data.quote && data.summary) {
        updates.quote = data.summary.split(".")[0] + ".";
      }

      if (Object.keys(updates).length > 0) {
        const docRef = adminDb.collection("diaries").doc(doc.id);
        batch.update(docRef, updates);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      updated: count,
      total: snapshot.docs || [].length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }
}
