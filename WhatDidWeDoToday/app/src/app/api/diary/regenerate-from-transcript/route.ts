import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { generateDiary } from "@/lib/llm";

export const runtime = "nodejs";
/** LLM 호출로 30초 이상 걸릴 수 있으므로 타임아웃 여유 둠 */
export const maxDuration = 60;

/**
 * POST /api/diary/regenerate-from-transcript
 * 저장된 녹음(transcript)으로 일기 전체를 다시 생성합니다.
 * 29일처럼 녹음과 무관한 내용이 들어간 경우, 이 API를 호출하면 transcript만 사용해 본문·제목·한 문장·타임라인을 새로 만듭니다.
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : typeof body.diaryId === "string" ? body.diaryId : null;
    if (!id) {
      return NextResponse.json({ error: "id 또는 diaryId가 필요해요." }, { status: 400 });
    }

    const doc = await adminDb.collection("diaries").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "일기를 찾을 수 없어요." }, { status: 404 });
    }

    const diary = { id: doc.id, ...doc.data() } as {
      transcript?: string;
      date?: string;
      location?: string;
      weather?: string;
      members?: string[];
    };

    let transcript = typeof diary.transcript === "string" ? diary.transcript.trim() : "";
    // 실제 대화/전사가 아닌 플레이스홀더면 재생성 불가 (29일처럼 오디오만 올리고 전사가 안 된 경우)
    const placeholderPatterns = [
      "오디오 녹음본만 첨부되었습니다",
      "오디오 녹음본만 첨부되었어",
      "(녹음 내용 없음)",
      "녹음 내용이 없",
      "정보를 제공하지 않았",
      "파악할 수 없었",
    ];
    const isPlaceholderOrEmpty =
      !transcript ||
      transcript.length < 20 ||
      placeholderPatterns.some((p) => transcript.includes(p));
    if (isPlaceholderOrEmpty) {
      return NextResponse.json(
        {
          error:
            "저장된 녹음 내용이 실제 대화(전사)가 아니에요. 오디오만 올리신 경우, 음성 인식이 끝난 뒤 다시 시도하거나, 일기 상세에서 녹음 파일을 다시 업로드해 전사가 채워진 뒤 '녹음 내용으로 전체 재생성'을 눌러 주세요.",
        },
        { status: 400 }
      );
    }

    const meta = {
      date: diary.date || new Date().toISOString().slice(0, 10),
      location: diary.location || "",
      weather: diary.weather || "",
      members: Array.isArray(diary.members) ? diary.members : [],
    };

    const result = await generateDiary(transcript, meta, undefined);

    await adminDb.collection("diaries").doc(id).update({
      title: result.title,
      summary: result.summary,
      quote: result.quote,
      timeline: result.timeline ?? [],
      keywords: result.keywords ?? [],
      moodScore: result.moodScore ?? 3,
      goodThingsByMember: result.goodThingsByMember ?? {},
      imagePrompts: result.imagePrompts ?? [],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      title: result.title,
      summary: result.summary,
      quote: result.quote,
      timeline: result.timeline,
      keywords: result.keywords,
      moodScore: result.moodScore,
      goodThingsByMember: result.goodThingsByMember,
    });
  } catch (e) {
    console.error("[API] regenerate-from-transcript error:", e);
    const message = e instanceof Error ? e.message : "녹음 기반 재생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
