import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NANOBANANA_RECORD_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/record-info";

/**
 * 나노바나나 taskId 폴링 (한 번만 체크).
 * 클라이언트가 이 API를 반복 호출해 결과를 받습니다.
 * 각 호출은 10초 내 완료되므로 Vercel 무료 플랜에서도 동작.
 */
export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const taskId = requestUrl.searchParams.get("taskId");

    if (!taskId?.trim()) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const apiKey =
      process.env.NANOBANANA_API_KEY || process.env.NANO_BANANA_API_KEY || "";
    if (!apiKey.trim()) {
      return NextResponse.json(
        { error: "NANOBANANA_API_KEY not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `${NANOBANANA_RECORD_URL}?taskId=${encodeURIComponent(taskId.trim())}`,
      {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { status: "pending", error: `HTTP ${res.status}` },
        { status: 200 }
      );
    }

    const json = (await res.json()) as {
      code?: number;
      data?: {
        successFlag?: number;
        response?: { resultImageUrl?: string };
      };
      msg?: string;
    };

    if (json?.code === 402) {
      return NextResponse.json({
        status: "error",
        error: "크레딧 부족",
        message: json?.msg || "The current credits are insufficient.",
      });
    }

    const flag = json?.data?.successFlag;
    const imageUrl = json?.data?.response?.resultImageUrl?.trim();

    if (flag === 1 && imageUrl) {
      return NextResponse.json({ status: "completed", url: imageUrl });
    }

    if (flag === 2 || flag === 3) {
      return NextResponse.json({
        status: "error",
        error: json?.msg || `작업 실패 (flag: ${flag})`,
      });
    }

    // 아직 진행 중
    return NextResponse.json({ status: "pending" });
  } catch (e) {
    console.error("[Nanobanana Poll] error:", e);
    const message = e instanceof Error ? e.message : "폴링 실패";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
