import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebaseAdmin";
import { getMongoDb } from "@/lib/mongodbAdmin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
/** Firebase 버킷 없을 때 data URL로 저장하는 최대 크기 (4.5MB - Vercel Serverless Function Limit) */
const MAX_DATAURL_SIZE = 4.5 * 1024 * 1024;

function normalizeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (e.error && typeof e.error === "object") {
      const err = (e.error as Record<string, unknown>).message;
      if (typeof err === "string") return err;
    }
    if (typeof e.message === "string") return e.message;
  }
  return error instanceof Error ? error.message : "녹음 파일 업로드에 실패했어요.";
}

function isQuotaExceededError(error: unknown): boolean {
  const msg = normalizeErrorMessage(error).toLowerCase();
  return msg.includes("quota") || msg.includes("limit") || (msg.includes("403") && msg.includes("exceeded"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteOldestFiles(bucket: any, spaceNeeded: number) {
  try {
    console.log(`[Auto-Cleanup] Need ${spaceNeeded} bytes. Listing files...`);
    // 오디오 파일만 검색 (audio/ 폴더)
    const [files] = await bucket.getFiles({ prefix: "audio/" });
    
    // 생성 시간순 정렬 (오래된 순)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files.sort((a: any, b: any) => {
      const timeA = new Date(a.metadata.timeCreated || a.metadata.updated).getTime();
      const timeB = new Date(b.metadata.timeCreated || b.metadata.updated).getTime();
      return timeA - timeB;
    });

    let freedSpace = 0;
    let deletedCount = 0;

    for (const file of files) {
      if (freedSpace >= spaceNeeded) break;
      
      try {
        const size = parseInt(file.metadata.size, 10) || 0;
        await file.delete();
        freedSpace += size;
        deletedCount++;
        console.log(`[Auto-Cleanup] Deleted ${file.name} (${(size/1024).toFixed(1)}KB)`);
      } catch (e) {
        console.error(`[Auto-Cleanup] Failed to delete ${file.name}:`, e);
      }
    }
    console.log(`[Auto-Cleanup] Complete. Deleted ${deletedCount} files, freed ${(freedSpace/1024/1024).toFixed(2)}MB`);
    return freedSpace;
  } catch (e) {
    console.error("[Auto-Cleanup] Error during cleanup:", e);
    return 0;
  }
}

function isBucketNotFoundError(error: unknown): boolean {
  const msg = normalizeErrorMessage(error).toLowerCase();
  return msg.includes("bucket") && (msg.includes("does not exist") || msg.includes("not found") || msg.includes("404"));
}

/**
 * 일기에 녹음 파일 업로드 및 자동 캡션 생성
 * POST /api/diary/upload-audio
 * Body: FormData { file: File, diaryId: string }
 * Firebase Storage 버킷이 없으면 6MB 이하 파일은 data URL로 MongoDB에 저장 (재생·전사 가능).
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const diaryId = formData.get("diaryId") as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "오디오 파일을 보내주세요." }, { status: 400 });
    }

    if (!diaryId || typeof diaryId !== "string" || !diaryId.trim()) {
      return NextResponse.json({ error: "일기 ID가 필요합니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다 (최대 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)` },
        { status: 400 }
      );
    }

    // 파일은 한 번만 읽기 (스트림 재사용 불가 — Firebase 실패 시 data URL 폴백에서 재사용)
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "audio/mpeg";
    const ext = file.name.split(".").pop()?.toLowerCase() || "m4a";
    const safeExt = ["m4a", "mp3", "wav", "ogg", "webm"].includes(ext) ? ext : "m4a";

    let publicUrl: string;

    try {
      const bucket = adminStorage.bucket();
      if (!bucket) throw new Error("스토리지 설정이 없습니다.");

      const audioId = randomUUID();
      const fileName = `audio/${diaryId}/${audioId}.${safeExt}`;
      const fileRef = bucket.file(fileName);
      const metadata = {
        contentType: mime,
        metadata: { diaryId, uploadedAt: new Date().toISOString() },
      };

      const doUpload = async () => {
        await fileRef.save(buffer, { metadata });
        await fileRef.makePublic();
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      };

      try {
        publicUrl = await doUpload();
        console.log(`[upload-audio] Firebase 업로드 성공: ${file.name} -> ${publicUrl}`);
      } catch (uploadError: unknown) {
        // 쿼터 초과 시 오래된 파일 삭제 후 재시도
        if (isQuotaExceededError(uploadError)) {
          console.warn("[upload-audio] Storage quota exceeded. Attempting auto-cleanup...");
          // 필요한 공간의 2배 확보 시도 (최소 10MB)
          const targetSpace = Math.max(buffer.length * 2, 10 * 1024 * 1024);
          await deleteOldestFiles(bucket, targetSpace);
          
          console.log("[upload-audio] Retrying upload after cleanup...");
          publicUrl = await doUpload();
          console.log(`[upload-audio] Retry success: ${publicUrl}`);
        } else {
          throw uploadError;
        }
      }
    } catch (storageError: unknown) {
      if (isBucketNotFoundError(storageError) && buffer.length <= MAX_DATAURL_SIZE) {
        const base64 = buffer.toString("base64");
        publicUrl = `data:${mime};base64,${base64}`;
        console.log(`[upload-audio] Firebase 버킷 없음 → data URL로 저장 (${(buffer.length / 1024).toFixed(0)}KB)`);
      } else if (isBucketNotFoundError(storageError)) {
        return NextResponse.json(
          {
            error:
              "Firebase Storage 버킷이 설정되지 않았어요. 녹음 파일을 4.5MB 이하로 줄이거나, Vercel에서 FIREBASE_STORAGE_BUCKET을 설정해 주세요.",
          },
          { status: 503 }
        );
      } else {
        const msg = normalizeErrorMessage(storageError);
        return NextResponse.json({ error: msg || "스토리지 업로드에 실패했어요." }, { status: 500 });
      }
    }

    // MongoDB에서 일기 조회 및 업데이트
    const db = await getMongoDb();
    const collection = db.collection("diaries");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const diary = await collection.findOne({ _id: diaryId as any });
    
    if (!diary) {
      return NextResponse.json({ error: "일기를 찾을 수 없습니다." }, { status: 404 });
    }

    // STT API 호출하여 transcript 생성
    let transcript = "";
    let transcriptPreview = "";
    
    try {
      const groqKey = process.env.GROQ_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      
      if (groqKey || openaiKey) {
        const sttFormData = new FormData();
        const audioBlob = new Blob([buffer], { type: mime });
        sttFormData.append("file", audioBlob, file.name || `audio.${safeExt}`);
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
          console.log(`[upload-audio] STT 성공: ${transcript.length}자`);
        } else {
          console.warn(`[upload-audio] STT 실패: ${sttRes.status}`);
        }
      } else {
        console.warn("[upload-audio] STT API 키가 없어서 캡션을 생성하지 못했습니다.");
      }
    } catch (sttError) {
      console.error("[upload-audio] STT 오류:", sttError);
      // STT 실패해도 오디오 URL은 저장
    }

    // MongoDB 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { audioUrl: publicUrl };
    if (transcript) {
      updateData.transcript = transcript;
      updateData.transcriptPreview = transcriptPreview;
    }

    await collection.updateOne(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _id: diaryId as any },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      audioUrl: publicUrl,
      transcript: transcript || undefined,
      transcriptPreview: transcriptPreview || undefined,
    });
  } catch (error: unknown) {
    console.error("[upload-audio] 오류:", error);
    return NextResponse.json(
      { error: normalizeErrorMessage(error) || "녹음 파일 업로드에 실패했어요." },
      { status: 500 }
    );
  }
}
