import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { generateImageCaptions, generateImagePromptsFromSummary } from "@/lib/llm";
import { saveCombinedImageToStorage } from "@/lib/saveDiaryImage";
import { buildCombinedPrompt, FALLBACK_IMAGE_STYLE } from "@/lib/diary-prompt";

export const runtime = "nodejs";

function ensureImagePrompts(imagePrompts: string[], summary: string, title: string): string[] {
  const base = [title, summary, "가족의 오늘 하루"].filter(Boolean);
  const filled = [...imagePrompts];
  while (filled.length < 4) {
    const seed = base[filled.length % base.length];
    filled.push(`장면: ${seed}. ${FALLBACK_IMAGE_STYLE}`);
  }
  return filled.slice(0, 4).map((prompt) =>
    prompt.includes(FALLBACK_IMAGE_STYLE) ? prompt : `장면: ${prompt}. ${FALLBACK_IMAGE_STYLE}`,
  );
}

async function generateImageForDiary(diaryId: string, diary: Record<string, unknown>): Promise<{
  id: string;
  ok: boolean;
  taskId?: string;
  combinedImagePrompt?: string;
  combinedImageUrl?: string;
  error?: string;
}> {
  try {
    const summary = String(diary.summary ?? "");
    const timeline = Array.isArray(diary.timeline) ? (diary.timeline as string[]) : [];
    const members = Array.isArray(diary.members) ? (diary.members as string[]) : [];

    if (!summary || summary.trim().length < 50) {
      return { id: diaryId, ok: false, error: "일기 내용이 너무 짧음" };
    }

    // 이미지 프롬프트 생성 (quote/date/weather로 계절감·오늘의 한 문장 반영)
    const quote = String(diary.quote ?? "").trim();
    const date = String(diary.date ?? "").trim();
    const weather = String(diary.weather ?? "").trim();
    let imagePrompts: string[] = [];
    try {
      imagePrompts = await generateImagePromptsFromSummary(summary, timeline, { quote, date, weather });
    } catch (e) {
      console.error(`[generate-images-for-all] 프롬프트 생성 실패 (${diaryId}):`, e);
      return { id: diaryId, ok: false, error: "프롬프트 생성 실패" };
    }

    // 캡션 생성
    let imageCaptions: string[] = [];
    try {
      imageCaptions = await generateImageCaptions(imagePrompts);
    } catch (e) {
      console.warn(`[generate-images-for-all] 캡션 생성 실패 (${diaryId}), 기본값 사용:`, e);
      imageCaptions = ["아침 장면", "낮에 있었던 일", "오후 활동", "저녁 식사"];
    }

    // 통합 프롬프트 생성 (날짜/날씨로 계절감·옷차림 반영)
    const imagePromptsFilled = ensureImagePrompts(imagePrompts, summary, String(diary.title ?? ""));
    const dateStr = String(diary.date ?? "").trim();
    const weatherStr = String(diary.weather ?? "").trim();
    const combinedImagePrompt = buildCombinedPrompt(imagePromptsFilled, members, imageCaptions, dateStr, weatherStr);

    // 나노바나나 API로 이미지 생성 시작 (taskId만 받기, 폴링은 클라이언트에서)
    const apiKey = process.env.NANOBANANA_API_KEY || process.env.NANO_BANANA_API_KEY || "";
    if (!apiKey.trim()) {
      return { id: diaryId, ok: false, error: "NANOBANANA_API_KEY가 설정되지 않음" };
    }

    const NANOBANANA_GENERATE_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/generate";
    const requestBody: Record<string, unknown> = {
      prompt: combinedImagePrompt,
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
      console.error(`[generate-images-for-all] 나노바나나 요청 실패 (${diaryId}):`, res.status, text);
      return { id: diaryId, ok: false, error: `나노바나나 요청 실패: ${res.status}` };
    }

    const json = (await res.json()) as {
      code?: number;
      data?: { taskId?: string };
      msg?: string;
    };

    if (json?.code === 402) {
      return { id: diaryId, ok: false, error: "크레딧 부족" };
    }

    const taskId = json?.data?.taskId ?? "";
    if (!taskId) {
      return { id: diaryId, ok: false, error: "taskId를 받지 못함" };
    }

    // 프롬프트만 저장하고, 이미지는 클라이언트에서 폴링하도록 설정
    // (Vercel 타임아웃 회피)
    await adminDb.collection("diaries").doc(diaryId).update({
      combinedImagePrompt: combinedImagePrompt,
      imagePrompts: imagePrompts,
      imageCaptions: imageCaptions,
      nanobananaTaskId: taskId, // 나중에 클라이언트에서 폴링할 수 있도록
      updatedAt: new Date().toISOString(),
    });

    // 클라이언트에서 폴링하도록 taskId 반환
    return { id: diaryId, ok: true, taskId, combinedImagePrompt };
  } catch (e) {
    console.error(`[generate-images-for-all] 오류 (${diaryId}):`, e);
    return {
      id: diaryId,
      ok: false,
      error: e instanceof Error ? e.message : "알 수 없는 오류",
    };
  }
}

/**
 * 기존 일기들에 이미지를 일괄 생성하는 API
 * POST /api/diary/generate-images-for-all
 * Body: { limit?: number } - 처리할 최대 일기 수 (기본값: 10)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? Math.min(body.limit, 10) : 5; // 최대 10개, 기본 5개

    // 이미지가 없는 일기들만 가져오기 (combinedImageUrl이 없거나 빈 문자열인 경우)
    // orderBy 없이 가져온 후 클라이언트에서 필터링 (인덱스 문제 회피)
    const snapshot = await adminDb
      .collection("diaries")
      .limit(limit * 3) // 필터링 전에 더 많이 가져오기
      .get();
    
    // 클라이언트에서 필터링 (Firestore where 쿼리는 빈 문자열 체크가 어려움)
    const diariesWithoutImage = (snapshot.docs || [])
      .filter((doc: any) => {
        const data = doc.data();
        const imageUrl = data?.combinedImageUrl;
        return !imageUrl || (typeof imageUrl === "string" && imageUrl.trim().length === 0);
      })
      .sort((a: any, b: any) => {
        // createdAt 기준으로 정렬 (최신순)
        const dateA = a.data()?.createdAt || "";
        const dateB = b.data()?.createdAt || "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, limit);

    if (diariesWithoutImage.length === 0) {
      return NextResponse.json({
        message: "이미지가 없는 일기가 없습니다.",
        processed: 0,
        results: [],
      });
    }

    const results: Array<{ id: string; ok: boolean; taskId?: string; combinedImagePrompt?: string; combinedImageUrl?: string; error?: string }> = [];

    for (const doc of diariesWithoutImage) {
      const data = doc.data();
      const result = await generateImageForDiary(doc.id, data);
      results.push(result);
      // API 한도 방지를 위해 각 일기 사이에 약간의 지연
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      message: `전체 ${results.length}개 중 ${okCount}개 이미지 생성 시작 (폴링은 백그라운드에서 진행됩니다)`,
      processed: results.length,
      success: okCount,
      failed: results.length - okCount,
      results: results.slice(0, 20).map((r) => ({
        id: r.id,
        ok: r.ok,
        taskId: (r as any).taskId,
        error: r.error,
      })),
    });
  } catch (e) {
    console.error("[generate-images-for-all] 오류:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "이미지 일괄 생성 실패",
      },
      { status: 500 }
    );
  }
}
