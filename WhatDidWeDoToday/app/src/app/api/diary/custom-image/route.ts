import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { adminStorage } from "@/lib/firebaseAdmin";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * 일기용 그림 파일 1장 업로드 (다른 플랫폼에서 그린 그림 등).
 * PDF/책 형식에서 상단 일러스트로 사용됩니다.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const diaryId = formData.get("diaryId") as string | null;
    const file = formData.get("file") as File | null;

    if (!diaryId?.trim()) {
      return NextResponse.json({ error: "diaryId is required" }, { status: 400 });
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const doc = await adminDb.collection("diaries").doc(diaryId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "diary not found" }, { status: 404 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "지원 형식: JPEG, PNG, WebP, GIF" },
        { status: 400 },
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/png";

    try {
      const bucket = adminStorage.bucket();
      if (bucket) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
        const fileName = `diaries/${diaryId}/custom.${safeExt}`;
        const fileRef = bucket.file(fileName);

        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
            metadata: { diaryId },
          },
        });
        await fileRef.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        await adminDb.collection("diaries").doc(diaryId).update({
          customImageUrl: publicUrl,
          customImageDataUrl: null,
        });
        return NextResponse.json({ url: publicUrl });
      }
    } catch (storageError: unknown) {
      console.warn("Storage upload failed, trying data URL fallback:", storageError);
    }

    // Storage 없거나 버킷 오류 시: 인쇄용 품질 유지하며 리사이즈·압축 후 data URL로 저장
    const MAX_DATA_URL_BYTES = 580 * 1024; // 580KB (Firestore 문서 한도 내)
    let outBuffer: Buffer;
    try {
      outBuffer = await sharp(buffer)
        .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
    } catch (sharpErr) {
      console.warn("Sharp failed, using original:", sharpErr);
      outBuffer = buffer;
    }

    if (outBuffer.length > MAX_DATA_URL_BYTES) {
      return NextResponse.json(
        {
          error:
            "이미지가 너무 커서 저장할 수 없어요. 이미지를 줄이거나 Firebase Storage 버킷을 설정해주세요.",
        },
        { status: 413 },
      );
    }

    const base64 = outBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    await adminDb.collection("diaries").doc(diaryId).update({
      customImageDataUrl: dataUrl,
      customImageUrl: null,
    });

    return NextResponse.json({ url: dataUrl });
  } catch (error: unknown) {
    console.error("Custom image upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
