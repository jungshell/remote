import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 오디오 파일을 음성 인식으로 텍스트 변환.
 * GROQ_API_KEY 있으면 Groq(무료) 우선, 없으면 OPENAI_API_KEY(Whisper) 사용.
 */
export async function POST(request: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!groqKey && !openaiKey) {
    return NextResponse.json(
      { error: "음성 인식을 사용하려면 .env.local에 GROQ_API_KEY 또는 OPENAI_API_KEY를 설정해주세요. (Groq 무료 권장)" },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | Blob | null;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "오디오 파일을 보내주세요." }, { status: 400 });
    }

    const body = new FormData();
    body.append("file", file, file instanceof File ? file.name : "audio.m4a");
    body.append("model", "whisper-large-v3-turbo");
    body.append("language", "ko");

    let res: Response;
    if (groqKey) {
      res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body,
      });
    } else {
      body.set("model", "whisper-1");
      res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body,
      });
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("Transcribe API error:", res.status, err);
      return NextResponse.json(
        { error: "음성 인식에 실패했어요. 잠시 후 다시 시도해주세요." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { text?: string };
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return NextResponse.json({ text });
  } catch (e) {
    console.error("Transcribe error:", e);
    return NextResponse.json(
      { error: "음성 인식 중 오류가 발생했어요." },
      { status: 500 },
    );
  }
}
