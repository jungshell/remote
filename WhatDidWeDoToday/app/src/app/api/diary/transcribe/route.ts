import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { diaryId, audioUrl } = await request.json();

    if (!diaryId || !audioUrl) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    console.log(`[transcribe] STT 요청: ${diaryId}, ${audioUrl}`);

    // 오디오 파일 다운로드 (fetch)
    let audioBuffer: Buffer;
    let mime = "audio/m4a"; // 기본값

    if (audioUrl.startsWith("data:")) {
      // Data URL 처리
      const matches = audioUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: "잘못된 Data URL 형식입니다." }, { status: 400 });
      }
      mime = matches[1];
      audioBuffer = Buffer.from(matches[2], "base64");
    } else {
      // 일반 URL 처리
      try {
        const res = await fetch(audioUrl);
        if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);
        audioBuffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type");
        if (contentType) mime = contentType;
      } catch (e) {
        console.error("[transcribe] 오디오 다운로드 실패:", e);
        return NextResponse.json({ error: "오디오 파일을 불러올 수 없습니다." }, { status: 400 });
      }
    }

    // STT API 호출
    let transcript = "";
    let transcriptPreview = "";

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (groqKey || openaiKey) {
      const sttFormData = new FormData();
      // Blob 생성 시 MIME 타입 중요
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioBlob = new Blob([audioBuffer as any], { type: mime });
      // 파일명 확장자 추론
      const ext = mime.split("/")[1]?.split(";")[0] || "m4a";
      sttFormData.append("file", audioBlob, `audio.${ext}`);
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

      if (sttRes.ok) {
        const sttData = await sttRes.json();
        transcript = sttData.text || "";
        transcriptPreview = transcript.length > 100 ? transcript.substring(0, 100) + "..." : transcript;
        console.log(`[transcribe] STT 성공: ${transcript.length}자`);
      } else {
        const errText = await sttRes.text();
        console.error(`[transcribe] STT 실패 (${sttRes.status}):`, errText);
        return NextResponse.json({ error: `STT 변환 실패: ${sttRes.status}` }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "STT API 키가 설정되지 않았습니다." }, { status: 503 });
    }

    if (!transcript) {
       return NextResponse.json({ error: "음성을 텍스트로 변환하지 못했습니다." }, { status: 500 });
    }

    // DB 업데이트
    const db = await getMongoDb();
    const collection = db.collection("diaries");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await collection.updateOne({ _id: diaryId as any }, {
      $set: {
        transcript,
        transcriptPreview
      }
    });

    return NextResponse.json({
      success: true,
      transcript,
      transcriptPreview
    });

  } catch (error) {
    console.error("[transcribe] 오류:", error);
    const msg = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
