import { NextResponse } from "next/server";
import { saveCombinedImageToStorage } from "@/lib/saveDiaryImage";

export const runtime = "nodejs";

/**
 * 나노바나나에서 생성된 이미지 URL을 Firebase Storage에 저장.
 * 클라이언트 폴링 완료 후 호출.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const diaryId = typeof body.diaryId === "string" ? body.diaryId.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!diaryId || !imageUrl) {
      return NextResponse.json(
        { error: "diaryId and imageUrl are required" },
        { status: 400 }
      );
    }

    const storedUrl = await saveCombinedImageToStorage(diaryId, imageUrl);
    if (!storedUrl) {
      return NextResponse.json(
        { error: "Failed to save image to storage" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: storedUrl });
  } catch (e) {
    console.error("[Save Image] error:", e);
    const message = e instanceof Error ? e.message : "이미지 저장 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
