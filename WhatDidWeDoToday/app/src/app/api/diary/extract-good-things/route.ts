import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";
import { extractGoodThingsFromTranscript } from "@/lib/llm";

export const runtime = "nodejs";

/**
 * 일기의 transcript와 summary를 분석해서 화자별 좋았던 일 자동 추출
 * POST /api/diary/extract-good-things
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

    const transcript = diary.transcript || "";
    const summary = diary.summary || "";
    const members = Array.isArray(diary.members) && diary.members.length > 0
      ? diary.members
      : ["엄마", "아빠", "아이"];

    if (!transcript.trim() && !summary.trim()) {
      return NextResponse.json(
        { error: "녹음 내용이나 일기 본문이 없어서 추출할 수 없습니다." },
        { status: 400 }
      );
    }

    const goodThingsByMember = await extractGoodThingsFromTranscript(
      transcript,
      summary,
      members
    );

    // 빈 객체면 추출 실패
    if (Object.keys(goodThingsByMember).length === 0) {
      return NextResponse.json(
        { error: "좋았던 일을 추출하지 못했습니다. 녹음 내용이나 일기 본문에 관련 내용이 없을 수 있습니다." },
        { status: 400 }
      );
    }

    // MongoDB 업데이트
    await collection.updateOne(
      { _id: diaryId as any },
      { $set: { goodThingsByMember } }
    );

    return NextResponse.json({
      success: true,
      goodThingsByMember,
    });
  } catch (error: any) {
    console.error("[extract-good-things] 오류:", error);
    return NextResponse.json(
      { error: error?.message || "좋았던 일 추출에 실패했어요." },
      { status: 500 }
    );
  }
}
