import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * 일기 이미지 업로드 API
 * POST /api/diary/upload-image
 * FormData: { file: File, diaryId: string }
 * 인쇄용으로 적절한 크기로 리사이징 (최대 2400px 너비, 300dpi 기준)
 *
 * ⚠️ 중요한 변경사항:
 * - Firebase Storage 버킷이 프로덕션 환경에서 존재하지 않는 문제 때문에,
 *   이 API는 더 이상 Storage에 업로드하지 않고 data URL을 반환합니다.
 * - 클라이언트는 반환된 data URL을 그대로 `combinedImageUrl`로 저장해 사용합니다.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const diaryId = formData.get("diaryId") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    if (!diaryId || typeof diaryId !== "string") {
      return NextResponse.json({ error: "diaryId가 필요합니다." }, { status: 400 });
    }

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    // 파일 크기 제한 (50MB - 리사이징 전)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "파일 크기는 50MB 이하여야 합니다." }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 이미지 리사이징: 인쇄용으로 적절한 크기 (최대 2400px 너비, 품질 90%)
    // 2400px @ 300dpi = 8인치 너비 (A4 용지에 적합)
    let processedBuffer: Buffer;
    let contentType = file.type;

    try {
      const image = sharp(fileBuffer);
      const metadata = await image.metadata();

      // 너비가 2400px보다 크면 리사이징
      if (metadata.width && metadata.width > 2400) {
        processedBuffer = await image
          .resize(2400, null, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        contentType = "image/jpeg";
      } else {
        // 크기가 적절하면 그대로 사용하되, JPEG로 변환하여 최적화
        processedBuffer = await image
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        contentType = "image/jpeg";
      }
    } catch (sharpError) {
      // sharp 처리 실패 시 원본 사용
      console.warn("[upload-image] 이미지 리사이징 실패, 원본 사용:", sharpError);
      processedBuffer = fileBuffer;
    }

    // Storage 대신 data URL로 반환 (버킷 이슈 회피 + 인쇄용에도 사용 가능)
    const base64 = processedBuffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
    });
  } catch (error: any) {
    console.error("[upload-image] 오류:", error);
    return NextResponse.json(
      { error: error?.message || "이미지 업로드에 실패했어요." },
      { status: 500 },
    );
  }
}
