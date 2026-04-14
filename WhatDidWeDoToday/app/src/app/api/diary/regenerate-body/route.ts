import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { regenerateDiaryBody } from "@/lib/llm";

export const runtime = "nodejs";

async function regenerateOne(id: string): Promise<{ id: string; summary?: string; error?: string }> {
  const doc = await adminDb.collection("diaries").doc(id).get();
  if (!doc.exists) {
    return { id, error: "not found" };
  }
  const diary = { id: doc.id, ...doc.data() } as {
    timeline?: string[];
    quote?: string;
    summary?: string;
  };
  const timeline = Array.isArray(diary.timeline) ? diary.timeline : [];
  const quote = typeof diary.quote === "string" ? diary.quote.trim() : "";
  const summary = typeof diary.summary === "string" ? diary.summary.trim() : undefined;
  const newSummary = await regenerateDiaryBody({
    timeline,
    quote: quote || "오늘도 좋은 하루였어요.",
    summary,
  });
  await adminDb.collection("diaries").doc(id).update({
    summary: newSummary,
    updatedAt: new Date().toISOString(),
  });
  return { id, summary: newSummary };
}

/** 일기 본문(summary)만 타임라인·한 문장 기준으로 150~300자 어린이 말투로 재생성. 단일 id 또는 ids 배열 지원 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    const singleId = typeof body.id === "string" ? body.id : typeof body.diaryId === "string" ? body.diaryId : null;

    if (ids.length > 0) {
      const results: { id: string; summary?: string; error?: string }[] = [];
      for (const id of ids) {
        try {
          const r = await regenerateOne(id);
          results.push(r);
        } catch (e) {
          results.push({ id, error: e instanceof Error ? e.message : "재생성 실패" });
        }
      }
      return NextResponse.json({ results });
    }

    const id = singleId;
    if (!id) {
      return NextResponse.json({ error: "id or ids is required" }, { status: 400 });
    }
    const r = await regenerateOne(id);
    if (r.error) {
      return NextResponse.json({ error: r.error }, { status: r.error === "not found" ? 404 : 500 });
    }
    return NextResponse.json({ summary: r.summary });
  } catch (e) {
    console.error("[API] regenerate-body error:", e);
    const message = e instanceof Error ? e.message : "일기 본문 재생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
