import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

/**
 * 일기에 저장된 녹음(audioUrl)으로 음성 인식(STT)을 실행하고 transcript를 채웁니다.
 * 앱에서 녹음만 하고 전사가 안 된 일기에 사용 (다시 업로드 없이 저장된 녹음으로 전사).
 * POST Body: { diaryId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const diaryId = typeof body.diaryId === "string" ? body.diaryId.trim() : typeof body.id === "string" ? body.id.trim() : null;
    if (!diaryId) {
      return NextResponse.json({ error: "일기 ID가 필요해요." }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection("diaries");
    const diary = await collection.findOne({ _id: diaryId as any });
    if (!diary) {
      return NextResponse.json({ error: "일기를 찾을 수 없어요." }, { status: 404 });
    }

    const audioUrl = typeof diary.audioUrl === "string" ? diary.audioUrl.trim() : "";
    if (!audioUrl) {
      return NextResponse.json(
        { error: "이 일기에는 저장된 녹음이 없어요. 녹음 파일을 업로드한 뒤 다시 시도해 주세요." },
        { status: 400 }
      );
    }

    // 저장된 오디오 URL에서 파일 다운로드
    const audioRes = await fetch(audioUrl, { method: "GET" });
    if (!audioRes.ok) {
      console.error("[transcribe-audio] 오디오 다운로드 실패:", audioRes.status, audioUrl);
      return NextResponse.json(
        { error: "저장된 녹음 파일을 불러올 수 없어요. 링크가 만료되었을 수 있어요." },
        { status: 502 }
      );
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get("content-type") || "audio/m4a";
    const ext = audioUrl.split(".").pop()?.toLowerCase() || "m4a";
    const safeExt = ["m4a", "mp3", "wav", "ogg", "webm"].includes(ext) ? ext : "m4a";
    const blob = new Blob([arrayBuffer], { type: contentType });

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!groqKey && !openaiKey) {
      return NextResponse.json(
        { error: "음성 인식 API 설정이 없어요. 관리자에게 문의해 주세요." },
        { status: 503 }
      );
    }

    const sttFormData = new FormData();
    sttFormData.append("file", blob, `audio.${safeExt}`);
    sttFormData.append("model", groqKey ? "whisper-large-v3-turbo" : "whisper-1");
    sttFormData.append("language", "ko");

    let sttRes: Response;
    if (groqKey) {
      sttRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: sttFormData,
      });
    } else {
      sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: sttFormData,
      });
    }

    if (!sttRes.ok) {
      const errText = await sttRes.text();
      console.error("[transcribe-audio] STT 실패:", sttRes.status, errText);
      return NextResponse.json(
        { error: "음성 인식에 실패했어요. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const sttData = (await sttRes.json()) as { text?: string };
    const transcript = typeof sttData?.text === "string" ? sttData.text.trim() : "";
    const transcriptPreview = transcript.length > 100 ? transcript.substring(0, 100) + "..." : transcript;

    await collection.updateOne(
      { _id: diaryId as any },
      {
        $set: {
          transcript,
          transcriptPreview,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      transcript,
      transcriptPreview,
    });
  } catch (e) {
    console.error("[transcribe-audio] 오류:", e);
    const message = e instanceof Error ? e.message : "음성 인식 중 오류가 발생했어요.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
