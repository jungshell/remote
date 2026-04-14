import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { correctKoreanCaptionTypos, generateImageCaptions, generateImagePromptsFromSummary, isGenericImagePromptsFallback } from "@/lib/llm";
import { generateImageWithNanobanana } from "@/lib/nanobanana";
import { saveCombinedImageToStorage } from "@/lib/saveDiaryImage";
import { buildCombinedPrompt, FALLBACK_IMAGE_STYLE } from "@/lib/diary-prompt";

export const runtime = "nodejs";

function ensureImagePrompts(
  imagePrompts: string[],
  summary: string,
  title: string,
): string[] {
  const base = [title, summary, "가족의 오늘 하루"].filter(Boolean);
  const filled = [...imagePrompts];
  while (filled.length < 4) {
    const seed = base[filled.length % base.length];
    filled.push(`장면: ${seed}. ${FALLBACK_IMAGE_STYLE}`);
  }
  return filled.slice(0, 4).map((prompt) =>
    prompt.includes(FALLBACK_IMAGE_STYLE)
      ? prompt
      : `장면: ${prompt}. ${FALLBACK_IMAGE_STYLE}`,
  );
}

async function regenerateOne(
  diaryId: string,
  diary: Record<string, unknown>,
  options?: { regenerateScenes?: boolean; forceCaption?: boolean },
): Promise<{ id: string; ok: boolean; combinedImagePrompt?: string; combinedImageUrl?: string; error?: string; imageCaptions?: string[] }> {
  try {
    const title = String(diary.title ?? "");
    const summary = String(diary.summary ?? "");
    const timeline = Array.isArray(diary.timeline) ? (diary.timeline as string[]) : [];
    const members = Array.isArray(diary.members) ? (diary.members as string[]) : [];
    let imagePrompts: string[] = Array.isArray(diary.imagePrompts)
      ? (diary.imagePrompts as string[]).slice(0, 4)
      : [];

    let gotRealPrompts = false;
    if (options?.regenerateScenes && summary) {
      try {
        const quote = String(diary.quote ?? "").trim();
        const date = String(diary.date ?? "").trim();
        const weather = String(diary.weather ?? "").trim();
        const newPrompts = await generateImagePromptsFromSummary(summary, timeline, { quote, date, weather });
        // LLM 실패로 기본값(아침 장면, 낮에 있었던 일…)이 반환되면 기존 구체적 프롬프트를 덮어쓰지 않음
        gotRealPrompts = newPrompts.length > 0 && !isGenericImagePromptsFallback(newPrompts);
        if (gotRealPrompts) imagePrompts = newPrompts.slice(0, 4);
      } catch (sceneErr) {
        console.warn("[regenerate-4cut] 장면 재생성 실패, 기존 imagePrompts 유지:", sceneErr);
      }
    }

    imagePrompts = ensureImagePrompts(imagePrompts, summary, title);
    // 기본값으로 덮어쓴 경우·장면 재생성 안 한 경우: 기존 캡션 유지. 새 장면만 받았을 때만 캡션 재생성(한글 깨짐·아빠 2명 등 방지)
    const hasExistingCaptions = Array.isArray(diary.imageCaptions) && (diary.imageCaptions as string[]).length >= 4;
    const keepExistingCaptions =
      !options?.forceCaption &&
      ((options?.regenerateScenes && !gotRealPrompts && hasExistingCaptions) || (!options?.regenerateScenes && hasExistingCaptions));
    let imageCaptions: string[] = keepExistingCaptions ? (diary.imageCaptions as string[]).slice(0, 4) : [];
    console.log(`[regenerate-4cut] Caption generation check - hasExisting: ${hasExistingCaptions}, keepExisting: ${keepExistingCaptions}, currentLength: ${imageCaptions.length}`);
    if (imageCaptions.length < 4) {
      try {
        console.log(`[regenerate-4cut] Generating new captions for prompts:`, imagePrompts);
        imageCaptions = await generateImageCaptions(imagePrompts);
        console.log(`[regenerate-4cut] Generated captions:`, imageCaptions);
      } catch (captionErr) {
        console.warn("[regenerate-4cut] 캡션 생성 실패, 기본 캡션 사용:", captionErr);
        imageCaptions = ["아침 장면", "낮에 있었던 일", "오후 활동", "저녁 식사"];
      }
    }
    imageCaptions = imageCaptions.slice(0, 4).map((c) => correctKoreanCaptionTypos(c));
    const date = String(diary.date ?? "").trim();
    const weather = String(diary.weather ?? "").trim();
    const combinedImagePrompt = buildCombinedPrompt(imagePrompts, members, imageCaptions, date, weather);
    // 나노바나나 폴링은 클라이언트에서 처리 (Vercel 타임아웃 회피)
    // 서버는 프롬프트만 생성하고, 클라이언트가 나노바나나 시작 → 폴링 → 완료 후 PATCH로 업데이트
    // 기존 URL은 유지 (클라이언트 폴링 완료 전까지 표시)
    const existingImageUrl = typeof diary.combinedImageUrl === "string" ? (diary.combinedImageUrl as string).trim() : "";
    const combinedImageUrl = existingImageUrl;

    await adminDb.collection("diaries").doc(diaryId).update({
      combinedImagePrompt,
      combinedImageUrl,
      imagePrompts,
      imageCaptions: imageCaptions.slice(0, 4),
      updatedAt: new Date().toISOString(),
    });
    // 반환값에 명시적으로 imageCaptions 추가
    return { id: diaryId, ok: true, combinedImagePrompt, combinedImageUrl, imageCaptions: imageCaptions.slice(0, 4) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "실패";
    return { id: diaryId, ok: false, error: msg };
  }
}

/** 4컷 프롬프트·이미지 URL을 최신 캐릭터/스타일로 재생성. id / date(YYYY-MM-DD) / all: true */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : undefined;
    const dateStr = typeof body.date === "string" ? body.date.trim() : undefined;
    const regenerateAll = body.all === true;
    const allExceptDate =
      typeof body.allExceptDate === "string" ? body.allExceptDate.trim() : undefined;
    const regenerateScenes = body.regenerateScenes === true;
    const forceCaption = body.forceCaption === true;
    const saveExistingImages = body.saveExistingImages === true;
    const options = {
      regenerateScenes,
      forceCaption,
    };

    if (saveExistingImages) {
      const snap = await adminDb.collection("diaries").get();
      const results: { id: string; ok: boolean; url?: string; error?: string }[] = [];
      for (const doc of (snap.docs || [])) {
        const data = (doc as { data?: () => Record<string, unknown> }).data?.();
        const existingUrl = data?.combinedImageUrl as string | undefined;
        if (!existingUrl?.trim() || existingUrl.includes("storage.googleapis.com")) {
          results.push({ id: (doc as { id?: string }).id || '', ok: true });
          continue;
        }
        try {
          const storedUrl = await saveCombinedImageToStorage(doc.id, existingUrl);
          if (storedUrl) {
            await adminDb.collection("diaries").doc(doc.id).update({
              combinedImageUrl: storedUrl,
              updatedAt: new Date().toISOString(),
            });
            results.push({ id: (doc as { id?: string }).id || '', ok: true, url: storedUrl });
          } else {
            results.push({ id: (doc as { id?: string }).id || '', ok: false, error: "저장 실패" });
          }
        } catch (e) {
          results.push({
            id: (doc as { id?: string }).id || '',
            ok: false,
            error: e instanceof Error ? e.message : "저장 실패",
          });
        }
      }
      const okCount = results.filter((x) => x.ok).length;
      return NextResponse.json({
        message: `기존 이미지 Storage 저장: ${results.length}개 중 ${okCount}개 완료`,
        results,
      });
    }

    if (regenerateAll || allExceptDate) {
      const snap = await adminDb.collection("diaries").get();
      const docs =
        allExceptDate !== undefined
          ? (snap.docs || []).filter((d: { data?: () => Record<string, unknown> }) => (d.data?.()?.date as string) !== allExceptDate)
          : (snap.docs || []);
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const doc of docs as { id?: string; data?: () => Record<string, unknown> }[]) {
        const docId = doc.id || '';
        const docData = doc.data?.() || {};
        const r = await regenerateOne(
          docId,
          { id: docId, ...docData } as Record<string, unknown>,
          options,
        );
        results.push(r);
      }
      const okCount = results.filter((x) => x.ok).length;
      const msg =
        allExceptDate
          ? `날짜 ${allExceptDate} 제외 ${docs.length}개 중 ${okCount}개 4컷 재생성 완료`
          : `전체 ${results.length}개 중 ${okCount}개 4컷 프롬프트 재생성 완료`;
      return NextResponse.json({ message: msg, results });
    }

    let diaryId: string;
    let diary: Record<string, unknown>;

    if (id) {
      const doc = await adminDb.collection("diaries").doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      const docData = (doc as { id?: string; data?: () => Record<string, unknown> });
      diaryId = docData.id || id;
      diary = { id: docData.id || id, ...docData.data?.() } as Record<string, unknown>;
    } else if (dateStr) {
      const snap = await adminDb
        .collection("diaries")
        .where("date", "==", dateStr)
        .limit(1)
        .get();
      const found = (snap.docs || []).find((d: { data?: () => Record<string, unknown> }) => d.data?.()?.date === dateStr);
      if (!found || (snap.docs || []).length === 0) {
        return NextResponse.json(
          { error: `날짜에 해당하는 일기를 찾을 수 없습니다: ${dateStr}` },
          { status: 404 },
        );
      }
      const doc = (snap.docs || [])[0] as { id?: string; data?: () => Record<string, unknown> };
      diaryId = doc.id || '';
      diary = { id: doc.id || '', ...doc.data?.() } as Record<string, unknown>;
    } else {
      return NextResponse.json(
        { error: "id, date(YYYY-MM-DD), all: true, allExceptDate(YYYY-MM-DD), 또는 saveExistingImages: true 가 필요합니다." },
        { status: 400 },
      );
    }

    const r = await regenerateOne(diaryId, diary, options);
    if (!r.ok) {
      console.error(`[regenerate-4cut] regenerateOne failed for diary ${diaryId}:`, r.error);
      return NextResponse.json({ error: r.error ?? "재생성 실패" }, { status: 500 });
    }
    console.log(`[regenerate-4cut] Success for diary ${diaryId}, captions:`, r.imageCaptions);
    return NextResponse.json({
      id: r.id,
      combinedImagePrompt: r.combinedImagePrompt,
      combinedImageUrl: r.combinedImageUrl,
      imageCaptions: r.imageCaptions,
    });
  } catch (e) {
    console.error("[API] regenerate-4cut error:", e);
    const message = e instanceof Error ? e.message : "4컷 프롬프트 재생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
