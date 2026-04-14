import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";
import { regenerateQuoteAndTimelineFromSummary } from "@/lib/llm";

export const runtime = "nodejs";

/**
 * 일기 본문(summary)을 기반으로 quote와 timeline 재생성 (연결성 개선)
 * POST /api/diary/regenerate-quote-timeline
 * Body: { diaryId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const diaryId = body.diaryId || body.id;
    
    if (!diaryId || typeof diaryId !== "string") {
      return NextResponse.json({ error: "diaryId가 필요합니다." }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection("diaries");
    const diary = await collection.findOne({ _id: diaryId as any });
    
    if (!diary) {
      return NextResponse.json({ error: "일기를 찾을 수 없습니다." }, { status: 404 });
    }

    const summary = diary.summary || "";
    const existingQuote = diary.quote || "";

    if (!summary.trim()) {
      return NextResponse.json(
        { error: "일기 본문이 없어서 재생성할 수 없습니다." },
        { status: 400 }
      );
    }

    const { quote, timeline } = await regenerateQuoteAndTimelineFromSummary(
      summary,
      existingQuote
    );

    // MongoDB 업데이트
    await collection.updateOne(
      { _id: diaryId as any },
      { $set: { quote, timeline } }
    );

    return NextResponse.json({
      success: true,
      quote,
      timeline,
    });
  } catch (error: any) {
    console.error("[regenerate-quote-timeline] 오류:", error);
    return NextResponse.json(
      { error: error?.message || "재생성에 실패했어요." },
      { status: 500 }
    );
  }
}
