/**
 * LLM 통신 모듈
 * Gemini API를 주로 사용하고, 실패 시 Groq API로 폴백합니다.
 */

type DiaryMeta = {
  date: string;
  location: string;
  weather: string;
  members: string[];
};

type DiaryResult = {
  title: string;
  summary: string;
  timeline: string[];
  goodThingsByMember: Record<string, string[]>;
  quote: string;
  moodScore: number;
  imagePrompts: string[];
  imageCaptions?: string[];
  keywords: string[];
};

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

const IMAGE_STYLE =
  "굵고 울퉁불퉁한 손그림 선과 크레파스 질감이 잘 보이는 어린이 크레파스 그림 스타일. 빨강, 파랑, 노랑, 초록 같은 선명한 원색 사용. 색칠이 선 밖으로 넘치고 자유롭고 귀여운 낙서 느낌. 배경은 흰색이며, 전체적으로 순수하고 즐거운 분위기. 어린이 손그림, 유치한 크레파스 그림, 종이 질감, 단순한 형태, 어설픈 비율, 단순한 표정, 삐뚤빼뚤한 선, 7살 남자 아이가 그린 느낌. 캐릭터: 엄마(검은색 짧은머리, 긴형 얼굴, 안경 착용), 아빠(수염 깔끔, 검은색 짧은머리, 각진형 얼굴), 아이(검은색 짧은머리, 둥근형 얼굴).";

/** 기존 일기의 타임라인·한 문장을 바탕으로 일기 본문만 150~300자, 평서체(했다/안 울었다)로 재생성 (API용) */
export async function regenerateDiaryBody(params: {
  timeline: string[];
  quote: string;
  summary?: string;
}): Promise<string> {
  const { timeline, quote, summary } = params;
  const timelineText = timeline.length > 0 ? timeline.map((t, i) => `${i + 1}. ${t}`).join("\n") : "없음";
  const prompt = [
    "아래는 가족 그림일기의 '오늘의 한 문장'과 '오늘 있었던 일' 목록이에요.",
    "이 내용을 바탕으로 일기 본문(일기 내용) 하나만 새로 작성해주세요.",
    "",
    "=== 오늘의 한 문장 ===",
    quote || "오늘도 좋은 하루였다.",
    "",
    "=== 오늘 있었던 일 ===",
    timelineText,
    "",
    summary ? `=== 참고: 기존 일기 내용 (이와 비슷한 톤으로 새로 작성) ===\n${summary.slice(0, 500)}\n=== 끝 ===` : "",
    "",
    "요구사항:",
    "1. 분량: 150자 이상 300자 이하로만 작성하세요.",
    "2. 반드시 평서체로 쓰세요. '~했다', '~였다', '안 울었다', '~인 거다' 같은 표현을 사용하고, '~했어요'·'~인 거예요' 같은 해요체는 쓰지 마세요.",
    "3. 타임라인과 한 문장에 나온 일만 담고, 자연스러운 문단 하나로 이어주세요.",
    "4. JSON이나 설명 없이 일기 본문만 출력하세요.",
  ].filter(Boolean).join("\n");

  try {
    let text = await callGemini(prompt, { temperature: 0.3 });
    text = text.trim();
    if (text.length > 320) {
      const last = text.slice(0, 300).trim();
      const period = last.lastIndexOf(".");
      text = period > 180 ? last.slice(0, period + 1) : last + ".";
    }
    if (text.length < 100) throw new Error("생성된 본문이 너무 짧습니다.");
    return text;
  } catch (e: any) {
    if (e.message === "GEMINI_QUOTA_EXCEEDED" || (e.message && String(e.message).includes("429"))) {
      const groqText = await callGroq(prompt).catch(() => "");
      const text = groqText.trim();
      if (text.length >= 100) {
        if (text.length > 320) {
          const last = text.slice(0, 300).trim();
          const period = last.lastIndexOf(".");
          return period > 180 ? last.slice(0, period + 1) : last + ".";
        }
        return text;
      }
    }
    throw e;
  }
}

// 1단계: 사진 데이터 기반으로 일기 본문 생성 (150~300자, 어린이 말투)
async function generateDiaryStory(photoDataJson: string, textInput: string, meta: DiaryMeta): Promise<string> {
  let photoData: any[] = [];
  try {
    photoData = JSON.parse(photoDataJson);
  } catch {
    throw new Error("사진 데이터 파싱 실패");
  }
  
  // 사진 데이터가 비어있으면 기본 메시지 반환
  if (!photoData || photoData.length === 0) {
    return "오늘은 사진을 찍은 하루였습니다.";
  }

  // 사진 데이터 필터링 및 정리
  const validPhotos = photoData.filter((p: any) => {
    // 시간 정보가 있거나, 설명/활동/장소/인물/태그 중 하나라도 있으면 유효한 사진
    return p.시간 || p.시간표시 || (p.설명 && p.설명.trim() && p.설명 !== "사진 분석에 실패했습니다" && p.설명 !== "사진이 업로드되었습니다") || p.활동 || p.장소 || (p.인물 && p.인물.length > 0) || (p.태그 && p.태그.length > 0);
  });
  
  // 유효한 사진이 없으면 기본 메시지 반환
  if (validPhotos.length === 0) {
    return `오늘은 ${photoData.length}장의 사진을 찍은 하루였습니다. 가족과 함께 좋은 시간을 보냈습니다.`;
  }
  
  const photoListText = validPhotos.map((p: any) => {
    const parts: string[] = [];
    // 시간 정보를 우선적으로 표시 (시간표시가 있으면 사용, 없으면 시간 사용)
    if (p.시간표시) {
      parts.push(`시간: ${p.시간표시} (${p.시간})`);
    } else if (p.시간) {
      parts.push(`시간: ${p.시간}`);
    }
    if (p.설명 && p.설명.trim() && p.설명 !== "사진 분석에 실패했습니다" && p.설명 !== "사진이 업로드되었습니다") {
      parts.push(`설명: ${p.설명}`);
    }
    if (p.활동 && p.활동 !== "기타") parts.push(`활동: ${p.활동}`);
    if (p.장소) parts.push(`장소: ${p.장소}`);
    if (p.인물 && p.인물.length > 0) parts.push(`인물: ${p.인물.join(", ")}`);
    if (p.태그 && p.태그.length > 0) parts.push(`태그: ${p.태그.join(", ")}`);
    return `사진 ${p.순서}: ${parts.length > 0 ? parts.join(" | ") : "사진이 있습니다"}`;
  }).join("\n");

  console.log(`[LLM] generateDiaryStory: ${validPhotos.length}장의 유효한 사진 데이터 사용 (전체: ${photoData.length}장)`);
  console.log(`[LLM] 사진 데이터 샘플:`, validPhotos.slice(0, 2));

  const prompt = [
    "아래 사진 데이터와 녹음 내용을 시간순으로 읽고, 각 사진의 내용과 녹음 내용을 바탕으로 서정적이고 감성적인 하루 일기를 작성해주세요.",
    "",
    "=== 사진 데이터 (시간순) ===",
    photoListText,
    "=== 사진 데이터 끝 ===",
    textInput.trim() ? `\n=== 녹음 내용 (반드시 포함하세요) ===\n${textInput}\n=== 녹음 내용 끝 ===` : "",
    "",
    "⚠️ 중요:",
    "1. 사진 데이터에 나온 내용만 사용하세요. 사진에 없는 내용은 절대 만들지 마세요.",
    textInput.trim() ? "2. ⚠️ 녹음 내용에 나온 일도 반드시 일기에 포함하세요. 녹음 내용과 사진 내용을 모두 반영하세요." : "",
    "",
    "작성 요구사항:",
    "1. ⚠️ 절대 사진 속 내용을 단순히 나열하지 마세요. 시간의 흐름에 따라 자연스럽게 연결된 하나의 이야기로 작성하세요.",
    "2. 사진들 사이의 연결고리와 전환을 자연스럽게 만들어주세요. 예: '식사를 마치고', '그 후', '잠시 후', '곧이어' 등의 표현을 사용하세요.",
    "3. 감정과 분위기를 담아주세요. 단순히 '아이가 테이블에 앉아 있다'가 아니라 '아이는 테이블에 앉아 즐겁게 웃고 있었다'처럼 감정을 표현하세요.",
    "4. 사진 데이터의 '설명', '활동', '인물', '태그' 필드를 활용하되, 이를 자연스러운 이야기 속에 녹여내세요.",
    "5. ⚠️ 일기 본문은 150자 이상 300자 이하로만 작성하세요.",
    "6. ⚠️ 반드시 평서체로 써주세요. '~했다', '~였다', '안 울었다', '~인 거다' 같은 표현을 쓰고, '~했어요'·'~인 거예요' 같은 해요체는 쓰지 마세요.",
    "7. 시간 정보(예: '오전 12시 39분', '오후 2시' 등)를 일기 본문에 직접 언급하지 마세요. 시간의 흐름은 자연스럽게 표현하되, 구체적인 시간은 쓰지 마세요.",
    "8. 사진에 보이는 물건들을 단순 나열하지 말고, 그것들이 이야기 속에서 어떤 의미를 가지는지 자연스럽게 표현하세요.",
    "",
    "❌ 나쁜 예시 (나열식):",
    "'아이는 테이블에 앉아 있다. 테이블 위에는 고기 꼬치, 채소, 음료가 있다. 배경에는 미쉐린 가이드 표지판이 보인다. 아이는 장난감을 가지고 있다.'",
    "",
    "✅ 좋은 예시 (서정적 네러티브):",
    "'오늘은 특별한 하루였다. 아이와 함께 음식점에 앉아 맛있는 식사를 즐겼다. 아이는 테이블 위에 놓인 음식을 보며 호기심 어린 눈으로 주변을 둘러보았다. 벽에 걸린 미쉐린 가이드 표지판이 우리의 식사를 더욱 특별하게 만들어주었다. 식사를 마치고 호텔로 돌아온 아이는 침대 위에서 장난감들과 함께 즐겁게 놀았다. 아이의 밝은 웃음소리가 객실을 가득 채웠다.'",
    "",
    "일기 본문만 작성해주세요 (JSON 형식 없이 순수 텍스트만, 150~300자, 평서체(했다/였다/안 울었다)로 서정적이고 감성적인 이야기로):",
  ].filter(Boolean).join("\n");

  // callGemini 함수 사용 (순수 텍스트 응답)
  // Gemini 실패 시 Groq로 폴백
  try {
    const story = await callGemini(prompt, { temperature: 0.1 });
    return story.trim();
  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message.includes("429")) {
      console.log("[LLM] generateDiaryStory: Gemini 한도 초과, Groq로 폴백");
      try {
        // Groq는 JSON 형식이 아닌 순수 텍스트로 응답
        const groqStory = await callGroq(prompt);
        return groqStory.trim();
      } catch (groqError: any) {
        console.error("generateDiaryStory Groq 폴백 실패:", groqError);
        // Groq도 실패하면 사진 데이터에서 간단한 일기 생성
        try {
          let photoData: any[] = [];
          try {
            photoData = JSON.parse(photoDataJson);
          } catch {
            // 파싱 실패해도 계속 진행
          }
          
          if (photoData && photoData.length > 0) {
            // 사진 데이터에서 간단한 일기 생성
            const simpleStoryParts: string[] = [];
            photoData.forEach((p: any, idx: number) => {
              const parts: string[] = [];
              // 시간 정보가 있으면 시간 기반으로 작성
              if (p.시간표시) {
                parts.push(p.시간표시);
              } else if (p.시간) {
                parts.push(p.시간);
              }
              
              if (p.설명 && p.설명.trim() && p.설명 !== "사진이 업로드되었습니다" && p.설명 !== "사진 분석에 실패했습니다") {
                parts.push(p.설명);
              }
              if (p.활동 && p.활동 !== "기타") parts.push(p.활동 + "를 했습니다");
              if (p.장소) parts.push(p.장소 + "에 있었습니다");
              if (p.인물 && p.인물.length > 0) parts.push(`${p.인물.join(", ")}와 함께`);
              
              if (parts.length > 0) {
                simpleStoryParts.push(parts.join(" "));
              } else if (idx < 5) {
                // 처음 5개 사진은 기본 설명 추가
                simpleStoryParts.push(`사진 ${idx + 1}에서 좋은 시간을 보냈습니다`);
              }
            });
            
            if (simpleStoryParts.length > 0) {
              const simpleStory = simpleStoryParts.join(". ") + ".";
              if (simpleStory.length >= 100) {
                console.log("[LLM] 사진 데이터 기반 간단한 일기 생성 성공");
                return simpleStory;
              }
            }
          }
          
          // 최종 폴백: 기본 메시지
          const defaultStory = `오늘은 ${photoData?.length || 0}장의 사진을 찍은 하루였습니다. 가족과 함께 좋은 시간을 보냈습니다.`;
          console.log("[LLM] 기본 일기 생성");
          return defaultStory;
        } catch (fallbackError) {
          console.error("간단한 일기 생성도 실패:", fallbackError);
          // 최종 폴백: 기본 메시지
          return "오늘은 좋은 하루였습니다. 가족과 함께 즐거운 시간을 보냈습니다.";
        }
      }
    }
    console.error("generateDiaryStory 오류:", error);
    throw error;
  }
}

// 2단계: 1단계 결과를 기반으로 요약/태그/타임라인 생성
async function generateDiarySummary(story: string, meta: DiaryMeta): Promise<{
  quote: string;
  keywords: string[];
  timeline: string[];
}> {
  const prompt = [
    "아래 일기 본문을 읽고 다음을 생성해주세요:",
    "",
    "=== 일기 본문 ===",
    story,
    "=== 일기 본문 끝 ===",
    "",
    "요구사항:",
    "1. '오늘의 한 문장': 아이(시온이)의 시각과 생각으로, 행동과 감정을 한 문장에 담아주세요. (20자 내외)",
    "   - 주어('시온이는', '나는')는 생략하고 내용만 서술하세요.",
    "   - 형식: '[행동]해서 [감정]한 하루' 또는 '[행동]하고 [감정]했다'",
    "   - 예: '물놀이를 실컷 해서 정말 신나는 하루', '엄마랑 요리해서 뿌듯하고 행복했다', '친구랑 싸워서 조금 속상했다'",
    "   - 절대 금지: 이름('시온이') 언급 금지, '시온이브' 같은 오타 금지, 문맥 없는 명사 나열 금지.",
    "   - 어조: 7살 아이가 일기장에 쓰는 듯한 솔직하고 귀여운 말투.",
    "   - 본문에 없는 추상적 표현('삶의 터전', '희망' 등)은 쓰지 마세요.",
    "2. '해시태그': 일기 본문에 나온 주요 키워드 4-6개 (한국어, 짧은 명사)",
    "3. '오늘 있었던 일': 일기 본문에 나온 주요 활동을 시간순으로 나열 (5-8개). 반드시 맞춤법·표준어·띄어쓰기를 지킨다. 흔한 오기 금지: '차를 타고'(O) '차품 타고'(X), '꽈배기'(O) '꽈베기'(X). 조사 '-를/을', '-와/과' 정확히.",
    "",
    "JSON 형식:",
    "{",
    '  "quote": "오늘의 한 문장",',
    '  "keywords": ["해시태그1", "해시태그2", ...],',
    '  "timeline": ["활동1", "활동2", ...]',
    "}",
  ].join("\n");

  // callGemini 함수 사용 (JSON 형식 응답)
  // Gemini 실패 시 Groq로 폴백
  try {
    const text = await callGemini(prompt, { 
      response_mime_type: "application/json",
      temperature: 0.1 
    });
    const json = safeJsonParse(text);
    
    if (!json) {
      throw new Error("요약 생성 실패: JSON 파싱 오류");
    }

    const quote = trimQuoteToMaxChars(json.quote || "");
    return {
      quote,
      keywords: Array.isArray(json.keywords) ? json.keywords.slice(0, 6) : [],
      timeline: Array.isArray(json.timeline) ? json.timeline.slice(0, 10) : [],
    };
  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message.includes("429")) {
      console.log("[LLM] generateDiarySummary: Gemini 한도 초과, Groq로 폴백");
      try {
        const groqText = await callGroq(prompt);
        const json = safeJsonParse(groqText);
        if (!json) {
          throw new Error("요약 생성 실패: JSON 파싱 오류");
        }
        const quote = trimQuoteToMaxChars(json.quote || "");
        return {
          quote,
          keywords: Array.isArray(json.keywords) ? json.keywords.slice(0, 6) : [],
          timeline: Array.isArray(json.timeline) ? json.timeline.slice(0, 10) : [],
        };
      } catch (groqError: any) {
        console.error("generateDiarySummary Groq 폴백 실패:", groqError);
        // Groq도 실패하면 기본값 반환 (일기 생성은 계속 진행)
        return {
          quote: "오늘도 좋은 하루였습니다",
          keywords: ["일상", "가족", "추억"],
          timeline: ["하루를 보냈습니다"],
        };
      }
    }
    console.error("generateDiarySummary 오류:", error);
    throw error;
  }
}

// 3단계: 1단계 결과를 기반으로 4컷 프롬프트 생성 (앱에 저장된 날짜·날씨로 복장 계절감 반영)
async function generateImagePrompts(
  story: string,
  photoDataJson: string,
  members: string[],
  options?: { date?: string; weather?: string },
): Promise<{ imagePrompts: string[]; imageCaptions: string[] }> {
  let photoData: any[] = [];
  try {
    photoData = JSON.parse(photoDataJson);
  } catch {
    // 파싱 실패 시 빈 배열
  }

  // 사진 데이터에서 실제로 등장하는 인물만 추출
  const actualPeople = new Set<string>();
  photoData.forEach((p: any) => {
    if (p.인물 && Array.isArray(p.인물)) {
      p.인물.forEach((person: string) => actualPeople.add(person));
    }
  });
  const actualPeopleList = Array.from(actualPeople);

  const date = options?.date?.trim() || "";
  const weather = options?.weather?.trim() || "";

  const lines: string[] = [
    "아래 일기 본문과 사진 데이터를 읽고, 실제로 보이는 장면만 바탕으로 4컷 만화 프롬프트를 생성해주세요.",
    "",
    "=== 일기 본문 ===",
    story,
    "=== 일기 본문 끝 ===",
    "",
    "=== 사진 데이터 ===",
    photoData.map((p: any) => {
      const parts: string[] = [];
      parts.push(`사진 ${p.순서} (${p.시간 || "시간 없음"})`);
      if (p.설명) parts.push(`설명: ${p.설명}`);
      if (p.활동) parts.push(`활동: ${p.활동}`);
      if (p.장소) parts.push(`장소: ${p.장소}`);
      if (p.인물 && p.인물.length > 0) parts.push(`인물: ${p.인물.join(", ")}`);
      if (p.태그 && p.태그.length > 0) parts.push(`태그: ${p.태그.join(", ")}`);
      return parts.join(" | ");
    }).join("\n"),
    "=== 사진 데이터 끝 ===",
  ];

  if (date || weather) {
    lines.push("", "=== 날짜·날씨 (복장 계절감 참고, 앱에 저장된 정보) ===");
    if (date) lines.push(`날짜: ${date}`);
    if (weather) lines.push(`날씨: ${weather}`);
    lines.push("");
  }

  lines.push(
    "⚠️ 절대 중요:",
    `- 사진 데이터의 '인물' 필드에 나온 사람만 등장시켜주세요.`,
    `- 실제 사진에 등장한 인물: ${actualPeopleList.length > 0 ? actualPeopleList.join(", ") : "없음"}`,
    `- 사진 데이터에 없는 인물(예: 아빠, 엄마 등)은 절대 추가하지 마세요.`,
    `- 사진 데이터에 '인물: 아이'만 있으면 아이만 등장, '인물: 아이, 엄마'만 있으면 아이와 엄마만 등장해야 합니다.`,
    "",
    "요구사항:",
    "1. 일기 본문과 사진 데이터에 실제로 나온 장면만 사용하세요.",
    "2. 사진 데이터에 없는 장면은 만들지 마세요.",
    "3. 사진 데이터의 '인물' 필드에 명시된 사람만 등장시켜주세요. 없는 사람은 절대 추가하지 마세요.",
    "4. 4개의 장면을 시간순으로 선택하세요.",
    "5. 각 항목은 '장면: [구체적인 장면 설명만]' 형식으로 작성하세요. 스타일·톤·질감 문구는 넣지 마세요. (스타일은 전체에 일괄 적용됩니다.)",
  );

  if (date || weather) {
    lines.push(
      "6. **복장은 반드시 위 날짜·날씨(계절)에 맞게** 장면 설명에 넣어주세요: 겨울·추우면 긴팔, 코트·패딩·목도리; 여름·더우면 반팔·민소매; 봄·가을은 긴팔·가벼운 겉옷 등.",
    );
  }
  
  lines.push(
    "7. **자막(캡션)**: 각 장면을 설명하는 15자 이내의 한글 자막을 만들어주세요. 7살 아이가 말하는 듯한 귀여운 말투로. 오탈자가 절대 없어야 합니다. 맞춤법을 정확하게 지켜주세요."
  );

  lines.push(
    "",
    "JSON 형식:",
    "{",
    '  "imagePrompts": ["장면: ...", "장면: ...", "장면: ...", "장면: ..."],',
    '  "imageCaptions": ["자막1", "자막2", "자막3", "자막4"]',
    "}",
  );

  const prompt = lines.join("\n");

  // callGemini 함수 사용 (JSON 형식 응답)
  // Gemini 실패 시 Groq로 폴백
  try {
    const text = await callGemini(prompt, { 
      response_mime_type: "application/json",
      temperature: 0.1 
    });
    const json = safeJsonParse(text);
    
    if (!json || !Array.isArray(json.imagePrompts)) {
      const prompts = photoData.slice(0, 4).map((p: any) =>
        `장면: ${p.설명 || p.활동 || "일상"}`
      );
      return { imagePrompts: prompts, imageCaptions: [] };
    }
      const prompts = json.imagePrompts.slice(0, 4).map((p: string) =>
        typeof p === "string" && p.trim() ? (p.trim().startsWith("장면:") ? p.trim() : `장면: ${p.trim()}`) : "장면: 일상"
      );
      const captions = Array.isArray(json.imageCaptions) ? json.imageCaptions.slice(0, 4) : [];
      return { imagePrompts: prompts, imageCaptions: captions };
    } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message.includes("429")) {
      console.log("[LLM] generateImagePrompts: Gemini 한도 초과, Groq로 폴백");
      try {
        const groqText = await callGroq(prompt);
        const json = safeJsonParse(groqText);
        if (json && Array.isArray(json.imagePrompts)) {
          const prompts = json.imagePrompts.slice(0, 4).map((p: string) =>
            typeof p === "string" && p.trim() ? (p.trim().startsWith("장면:") ? p.trim() : `장면: ${p.trim()}`) : "장면: 일상"
          );
          const captions = Array.isArray(json.imageCaptions) ? json.imageCaptions.slice(0, 4) : [];
          return { imagePrompts: prompts, imageCaptions: captions };
        }
      } catch (groqError: any) {
        console.error("generateImagePrompts Groq 폴백 실패:", groqError);
      }
    }
    console.error("generateImagePrompts 오류:", error);
    const prompts = photoData.slice(0, 4).map((p: any) =>
      `장면: ${p.설명 || p.활동 || "일상"}`
    );
    return { imagePrompts: prompts, imageCaptions: [] };
  }
}

export type ImagePromptsFromSummaryOptions = {
  quote?: string;
  date?: string;
  weather?: string;
};

/**
 * 일기 본문(summary)과 타임라인만으로 4컷 만화 장면 프롬프트를 생성합니다.
 * 사진 데이터 없이 일기 내용을 시간순·디테일하게 반영합니다.
 * quote/date/weather가 있으면 복장 계절감·오늘의 한 문장 반영을 지시합니다.
 */
export async function generateImagePromptsFromSummary(
  summary: string,
  timeline: string[] = [],
  options?: ImagePromptsFromSummaryOptions,
): Promise<string[]> {
  const timelineText =
    timeline.length > 0
      ? timeline.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "없음";
  const quote = options?.quote?.trim() || "";
  const date = options?.date?.trim() || "";
  const weather = options?.weather?.trim() || "";

  const lines: string[] = [
    "아래 일기 본문과 '오늘 있었던 일' 목록을 읽고, 이 내용과 직접 연관된 4컷 만화 장면을 구체적으로 만들어주세요.",
    "",
    "=== 일기 본문 ===",
    summary,
    "=== 일기 본문 끝 ===",
    "",
    "=== 오늘 있었던 일 (시간순 참고) ===",
    timelineText,
  ];

  if (quote) {
    lines.push("", "=== 오늘의 한 문장 ===", quote, "");
  }
  if (date || weather) {
    lines.push("", "=== 날짜·날씨 (복장 계절감 참고) ===");
    if (date) lines.push(`날짜: ${date}`);
    if (weather) lines.push(`날씨: ${weather}`);
    lines.push("");
  }

  lines.push(
    "요구사항:",
    "1. 일기 본문에 나온 사건·감정·대사를 그대로 반영하세요. (예: 늦잠 자서 엄마랑 부딪혔다면 '늦잠·등원 지각 직전·엄마가 속상해하시는 장면'처럼 구체적으로)",
    "2. 주사 맞는 장면이 있다면 '울지 않음', '뿌듯한 표정' 등 본문 표현을 반드시 넣으세요.",
    "3. 4개 장면은 시간순으로 배치하고, 각 장면은 '장면: [구체적인 장면 설명만]' 형식으로 작성하세요. 스타일·질감 문구는 넣지 마세요.",
    "4. 단순히 '아이가 등원하는 장면'처럼 요약하지 말고, '아이가 늦잠 자서 엄마가 속상해하시며 등원 준비하는 장면'처럼 본문 내용과 연관되게 디테일하게 쓰세요.",
    "5. 엄마가 늦잠·등원 재촉·속상해하는 장면을 쓸 때는 '엄마가 부드럽고 걱정하는 표정으로 아이를 깨우거나 재촉하는 장면'처럼, 경멸하거나 화난 느낌이 아닌 다정하고 조급한 듯한 표정으로 묘사하세요.",
    "6. 장면 설명에 말풍선·대사·따옴표 안의 문장을 넣지 마세요. (예: '~라고 말하는 장면' 금지) 행동과 표정만 묘사하고, 한글이나 외국어 대사 문장은 절대 포함하지 마세요.",
    "7. 매 장면마다 '그 장면에 누가 등장하는지'를 반드시 넣어 주세요. 예: '엄마와 아이가 침대 옆에서 ~', '엄마와 아이가 함께 현관에서 등원 준비를 ~', '아이가 병원에서 주사를 맞고, 옆에 엄마(또는 아빠)와 간호사가 ~', '엄마와 아이(와 아빠)가 식탁에서 저녁을 ~'. 일기 내용상 그 순간 등장하지 않는 인물은 그 컷에 넣지 말고, 등장하는 인물만 명시하세요.",
    "8. 전제: 한 가족(아빠 한 명, 엄마 한 명, 남자아이 한 명)만 있습니다. 아이는 4컷 모두 같은 한 명·절대 두 명이 나오지 않습니다. 인물이 섞이거나 다른 아이/다른 엄마가 나오지 않도록 장면 설명이 구체적이어야 합니다.",
    "9. 인물 일관용(같은 날 4컷 안에서만): 4개 장면이 같은 하루이므로, 아이(한 명)는 4컷 모두 같은 색 상의로 묘사하세요. 1·2·3·4컷 모두 같은 옷으로 통일. 엄마·아빠도 각각 4컷 같은 상의로 묘사. **복장은 반드시 날짜·날씨(계절)에 맞게** 묘사하세요: 겨울·추우면 긴팔, 코트·패딩·목도리·따뜻한 옷; 여름·더우면 반팔·민소매·얇은 옷; 봄·가을은 긴팔·가벼운 겉옷 등. 날씨가 주어졌으면 그에 맞는 복장을 장면 설명에 구체적으로 넣어 주세요.",
  );

  if (quote) {
    lines.push(
      "10. **오늘의 한 문장**에 나온 내용(예: '유치원에서 신나게 놀았다')이 4컷 중 **반드시 한 컷**에 들어가야 합니다. 그 한 문장이 말하는 장면(예: 유치원에서 놀거나 하원 후 그걸 떠올리는 장면)을 4개 중 하나로 구체적으로 묘사하세요.",
    );
  }

  lines.push(
    "",
    "JSON 형식:",
    "{",
    '  "imagePrompts": ["장면: ...", "장면: ...", "장면: ...", "장면: ..."]',
    "}",
  );

  const prompt = lines.join("\n");

  try {
    const text = await callGemini(prompt, {
      response_mime_type: "application/json",
      temperature: 0.2,
    });
    const json = safeJsonParse(text);
    if (!json || !Array.isArray(json.imagePrompts)) {
      return [
        "장면: 아침에 가족이 있는 장면",
        "장면: 낮에 있었던 일 장면",
        "장면: 오후 활동 장면",
        "장면: 저녁 또는 하루 마무리 장면",
      ];
    }
    return json.imagePrompts.slice(0, 4).map((p: string) =>
      typeof p === "string" && p.trim()
        ? p.trim().startsWith("장면:")
          ? p.trim()
          : `장면: ${p.trim()}`
        : "장면: 일상"
    );
  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message?.includes?.("429")) {
      try {
        const groqText = await callGroq(prompt);
        const json = safeJsonParse(groqText);
        if (json && Array.isArray(json.imagePrompts)) {
          return json.imagePrompts.slice(0, 4).map((p: string) =>
            typeof p === "string" && p.trim()
              ? p.trim().startsWith("장면:")
                ? p.trim()
                : `장면: ${p.trim()}`
              : "장면: 일상"
          );
        }
      } catch (groqError: any) {
        console.error("generateImagePromptsFromSummary Groq 폴백 실패:", groqError);
      }
    }
    console.error("generateImagePromptsFromSummary 오류:", error);
    return [
      "장면: 아침에 가족이 있는 장면",
      "장면: 낮에 있었던 일 장면",
      "장면: 오후 활동 장면",
      "장면: 저녁 또는 하루 마무리 장면",
    ];
  }
}

/** LLM 실패 시 반환하는 기본 4컷 프롬프트와 동일한지 판별. 기본값이면 기존 구체적 프롬프트를 덮어쓰지 말아야 함. */
export const GENERIC_IMAGE_PROMPTS_FALLBACK = [
  "장면: 아침에 가족이 있는 장면",
  "장면: 낮에 있었던 일 장면",
  "장면: 오후 활동 장면",
  "장면: 저녁 또는 하루 마무리 장면",
] as const;

export function isGenericImagePromptsFallback(prompts: string[]): boolean {
  if (!Array.isArray(prompts) || prompts.length !== 4) return false;
  return (
    (prompts[0] ?? "").includes("아침에 가족이 있는") &&
    (prompts[1] ?? "").includes("낮에 있었던 일") &&
    (prompts[2] ?? "").includes("오후 활동") &&
    (prompts[3] ?? "").includes("저녁 또는 하루 마무리")
  );
}

/** 흔한 한글 캡션 오기를 표준어로 치환 (이미지에 들어갈 캡션 품질 개선). API/재생성에서도 사용 가능하도록 export */
export function correctKoreanCaptionTypos(text: string): string {
  const fixes: [RegExp | string, string][] = [
    ["꽈베기", "꽈배기"],
    ["독조", "독서"],
    ["즉랄", "출발"],
    ["차품 타고", "차를 타고"],
    ["주솨", "주사"],
    ["맛기", "맞기"],
    ["식솨", "식사"],
    ["엄빠와", "엄마와 아빠와"],
    ["아파와", "아빠와"],
    ["맴마", "엄마"],
    ["등원 주께", "등원 준비"],
    ["돠란안", "단란한"],
    ["추웍", "추억"],
    ["게형", "경험"],
    ["리EGO", "레고"],
    ["파퓨", "파티"],
    ["잔잔", "시간"],
    ["둘견음", "돌봐줌"],
    ["정진", "진정"],
    ["선심", "마음"],
    ["소달크랴 할 아함", "초콜릿을 먹었어요"],
    ["쓱쓱하케모", "씩씩하게"],
    ["만족들론은", "만족스러운"],
    ["전력", "저녁"],
  ];
  let out = text;
  for (const [wrong, right] of fixes) {
    if (typeof wrong === "string") {
      out = out.split(wrong).join(right);
    } else {
      out = out.replace(wrong, right);
    }
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * LLM으로 4개 캡션의 맞춤법·띄어쓰기만 교정해 재발 오탈자를 줄입니다.
 * 실패 시 원본 배열을 그대로 반환합니다.
 */
async function correctCaptionsSpellingWithLLM(captions: string[]): Promise<string[]> {
  if (!Array.isArray(captions) || captions.length < 4) return captions;

  const prompt = [
    "아래 4개 문장은 만화 칸 자막입니다. 의미는 바꾸지 말고, 맞춤법과 띄어쓰기만 고쳐서 똑같이 4개만 JSON으로 돌려주세요.",
    "1: " + (captions[0] ?? ""),
    "2: " + (captions[1] ?? ""),
    "3: " + (captions[2] ?? ""),
    "4: " + (captions[3] ?? ""),
    "",
    '출력 형식만: { "captions": ["고친문장1", "고친문장2", "고친문장3", "고친문장4"] }',
  ].join("\n");

  try {
    const text = await callGemini(prompt, {
      response_mime_type: "application/json",
      temperature: 0,
    });
    const json = safeJsonParse(text);
    const arr = json?.captions;
    if (Array.isArray(arr) && arr.length >= 4) {
      return arr.slice(0, 4).map((c: unknown) => String(c).trim().replace(/\s+/g, " ").slice(0, 50));
    }
  } catch {
    // ignore
  }
  try {
    const groqText = await callGroq(prompt);
    const json = safeJsonParse(groqText);
    const arr = json?.captions;
    if (Array.isArray(arr) && arr.length >= 4) {
      return arr.slice(0, 4).map((c: unknown) => String(c).trim().replace(/\s+/g, " ").slice(0, 50));
    }
  } catch {
    // ignore
  }
  return captions;
}

/**
 * 4개 장면 설명을 바탕으로, 각 컷에 쓸 한글 자막(캡션) 4개를 생성합니다.
 * 맞춤법을 정확히 지키고, 짧고 명확한 문장만 출력합니다.
 * 생성 후 고정 오기 테이블 적용 → LLM 맞춤법 보정으로 재발을 막습니다.
 */
export async function generateImageCaptions(imagePrompts: string[]): Promise<string[]> {
  const scenes = imagePrompts.slice(0, 4).map((p) => {
    const t = p.replace(/^장면:\s*/i, "").trim();
    return t.length > 120 ? `${t.slice(0, 120)}...` : t;
  });
  while (scenes.length < 4) scenes.push("일상 장면");

  const prompt = [
    "아래 4개 장면 설명을 읽고, 6살 아이의 시각에서 각 장면을 한 컷만에 쓸 한글 자막(캡션) 하나씩 만들어주세요.",
    "요구사항:",
    "- 6살 아이의 순수하고 귀여운 시각에서 표현해주세요.",
    "- 아이가 실제로 말할 것 같은 자연스러운 말투를 사용하세요.",
    "- 맞춤법·띄어쓰기는 지키되, 아이의 순수한 감정이 담긴 표현을 사용하세요.",
    "- 각 자막은 5~20자 내외로 짧고 명확하게. 아이의 시각에서 간단하게 표현하세요.",
    "- 예시: '엄마랑 아침밥 먹었어요!', '아빠랑 놀았어요~', '병원 가서 주사 맞았어요 ㅠㅠ', '꽈배기 먹었어요 맛있어요!'",
    "- 말풍선이 아니라 패널 위에 쓰는 자막이므로, 장면을 요약하는 짧은 문장만. 느낌표·마침표 사용 가능.",
    "- 4개 자막만 출력하고, JSON 형식만 사용하세요.",
    "",
    "장면1:", scenes[0],
    "장면2:", scenes[1],
    "장면3:", scenes[2],
    "장면4:", scenes[3],
    "",
    'JSON 형식: { "captions": ["자막1", "자막2", "자막3", "자막4"] }',
  ].join("\n");

  const normalize = (raw: string[]) =>
    raw.slice(0, 4).map((c) => correctKoreanCaptionTypos(String(c).trim().replace(/\s+/g, " ").slice(0, 50)));

  let result: string[];

  try {
    const text = await callGemini(prompt, {
      response_mime_type: "application/json",
      temperature: 0.2,
    });
    const json = safeJsonParse(text);
    const arr = json?.captions;
    if (Array.isArray(arr) && arr.length >= 4) {
      result = normalize(arr);
      result = await correctCaptionsSpellingWithLLM(result);
      return result.map((c) => correctKoreanCaptionTypos(c));
    }
  } catch (e) {
    console.warn("generateImageCaptions Gemini 실패:", e);
  }
  try {
    const groqText = await callGroq(prompt);
    const json = safeJsonParse(groqText);
    const arr = json?.captions;
    if (Array.isArray(arr) && arr.length >= 4) {
      result = normalize(arr);
      result = await correctCaptionsSpellingWithLLM(result);
      return result.map((c) => correctKoreanCaptionTypos(c));
    }
  } catch (groqErr) {
    console.warn("generateImageCaptions Groq 실패:", groqErr);
  }
  result = normalize(["아침 장면", "낮에 있었던 일", "오후 활동", "저녁 식사"]);
  result = await correctCaptionsSpellingWithLLM(result);
  return result.map((c) => correctKoreanCaptionTypos(c));
}

function buildPrompt(transcript: string, meta: DiaryMeta, photoDescriptions?: string) {
  // 텍스트만 있는 경우 기존 방식 사용
  const members = meta.members.length ? meta.members.join(", ") : "가족";
  
  const basePrompt = [
    "너는 가족 일기 편집자야.",
    "",
    "⚠️ 절대 중요: 아래 'transcript' 섹션에 있는 녹음 내용만 사용하세요. 녹음에 나오지 않은 내용은 절대 만들지 마세요.",
    "",
    "=== 핵심 규칙 ===",
    "1. ⚠️ 녹음 내용(transcript)에 나온 일만 일기에 포함하세요.",
    "2. ⚠️ 녹음에 없는 장소, 활동, 사람, 사건은 절대 추가하지 마세요.",
    "3. ⚠️ 녹음 내용을 바탕으로 요약만 하세요. 창조하거나 추측하지 마세요.",
    "4. ⚠️ 녹음이 짧거나 불명확하면, 있는 내용만 사용하고 나머지는 만들지 마세요.",
    "",
    "요구사항:",
    "- 오늘 있었던 일을 요약하되, 반드시 녹음(transcript)에 나온 내용만 사용",
    "- 각 구성원이 말한 '좋았던 일 3가지'만 정리 (녹음에 없는 내용은 만들지 마)",
    "- 녹음에 없는 사실, 장소, 활동, 사람은 절대 추가하지 말 것",
    "- 감성적이지만 과장하지 않기",
    "- 모든 문장은 맞춤법·띄어쓰기·표준어를 정확히 지킨다. 흔한 오기 금지: '차를 타고'(O) '차품'(X), '꽈배기'(O) '꽈베기'(X). 조사 '-를/을', '-와/과' 반드시 정확히.",
    '- "summary"는 한국어로 150자 이상 300자 이하로 작성하고, 반드시 평서체로 써주세요. "~했다", "~였다", "안 울었다" 같은 표현을 쓰고 "~했어요" 해요체는 쓰지 마세요.',
    "- 아래 JSON 스키마를 엄격히 지켜",
    `- imagePrompts는 녹음 내용을 바탕으로 '장면: [설명만]' 형식으로 작성 (스타일 문구는 넣지 마세요, 녹음에 없는 장면은 만들지 마세요)`,
    "- keywords는 4~6개, 한국어, 짧은 명사 위주 (녹음에 나온 키워드만 사용)",
    "",
    "❌ 나쁜 예시 (녹음에 없는 내용 창조):",
    "녹음: '오늘 집에 있었어'",
    "잘못된 일기: '오늘 가족과 함께 공원에 가서 놀고, 맛있는 식사를 했다.' (공원, 식사는 녹음에 없음)",
    "",
    "✅ 좋은 예시 (녹음 내용만 사용):",
    "녹음: '오늘 집에 있었어'",
    "올바른 일기: '오늘은 집에서 시간을 보냈다.'",
    "",
    "- quote(오늘의 한 문장)는 반드시 10~15자 이내로만 쓰세요. 긴 문장 금지. 예: '유치원 가고 레고로 신나게 놀았어'(15자)",
    "",
    "JSON 스키마:",
    "{",
    '  "title": "string",',
    '  "summary": "string",',
    '  "timeline": ["string", "..."],',
    '  "goodThingsByMember": { "이름": ["좋았던 일1","좋았던 일2","좋았던 일3"] },',
    '  "quote": "string (10~15자 이내)",',
    '  "moodScore": 1,',
    '  "imagePrompts": ["string","string","string","string"],',
    '  "keywords": ["string","string","string","string"]',
    "}",
    "",
    "meta:",
    `- date: ${meta.date}`,
    `- location: ${meta.location}`,
    `- weather: ${meta.weather}`,
    `- members: ${members}`,
    "",
    "=== transcript (녹음 내용 - 이 내용만 사용하세요) ===",
    transcript || "(녹음 내용 없음)",
    "=== transcript 끝 ===",
    "",
    "⚠️ 다시 한 번 강조: 위 transcript에 나온 내용만 사용하고, 없는 내용은 절대 만들지 마세요.",
    "",
    "❌ 금지: '녹음 내용이 없어서', '정보를 제공하지 않았다', '일기를 작성할 수 없었다' 같은 설명문을 summary나 다른 필드에 넣지 마세요. 반드시 JSON 형식의 일기만 출력하세요. transcript가 짧거나 placeholder여도 summary는 '오늘은 녹음을 남기며 하루를 보냈다.'처럼 짧은 문장으로 작성하세요.",
  ];
  
  return basePrompt.join("\n");
}

function extractJsonFromText(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    return null;
  }
  return text.slice(first, last + 1);
}

function safeJsonParse(text: string) {
  const trimmed = text.trim();
  const candidates = [trimmed, extractJsonFromText(trimmed)].filter(
    Boolean,
  ) as string[];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  return null;
}

function cleanList(value: unknown, limit = 3) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildKeywords(summary: string, limit = 4) {
  const cleaned = summary.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  const unique = Array.from(new Set(tokens));
  const list = unique.slice(0, limit);
  if (list.length < limit) {
    const fallback = ["가족", "일상", "기록", "하루"];
    for (const item of fallback) {
      if (list.length >= limit) break;
      if (!list.includes(item)) list.push(item);
    }
  }
  return list.slice(0, limit);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

/** 오늘의 한 문장이 초기 생성 시 너무 길어지는 것 방지 — 최대 18자(공백 포함) 근처에서 단어 경계로 자름 */
function trimQuoteToMaxChars(quote: string, maxLen = 18): string {
  const t = quote.trim();
  if (!t || t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen + 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 8) return cut.slice(0, lastSpace).trim();
  return cut.slice(0, maxLen).trim();
}

function filterItemsByTranscript(items: string[], transcript: string) {
  if (!transcript.trim()) return [];
  const normalizedTranscript = normalizeText(transcript);
  return items.filter((item) =>
    normalizedTranscript.includes(normalizeText(item)),
  );
}

function normalizeDiary(
  result: DiaryResult,
  members: string[],
  transcript: string,
) {
  const goodThingsRaw =
    result?.goodThingsByMember &&
    typeof result.goodThingsByMember === "object"
      ? result.goodThingsByMember
      : {};

  const goodThingsByMember: Record<string, string[]> = {};
  if (members.length) {
    for (const member of members) {
      const items = cleanList(
        (goodThingsRaw as Record<string, unknown>)[member],
      );
      // transcript 기반 필터링 제거 (과도한 필터링으로 인한 데이터 손실 방지)
      goodThingsByMember[member] = items;
    }
  } else {
    for (const [name, value] of Object.entries(goodThingsRaw)) {
      const items = cleanList(value);
      goodThingsByMember[name] = items;
    }
  }

  const rawQuote = result?.quote ? String(result.quote) : "";
  return {
    ...result,
    title: result?.title ? String(result.title) : "우리 가족 일기",
    summary: result?.summary ? String(result.summary) : "",
    quote: trimQuoteToMaxChars(rawQuote),
    timeline: cleanList(result?.timeline ?? [], 10),
    moodScore: Number.isFinite(result?.moodScore)
      ? Number(result.moodScore)
      : 3,
    imagePrompts: cleanList(result?.imagePrompts ?? [], 4),
    keywords: cleanList(result?.keywords ?? [], 6).length
      ? cleanList(result?.keywords ?? [], 6)
      : buildKeywords(
          result?.summary ? String(result.summary) : "",
          4,
        ),
    goodThingsByMember,
  };
}

async function callGemini(prompt: string, options?: { response_mime_type?: string; temperature?: number }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY env is missing");
  }

  const generationConfig: any = {
    temperature: options?.temperature ?? 0.1,
  };
  if (options?.response_mime_type) {
    generationConfig.response_mime_type = options.response_mime_type;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  console.log("Gemini API 호출:", { model: GEMINI_MODEL, url: url.replace(apiKey, "***") });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API 오류:", response.status, errorText);
    // 429 (한도 초과) 또는 503 (서비스 불가) 시 Groq로 폴백하도록 특별한 에러 던지기
    if (response.status === 429 || response.status === 503) {
      console.log(`[LLM] Gemini 한도 초과 (${response.status}), Groq로 폴백 시도`);
      throw new Error("GEMINI_QUOTA_EXCEEDED");
    }
    throw new Error(`Gemini error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

async function callGroq(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY env is missing");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "너는 JSON만 출력하는 도우미야. 설명이나 마크다운을 쓰지 마.",
          },
          { role: "user", content: prompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq error: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function generateDiary(
  transcript: string,
  meta: DiaryMeta,
  photoDataJson?: string,
): Promise<DiaryResult> {
  // 사진 데이터가 있으면 3단계 프로세스 사용
  if (photoDataJson) {
    try {
      // 1단계: 사진 데이터 기반으로 일기 본문 생성 (150~300자, 어린이 말투)
      let story = await generateDiaryStory(photoDataJson, transcript, meta);
      
      console.log(`[LLM] 생성된 일기 본문 길이: ${story.length}자`);
      
      // 너무 짧으면 재시도 (최대 2번). 150~300자 목표이므로 120자 미만이면 재시도
      let retryCount = 0;
      while (story.length < 120 && retryCount < 2) {
        console.log(`[LLM] 일기 본문이 너무 짧아 재시도 (${retryCount + 1}/2): ${story.length}자`);
        story = await generateDiaryStory(photoDataJson, transcript, meta);
        console.log(`[LLM] 재시도 후 본문 길이: ${story.length}자`);
        retryCount++;
      }
      
      if (story.length < 100) {
        console.error(`[LLM] 일기 본문이 여전히 너무 짧음: ${story.length}자`);
        throw new Error(`생성된 일기 본문이 너무 짧습니다 (${story.length}자). 최소 100자 이상 필요합니다.`);
      }
      
      // 300자 넘으면 300자 내외로 자르기
      if (story.length > 320) {
        story = story.slice(0, 300).trim();
        const lastPeriod = story.lastIndexOf(".");
        if (lastPeriod > 200) story = story.slice(0, lastPeriod + 1);
        console.log(`[LLM] 일기 본문 150~300자로 조정: ${story.length}자`);
      } else {
        console.log(`[LLM] 일기 본문 생성 완료: ${story.length}자 (150~300자, 어린이 말투)`);
      }

      // 2단계: 1단계 결과를 기반으로 요약/태그/타임라인 생성
      const summary = await generateDiarySummary(story, meta);

      // 3단계: 1단계 결과를 기반으로 4컷 프롬프트 생성 (앱에 저장된 날짜·날씨로 복장 계절감 반영)
      const { imagePrompts: prompts, imageCaptions: captions } = await generateImagePrompts(story, photoDataJson, meta.members, {
        date: meta.date,
        weather: meta.weather,
      });

      // 최종 결과 조합
      return {
        title: summary.keywords.length > 0 
          ? `${summary.keywords[0]}과 함께한 하루`
          : "우리 가족 일기",
        summary: story, // 1단계에서 생성한 긴 이야기
        timeline: summary.timeline,
        goodThingsByMember: {}, // 나중에 추가 가능
        quote: summary.quote,
        moodScore: 4, // 기본값
        imagePrompts: prompts,
        imageCaptions: captions,
        keywords: summary.keywords,
      };
    } catch (error: any) {
      console.error("3단계 일기 생성 오류:", error);
      // 에러 메시지에 "API 한도가 초과되었습니다"가 포함되어 있으면 더 명확한 메시지로 변경
      if (error.message && error.message.includes("API 한도가 초과")) {
        throw new Error("일기 생성에 실패했습니다. Gemini와 Groq API 모두 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.");
      }
      throw error;
    }
  }

  // 텍스트만 있는 경우 기존 방식 사용
  const prompt = buildPrompt(transcript, meta, undefined);
  if (!prompt) {
    throw new Error("프롬프트 생성 실패");
  }

  try {
    const geminiText = await callGemini(prompt);
    const geminiJson = safeJsonParse(geminiText);
    if (geminiJson) {
      return normalizeDiary(
        geminiJson as DiaryResult,
        meta.members,
        transcript,
      );
    }
  } catch (error: any) {
    // Gemini 429 에러 시 Groq로 폴백
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message.includes("429")) {
      console.log("[LLM] generateDiary (텍스트): Gemini 한도 초과, Groq로 폴백");
    } else {
      console.error("Gemini API 오류:", error);
    }
  }

  // Gemini 실패 시 Groq로 폴백
  const groqText = await callGroq(prompt).catch((error) => {
    console.error("Groq API 오류:", error);
    throw new Error(`일기 생성에 실패했습니다. API 한도가 초과되었습니다.`);
  });
  
  const groqJson = safeJsonParse(groqText);
  if (!groqJson) {
    console.error("Groq JSON 파싱 실패. 원본 텍스트:", groqText.substring(0, 500));
    throw new Error("LLM output was not valid JSON");
  }

  return normalizeDiary(
    groqJson as DiaryResult,
    meta.members,
    transcript,
  );
}

/**
 * 월별/연도별 리포트용 요약 문단 생성 (프롬프트 → 순수 텍스트).
 * Gemini 사용, 429 시 Groq 폴백.
 */
export async function generateReportSummary(prompt: string): Promise<string> {
  try {
    const text = await callGemini(prompt, { temperature: 0.3 });
    return text.trim();
  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message?.includes?.("429")) {
      console.log("[LLM] generateReportSummary: Gemini 한도 초과, Groq로 폴백");
      try {
        const groqText = await callGroqForText(prompt);
        return groqText.trim();
      } catch (groqError) {
        console.error("generateReportSummary Groq 폴백 실패:", groqError);
        throw groqError;
      }
    }
    throw error;
  }
}

/** Groq 호출 (순수 텍스트 응답, JSON 아님) */
async function callGroqForText(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY env is missing");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "한국어로 요청된 내용만 간결하고 따뜻한 어조로 서술하세요. 설명이나 접두어 없이 본문만 출력하세요.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq error: ${response.status} ${body}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * transcript와 summary를 분석해서 화자별 좋았던 일을 추출
 * LLM이 문맥/내용으로 화자를 구분 (완벽하지 않지만 실용적)
 */
export async function extractGoodThingsFromTranscript(
  transcript: string,
  summary: string,
  members: string[] = ["엄마", "아빠", "아이"],
): Promise<Record<string, string[]>> {
  if (!transcript?.trim() && !summary?.trim()) {
    return {};
  }

  const prompt = [
    "아래는 가족 일기의 녹음 내용(transcript)과 일기 본문(summary)이에요.",
    "이 내용을 분석해서 각 가족 구성원별로 '좋았던 일'을 추출해주세요.",
    "",
    "=== 녹음 내용 (transcript) ===",
    transcript,
    "=== 녹음 내용 끝 ===",
    "",
    "=== 일기 본문 (summary) ===",
    summary,
    "=== 일기 본문 끝 ===",
    "",
    "요구사항:",
    "1. 녹음 내용과 일기 본문을 종합해서 각 구성원이 언급한 '좋았던 일'을 찾아주세요.",
    "2. 화자 구분: 문맥, 말투, 내용(예: '엄마는...', '아빠가...', '시온이가...', '아이가...')으로 누가 말한 것인지 추론해주세요.",
    `3. 구성원: ${members.join(", ")}`,
    "4. 각 구성원당 1~3개 정도의 좋았던 일을 추출해주세요.",
    "5. 녹음 내용이나 일기 본문에 명시적으로 나온 내용만 사용하고, 없는 내용은 만들지 마세요.",
    "6. 예시:",
    "   - '엄마는 한국에서 친구들과 만나서 좋았다' → 엄마: ['한국에서 친구들과 만남']",
    "   - '시온이가 레고 조립해서 좋아했다' → 아이: ['아이언맨 레고 조립']",
    "   - '아빠는 도서관에서 작업해서 좋았다' → 아빠: ['도서관에서 컴퓨터 작업']",
    "",
    "JSON 형식:",
    "{",
    '  "엄마": ["좋았던 일1", "좋았던 일2"],',
    '  "아빠": ["좋았던 일1"],',
    '  "아이": ["좋았던 일1", "좋았던 일2", "좋았던 일3"]',
    "}",
    "",
    "⚠️ 중요: 녹음 내용이나 일기 본문에 명시적으로 나온 내용만 사용하세요. 없는 내용은 절대 만들지 마세요.",
  ].join("\n");

  try {
    const text = await callGemini(prompt, {
      response_mime_type: "application/json",
      temperature: 0.2,
    });
    const json = safeJsonParse(text);
    
    if (!json || typeof json !== "object") {
      return {};
    }

    const result: Record<string, string[]> = {};
    for (const member of members) {
      const items = json[member];
      if (Array.isArray(items) && items.length > 0) {
        result[member] = items
          .filter((item) => typeof item === "string" && item.trim())
          .map((item) => String(item).trim())
          .slice(0, 5); // 최대 5개
      }
    }

    return result;
  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message?.includes?.("429")) {
      try {
        const groqText = await callGroq(prompt);
        const json = safeJsonParse(groqText);
        if (json && typeof json === "object") {
          const result: Record<string, string[]> = {};
          for (const member of members) {
            const items = json[member];
            if (Array.isArray(items) && items.length > 0) {
              result[member] = items
                .filter((item) => typeof item === "string" && item.trim())
                .map((item) => String(item).trim())
                .slice(0, 5);
            }
          }
          return result;
        }
      } catch (groqError) {
        console.error("extractGoodThingsFromTranscript Groq 폴백 실패:", groqError);
      }
    }
    console.error("extractGoodThingsFromTranscript 오류:", error);
    return {};
  }
}

/**
 * summary를 기반으로 quote와 timeline을 재생성 (연결성 개선)
 */
export async function regenerateQuoteAndTimelineFromSummary(
  summary: string,
  existingQuote?: string,
): Promise<{ quote: string; timeline: string[] }> {
  const prompt = [
    "아래 일기 본문을 읽고 다음을 생성해주세요:",
    "",
    "=== 일기 본문 ===",
    summary,
    "=== 일기 본문 끝 ===",
    existingQuote ? `=== 기존 '오늘의 한 문장' (참고용, 이와 비슷한 톤으로) ===\n${existingQuote}\n=== 끝 ===` : "",
    "",
    "요구사항:",
    "1. '오늘의 한 문장': 아이(시온이)의 시각과 생각으로, 행동과 감정을 한 문장에 담아주세요. (20자 내외)",
    "   - 주어('시온이는', '나는')는 생략하고 내용만 서술하세요.",
    "   - 형식: '[행동]해서 [감정]한 하루' 또는 '[행동]하고 [감정]했다'",
    "   - 예: '물놀이를 실컷 해서 정말 신나는 하루', '엄마랑 요리해서 뿌듯하고 행복했다', '친구랑 싸워서 조금 속상했다'",
    "   - 절대 금지: 이름('시온이') 언급 금지, '시온이브' 같은 오타 금지, 문맥 없는 명사 나열 금지.",
    "   - 어조: 7살 아이가 일기장에 쓰는 듯한 솔직하고 귀여운 말투.",
    "2. '오늘 있었던 일': 일기 본문에 나온 주요 활동을 시간순으로 나열 (5-8개).",
    "   - 반드시 맞춤법·표준어·띄어쓰기를 지킨다.",
    "   - 흔한 오기 금지: '차를 타고'(O) '차품 타고'(X), '꽈배기'(O) '꽈베기'(X).",
    "   - 조사 '-를/을', '-와/과' 정확히.",
    "",
    "JSON 형식:",
    "{",
    '  "quote": "오늘의 한 문장 (10자 내외, 본문 요약)",',
    '  "timeline": ["활동1", "활동2", ...]',
    "}",
  ].filter(Boolean).join("\n");

  try {
    const text = await callGemini(prompt, {
      response_mime_type: "application/json",
      temperature: 0.2,
    });
    const json = safeJsonParse(text);
    
    if (!json) {
      throw new Error("재생성 실패: JSON 파싱 오류");
    }

    const quote = trimQuoteToMaxChars(json.quote || existingQuote || "오늘도 좋은 하루였습니다");
    return {
      quote,
      timeline: Array.isArray(json.timeline) ? json.timeline.slice(0, 10) : [],
    };
  } catch (error: any) {
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message?.includes?.("429")) {
      try {
        const groqText = await callGroq(prompt);
        const json = safeJsonParse(groqText);
        if (json) {
          const quote = trimQuoteToMaxChars(json.quote || existingQuote || "오늘도 좋은 하루였습니다");
          return {
            quote,
            timeline: Array.isArray(json.timeline) ? json.timeline.slice(0, 10) : [],
          };
        }
      } catch (groqError) {
        console.error("regenerateQuoteAndTimelineFromSummary Groq 폴백 실패:", groqError);
      }
    }
    console.error("regenerateQuoteAndTimelineFromSummary 오류:", error);
    throw error;
  }
}
