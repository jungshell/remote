/**
 * 외부 URL에 있는 4컷 이미지를 Firebase Storage에 저장하고 공개 URL을 반환합니다.
 * 기존 이미지도 우리 Storage에 보관해 외부 링크 만료에 대비합니다.
 */
import { adminStorage } from "@/lib/firebaseAdmin";

const STORAGE_PATH_PREFIX = "diaries";

export async function saveCombinedImageToStorage(
  diaryId: string,
  imageUrl: string,
): Promise<string | null> {
  if (!diaryId?.trim() || !imageUrl?.trim()) return null;

  let buffer: Buffer;
  let contentType = "image/png";

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "WhatDidWeDoToday/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn("[saveDiaryImage] fetch failed:", res.status, imageUrl.slice(0, 80));
      return null;
    }
    const arr = new Uint8Array(await res.arrayBuffer());
    buffer = Buffer.from(arr);
    const ct = res.headers.get("content-type");
    if (ct?.startsWith("image/")) contentType = ct.split(";")[0].trim();
  } catch (e) {
    console.warn("[saveDiaryImage] fetch error:", e instanceof Error ? e.message : e);
    return null;
  }

  const ext = contentType.includes("webp") ? "webp" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const fileName = `${STORAGE_PATH_PREFIX}/${diaryId}/4cut.${ext}`;

  try {
    const bucket = adminStorage.bucket();
    if (!bucket) return null;

    const fileRef = bucket.file(fileName);
    await fileRef.save(buffer, {
      metadata: {
        contentType,
        metadata: { diaryId, source: "nanobanana" },
      },
    });
    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return publicUrl;
  } catch (e) {
    console.warn("[saveDiaryImage] Storage upload error:", e instanceof Error ? e.message : e);
    return null;
  }
}
