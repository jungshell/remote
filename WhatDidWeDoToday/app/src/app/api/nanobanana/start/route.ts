import { NextResponse } from "next/server";
import { generateImageWithNanobanana } from "@/lib/nanobanana";

export const runtime = "nodejs";

/**
 * 나노바나나 이미지 생성 시작 (taskId만 즉시 반환).
 * 폴링은 클라이언트에서 /api/nanobanana/poll 호출.
 * Vercel 타임아웃 회피용.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // 나노바나나 API 키 확인
    const apiKey =
      process.env.NANOBANANA_API_KEY || process.env.NANO_BANANA_API_KEY || "";
    if (!apiKey.trim()) {
      return NextResponse.json(
        { error: "NANOBANANA_API_KEY not configured" },
        { status: 500 }
      );
    }

    // 나노바나나에 생성 요청만 보내고 taskId 받기 (폴링은 안 함)
    const NANOBANANA_GENERATE_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/generate";

    const requestBody: Record<string, unknown> = {
      prompt,
      type: "TEXTTOIAMGE",
      numImages: 1,
      image_size: "16:10",
    };
    const callbackUrl = process.env.NANOBANANA_CALLBACK_URL;
    if (callbackUrl?.trim()) {
      requestBody.callBackUrl = callbackUrl.trim();
    } else {
      requestBody.callBackUrl = "https://example.com/nanobanana-callback";
    }

    const res = await fetch(NANOBANANA_GENERATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[Nanobanana Start] generate failed:", res.status, text);
      return NextResponse.json(
        { error: `나노바나나 요청 실패: ${res.status}` },
        { status: res.status }
      );
    }

    const json = (await res.json()) as {
      code?: number;
      data?: { taskId?: string };
      msg?: string;
    };

    if (json?.code === 402) {
      const errorMessage = json?.msg || "The current credits are insufficient. Please top up.";
      console.warn("[Nanobanana Start] 크레딧 부족 (402):", errorMessage);
      return NextResponse.json(
        {
          error: "크레딧 부족",
          message: errorMessage,
          code: 402,
          suggestion: "NanoBanana 크레딧이 부족합니다. 크레딧은 매일 자동으로 충전되지 않으며, 수동으로 충전이 필요합니다. 또는 대체 이미지 생성 방법을 사용할 수 있습니다.",
        },
        { status: 402 }
      );
    }

    const taskId = json?.data?.taskId ?? "";
    if (!taskId) {
      console.warn("[Nanobanana Start] no taskId:", json);
      return NextResponse.json(
        { error: "taskId를 받지 못했습니다", details: json },
        { status: 500 }
      );
    }

    return NextResponse.json({ taskId });
  } catch (e) {
    console.error("[Nanobanana Start] error:", e);
    const message = e instanceof Error ? e.message : "나노바나나 시작 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
