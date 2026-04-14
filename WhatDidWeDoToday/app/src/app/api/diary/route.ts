import { NextResponse } from "next/server";
import { adminDb, getMongoDb } from "@/lib/mongodbAdmin";
import { generateDiary, generateImageCaptions, extractGoodThingsFromTranscript, generateImagePromptsFromSummary, isGenericImagePromptsFallback } from "@/lib/llm";
import { generateImageWithNanobanana } from "@/lib/nanobanana";
import { saveCombinedImageToStorage } from "@/lib/saveDiaryImage";
import { buildCombinedPrompt, FALLBACK_IMAGE_STYLE, stripDialogueFromScene } from "@/lib/diary-prompt";

async function getFamilyProfiles() {
  try {
    const snapshot = await adminDb.collection("familyProfiles").get();
    const profiles: Record<string, any> = {};
    (snapshot.docs || []).forEach((doc: any) => {
      const data = doc.data();
      profiles[data.member] = data.features;
    });
    return profiles;
  } catch {
    return {};
  }
}

function buildCharacterDescription(member: string, features: any): string {
  if (!features) return "";
  
  const parts: string[] = [];
  if (features.hasBeard) parts.push("수염 있음");
  if (features.hairColor) parts.push(`${features.hairColor} 머리`);
  if (features.hairStyle) parts.push(features.hairStyle);
  if (features.faceShape) parts.push(`${features.faceShape} 얼굴`);
  if (features.eyeSize) parts.push(`${features.eyeSize}`);
  if (features.glasses) parts.push("안경 착용");
  
  if (parts.length === 0 && features.description) {
    return features.description;
  }
  
  return parts.join(", ");
}

export const runtime = "nodejs";

type DiaryPayload = {
  transcript: string;
  audioUrl?: string;
  date: string;
  location: string;
  weather: string;
  members: string[];
  photoUrls?: string[];
  photoData?: string; // JSON 문자열로 된 구조화된 사진 데이터
};

function ensureImagePrompts(
  imagePrompts: string[],
  summary: string,
  title: string,
) {
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


export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DiaryPayload;
    
    console.log(`[API] 일기 생성 요청: 날짜=${body.date}, 사진=${body.photoUrls?.length || 0}장, 텍스트=${body.transcript?.length || 0}자`);
    
    // 사진, 텍스트, 오디오 중 하나는 있어야 함
    const hasContent =
      (body.transcript && body.transcript.trim()) ||
      (body.photoUrls && body.photoUrls.length > 0) ||
      !!body.audioUrl;
    if (!hasContent) {
      return NextResponse.json(
        { error: "사진을 업로드하거나 텍스트·녹음을 입력해주세요." },
        { status: 400 },
      );
    }

    console.log("일기 생성 시작:", {
      transcriptLength: body.transcript.length,
      date: body.date,
      location: body.location,
      members: body.members,
      photoCount: body.photoUrls?.length || 0,
    });

    // 날씨 정보를 일기 날짜 기준으로 가져오기
    let finalWeather = body.weather;
    if (body.location && body.date) {
      try {
        // 위치 정보에서 좌표 추출 (간단한 방법: Nominatim 사용)
        const geocodeRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(body.location)}&limit=1`,
          { headers: { "User-Agent": "FamilyDiaryApp" } }
        );
        if (geocodeRes.ok) {
          const geoData = await geocodeRes.json();
          if (geoData && geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            // 일기 날짜 기준으로 날씨 가져오기 (과거 날짜도 가능)
            const dateStr = body.date; // YYYY-MM-DD 형식
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min`
            );
            if (weatherRes.ok) {
              const weatherData = await weatherRes.json();
              if (weatherData.daily && weatherData.daily.weather_code && weatherData.daily.weather_code[0]) {
                const code = weatherData.daily.weather_code[0];
                const tempMax = weatherData.daily.temperature_2m_max?.[0];
                const tempMin = weatherData.daily.temperature_2m_min?.[0];
                const weatherMap: Record<number, string> = {
                  0: "맑음", 1: "대체로 맑음", 2: "부분적으로 흐림", 3: "흐림",
                  45: "안개", 48: "서리 안개", 51: "이슬비(약)", 61: "비(약)",
                  71: "눈(약)", 80: "소나기(약)", 95: "뇌우",
                };
                const label = weatherMap[code] ?? "날씨 정보";
                if (typeof tempMax === "number" && typeof tempMin === "number") {
                  // 최저 ~ 최고온도 형식으로 표시 (공백 포함)
                  finalWeather = `${label} ${tempMin} ~ ${tempMax}°C`;
                } else {
                  finalWeather = label;
                }
                console.log(`일기 날짜(${dateStr}) 기준 날씨: ${finalWeather}`);
              }
            }
          }
        }
      } catch (weatherError) {
        console.warn("날짜 기준 날씨 가져오기 실패, 기본값 사용:", weatherError);
      }
    }

    // 사진 데이터 추출 (photoData가 있으면 우선 사용, 없으면 transcript에서 추출)
    let photoDataJson: string | undefined = body.photoData;
    if (!photoDataJson && body.transcript?.includes("=== 사진 내용")) {
      const match = body.transcript.match(/=== 사진 내용[^=]*===\s*([\s\S]*?)\s*=== 사진 내용 끝 ===/);
      photoDataJson = match?.[1]?.trim();
    }

    console.log(`[API] 일기 생성 시작: 날짜=${body.date}, 사진 데이터=${photoDataJson ? "있음" : "없음"}, 사진 URL=${body.photoUrls?.length || 0}개`);

    let diary;
    try {
      // photoDataJson이 있으면 3단계 프로세스 사용 (사진 기반), 없으면 기존 방식 (텍스트 기반)
      diary = await generateDiary(
        body.transcript || "", 
        {
          date: body.date,
          location: body.location,
          weather: finalWeather,
          members: body.members ?? [],
        }, 
        photoDataJson
      );
      
      console.log(`[API] 일기 생성 완료: 제목="${diary.title}", 요약 길이=${diary.summary?.length || 0}자`);
    } catch (error: any) {
      console.error("generateDiary 오류:", error);
      return NextResponse.json(
        { 
          error: error?.message || "일기 생성 중 오류가 발생했습니다",
          details: process.env.NODE_ENV === "development" ? String(error) : undefined
        },
        { status: 500 }
      );
    }

    try {
      const imagePrompts = ensureImagePrompts(
        diary.imagePrompts ?? [],
        diary.summary ?? "",
        diary.title ?? "",
      );
      
      const imageUrls: string[] = [];

      let combinedImagePrompt = "";
      let combinedImageUrl = "";
      let imageCaptions: string[] = diary.imageCaptions || [];
      if (imageCaptions.length === 0) {
        try {
          imageCaptions = await generateImageCaptions(imagePrompts);
        } catch (captionErr) {
          console.warn("캡션 생성 실패, 기본 캡션 사용:", captionErr);
          imageCaptions = ["아침 장면", "낮에 있었던 일", "오후 활동", "저녁 식사"];
        }
      }
      try {
        combinedImagePrompt = buildCombinedPrompt(imagePrompts, body.members ?? [], imageCaptions, body.date, finalWeather);
        // 나노바나나 폴링은 클라이언트에서 처리 (Vercel 타임아웃 회피)
        // 서버는 프롬프트만 생성하고, 클라이언트가 나노바나나 시작 → 폴링 → 완료 후 PATCH로 업데이트
        combinedImageUrl = "";
      } catch (promptError) {
        console.warn("이미지 프롬프트 생성 실패:", promptError);
        combinedImagePrompt = imagePrompts.join(" | ");
      }
      
      const now = new Date();

      // Firestore에 저장할 payload (너무 커지지 않게 일부 필드 사전 축소)
      let safeTranscript = body.transcript;
      if (typeof safeTranscript === "string" && safeTranscript.length > 1500) {
        safeTranscript = `${safeTranscript.slice(0, 1500)} ...(이하 생략)`;
      }

      // 4컷 프롬프트는 전체 저장 (생략하지 않음)
      const safeCombinedImagePrompt = combinedImagePrompt || "";

      // imagePrompts는 전체 표시 (생략하지 않음)
      let safeImagePrompts = diary.imagePrompts ?? [];
      if (Array.isArray(safeImagePrompts)) {
        safeImagePrompts = safeImagePrompts.slice(0, 4); // 최대 4개만, 길이 제한 없음
      }

      // photoUrls는 Firestore 문서 크기를 줄이기 위해 최대 10개까지만 저장
      // URL은 잘라내지 않음 (썸네일 표시를 위해 전체 URL 필요)
      const safePhotoUrls = Array.isArray(body.photoUrls) 
        ? body.photoUrls
            .slice(0, 10) // 최대 10개로 제한
            .filter(Boolean) // 빈 값 제거
        : [];

      console.log(`[API] 저장할 photoUrls: ${safePhotoUrls.length}개 (최대 10개)`);

      let payload: any = {
        ...diary,
        imageUrls,
        imagePrompts: safeImagePrompts,
        imageCaptions: imageCaptions.slice(0, 4),
        keywords: diary.keywords ?? [],
        quote: diary.quote ?? "",
        timeline: Array.isArray(diary.timeline) ? diary.timeline : [],
        combinedImagePrompt: safeCombinedImagePrompt,
        combinedImageUrl,
        transcript: safeTranscript,
        audioUrl: body.audioUrl ?? "",
        date: body.date,
        location: body.location,
        // 최종 계산된 날씨(일기 날짜 기준 최저~최고 온도)를 저장
        weather: finalWeather,
        members: body.members ?? [],
        photoUrls: safePhotoUrls, // 최대 20개까지 저장
        createdAt: now.toISOString(),
      };

      // summary 필드 크기 제한 (사진 기반 일기 생성 시 300-800자이지만 안전하게 제한)
      if (typeof payload.summary === "string" && payload.summary.length > 2000) {
        payload.summary = `${payload.summary.slice(0, 2000)} ...(이하 생략)`;
        console.warn("Summary 필드가 너무 길어 축소했습니다:", payload.summary.length);
      }

      // Firestore 문서 크기 제한(1MB)에 걸리지 않도록 안전하게 축소
      // 800KB 이상이면 미리 축소 시작 (여유를 두고)
      try {
        let size = Buffer.byteLength(JSON.stringify(payload), "utf8");
        console.log(`[API] 일기 문서 크기: ${(size / 1024).toFixed(2)}KB`);
        
        if (size > 800_000) {
          console.warn("Diary payload too large, truncating fields", { 
            size, 
            sizeKB: (size / 1024).toFixed(2) 
          });

          // summary 필드 축소 (가장 큰 필드일 가능성)
          if (typeof payload.summary === "string" && payload.summary.length > 1500) {
            payload.summary = `${payload.summary.slice(0, 1500)} ...(이하 생략)`;
          }

          // transcript 필드 축소
          if (typeof payload.transcript === "string" && payload.transcript.length > 3000) {
            payload.transcript = `${payload.transcript.slice(0, 3000)} ...(이하 생략)`;
          }

          // combinedImagePrompt(4컷 프롬프트)는 생략 없이 전체 유지

          // imagePrompts 배열 축소
          if (Array.isArray(payload.imagePrompts)) {
            payload.imagePrompts = payload.imagePrompts
              .slice(0, 4) // 최대 4개만
              .map((p: any) =>
                typeof p === "string" && p.length > 500
                  ? `${p.slice(0, 500)} ...(생략)`
                  : p,
              );
          }

          // photoUrls 배열 추가 축소 (이미 위에서 10개로 제한했지만 다시 확인)
          if (Array.isArray(payload.photoUrls) && payload.photoUrls.length > 10) {
            payload.photoUrls = payload.photoUrls.slice(0, 10);
          }

          // timeline 배열 축소
          if (Array.isArray(payload.timeline) && payload.timeline.length > 10) {
            payload.timeline = payload.timeline.slice(0, 10);
          }

          // keywords 배열 축소
          if (Array.isArray(payload.keywords) && payload.keywords.length > 6) {
            payload.keywords = payload.keywords.slice(0, 6);
          }

          size = Buffer.byteLength(JSON.stringify(payload), "utf8");
          console.warn("Diary payload resized", { 
            newSize: size, 
            newSizeKB: (size / 1024).toFixed(2) 
          });

          // 여전히 크면 더 강력하게 축소 (단, photoUrls는 최소 10개 유지)
          if (size > 950_000) {
            console.error("문서 크기가 여전히 너무 큽니다. 더 강력하게 축소합니다.");
            if (typeof payload.summary === "string") {
              payload.summary = payload.summary.slice(0, 1000);
            }
            // photoUrls는 최대 10개까지 유지 (사용자가 업로드한 사진 반영)
            // size가 여전히 크면 다른 필드를 더 축소
            size = Buffer.byteLength(JSON.stringify(payload), "utf8");
            console.warn("강력 축소 후 크기:", { 
              finalSize: size, 
              finalSizeKB: (size / 1024).toFixed(2) 
            });
          }
        }
      } catch (sizeError) {
        console.warn("Diary payload size check failed:", sizeError);
      }

      const docRef = await adminDb.collection("diaries").add(payload);
      const saved = await docRef.get();
      const savedId = saved.id as string;
      const savedData = saved.data() as Record<string, unknown> | null;

      // 일기 생성 직후 좋았던 일 자동 추출 (transcript/summary 있으면)
      // 단, 이미 goodThingsByMember가 있으면 덮어쓰지 않음
      try {
        const transcript = (savedData?.transcript ?? payload.transcript ?? "") as string;
        const summary = (savedData?.summary ?? payload.summary ?? "") as string;
        const members = (Array.isArray(payload.members) ? payload.members : ["엄마", "아빠", "아이"]) as string[];
        const existingGoodThings = savedData?.goodThingsByMember || payload.goodThingsByMember;
        
        // 이미 데이터가 있으면 건너뜀 (최초 추출 내용 보존)
        if (existingGoodThings && Object.keys(existingGoodThings).length > 0) {
          console.log("[API] 좋았던 일 데이터 이미 존재, 자동 추출 건너뜀");
        } else if ((transcript?.trim() || summary?.trim()) && summary?.trim()) {
          const goodThings = await extractGoodThingsFromTranscript(transcript || "", summary, members);
          if (Object.keys(goodThings).length > 0) {
            await adminDb.collection("diaries").doc(savedId).update({ goodThingsByMember: goodThings });
            console.log("[API] 좋았던 일 자동 추출 반영:", Object.keys(goodThings).length, "명");
          }
        }
      } catch (extractErr) {
        console.warn("[API] 좋았던 일 자동 추출 실패 (무시):", extractErr);
      }

      console.log("일기 저장 완료:", savedId);
      const finalData = await docRef.get();
      return NextResponse.json({ id: finalData.id, ...finalData.data() });
    } catch (saveError: any) {
      console.error("일기 저장 오류:", saveError);
      return NextResponse.json(
        { 
          error: saveError?.message || "일기 저장 중 오류가 발생했습니다",
          details: process.env.NODE_ENV === "development" ? String(saveError) : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("일기 생성 API 오류:", error);
    console.error("오류 스택:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "일기 생성 실패",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const search = url.searchParams.get("search");
  const limitParam = url.searchParams.get("limit");
  const limit =
    limitParam && /^\d+$/.test(limitParam) ? Math.max(1, Math.min(200, parseInt(limitParam, 10))) : 50;

  // 1) 단일 일기 조회 (상세 보기)
  if (id) {
    try {
      const db = await getMongoDb();
      const collection = db.collection("diaries");
      // MongoDB는 문자열 _id도 허용하지만, 타입 정의는 ObjectId를 기대하므로 any로 캐스팅
      const doc = await collection.findOne({ _id: id as any });
      if (!doc) {
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
      const { _id, ...data } = doc;
      return NextResponse.json({ id: String(_id), ...data });
    } catch (error: any) {
      console.error("[diary GET by id] 오류:", error);
      return NextResponse.json(
        { error: error?.message || "일기 조회 실패" },
        { status: 500 },
      );
    }
  }

  // 2) 목록 조회 (최신순 + 필드 축소 + limit 지원)
  try {
    const db = await getMongoDb();
    const collection = db.collection("diaries");

    // 간단한 텍스트 검색 (옵션)
    const query: Record<string, unknown> = {};
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: "i" } },
        { summary: { $regex: s, $options: "i" } },
        { location: { $regex: s, $options: "i" } },
        { keywords: { $elemMatch: { $regex: s, $options: "i" } } },
      ];
    }

    // 목록에 필요한 필드만 전송하여 페이로드 축소
    const projection = {
      date: 1,
      title: 1,
      summary: 1,
      keywords: 1,
      location: 1,
      weather: 1,
      photoUrls: 1,
      combinedImagePrompt: 1,
      createdAt: 1,
    };

    const docs = await collection
      .find(query, { projection })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    const diaries = docs.map((doc) => {
      const { _id, ...data } = doc as any;
      return {
        id: String(_id),
        ...data,
      };
    });

    console.log(`[diary GET] 일기 ${diaries.length}개 반환 (limit=${limit}, search=${search ?? ""})`);
    return NextResponse.json({
      diaries,
    });
  } catch (error: any) {
    const errorMessage = error?.message || "";
    console.error("[diary GET] 오류:", error);
    return NextResponse.json(
      {
        error: errorMessage || "일기 목록 조회 실패",
        diaries: [],
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}

/** 일기 수정 시 허용 필드 (부분 업데이트) */
type DiaryPatchPayload = {
  title?: string;
  summary?: string;
  quote?: string;
  timeline?: string[];
  goodThingsByMember?: Record<string, string[]>;
  keywords?: string[];
  location?: string;
  weather?: string;
  moodScore?: number;
  customImageUrl?: string;
  combinedImageUrl?: string;
  combinedImagePrompt?: string;
  imagePrompts?: string[];
  imageCaptions?: string[];
  /** YYYY-MM-DD 형식의 날짜 (예: 2026-01-29) */
  date?: string;
  /** Storage 없을 때 붙여넣기 이미지용 data URL (용량 제한 있음) */
  customImageDataUrl?: string;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id: string } & DiaryPatchPayload;
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const db = await getMongoDb();
    const collection = db.collection("diaries");
    const diary = await collection.findOne({ _id: id as any });
    if (!diary) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const allowed: (keyof DiaryPatchPayload)[] = [
      "title", "summary", "quote", "timeline", "goodThingsByMember",
      "keywords", "location", "weather", "moodScore", "customImageUrl",
      "combinedImageUrl", "combinedImagePrompt", "imagePrompts", "imageCaptions", "date",
      "customImageDataUrl",
    ];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        // null 값은 필드 삭제를 의미
        if (updates[key] === null) {
          payload[key] = null;
        } else {
          payload[key] = updates[key];
        }
      }
    }
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "no allowed fields to update" }, { status: 400 });
    }
    
    // null 값 처리: MongoDB에서 필드 삭제
    const updatePayload: Record<string, unknown> = {};
    const unsetPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value === null) {
        unsetPayload[key] = "";
      } else {
        updatePayload[key] = value;
      }
    }
    
    const mongoUpdate: Record<string, unknown> = {};
    if (Object.keys(updatePayload).length > 0) {
      mongoUpdate.$set = updatePayload;
    }
    if (Object.keys(unsetPayload).length > 0) {
      mongoUpdate.$unset = unsetPayload;
    }
    
    await collection.updateOne({ _id: id as any }, mongoUpdate);

    // 본문(summary) 수정 시 좋았던 일 + 4컷 프롬프트 자동 추출/재생성
    if (updates.summary != null && String(updates.summary).trim()) {
      try {
        const transcript = (diary.transcript ?? "") as string;
        const summary = String(updates.summary).trim();
        const members = (Array.isArray(diary.members) && diary.members.length > 0 ? diary.members : ["엄마", "아빠", "아이"]) as string[];
        const timeline = (updates.timeline ?? diary.timeline ?? []) as string[];
        const quote = String((updates as any).quote ?? diary.quote ?? "").trim();
        const date = String((updates as any).date ?? diary.date ?? "").trim();
        const weather = String((updates as any).weather ?? diary.weather ?? "").trim();

        const [goodThings, imagePrompts] = await Promise.all([
          extractGoodThingsFromTranscript(transcript, summary, members),
          generateImagePromptsFromSummary(summary, timeline, { quote, date, weather }),
        ]);

        const extra: Record<string, unknown> = {};
        if (Object.keys(goodThings).length > 0) extra.goodThingsByMember = goodThings;
        const existingPrompts = Array.isArray(diary.imagePrompts) && (diary.imagePrompts as string[]).length >= 4;
        const skipPromptsOverwrite = existingPrompts && Array.isArray(imagePrompts) && isGenericImagePromptsFallback(imagePrompts);
        if (Array.isArray(imagePrompts) && imagePrompts.length > 0 && !skipPromptsOverwrite) {
          extra.imagePrompts = imagePrompts.slice(0, 4);
          try {
            const imageCaptions = await generateImageCaptions(extra.imagePrompts as string[]);
            extra.combinedImagePrompt = buildCombinedPrompt(extra.imagePrompts as string[], members, imageCaptions);
            extra.imageCaptions = imageCaptions?.slice(0, 4);
          } catch (capErr) {
            extra.combinedImagePrompt = (extra.imagePrompts as string[]).join(" | ");
          }
        }
        if (Object.keys(extra).length > 0) {
          await collection.updateOne({ _id: id as any }, { $set: extra });
        }
      } catch (autoErr) {
        console.warn("[API] 본문 수정 후 좋았던 일/4컷 자동 반영 실패 (무시):", autoErr);
      }
    }

    const updated = await collection.findOne({ _id: id as any });
    return NextResponse.json({ id: updated?._id, ...updated });
  } catch (error: unknown) {
    console.error("일기 수정 API 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "일기 수정 실패" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 },
    );
  }

  await adminDb.collection("diaries").doc(id).delete();

  return NextResponse.json({ ok: true });
}
