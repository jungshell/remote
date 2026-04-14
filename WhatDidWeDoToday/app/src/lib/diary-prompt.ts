/**
 * 4컷 이미지용 고정 캐릭터 묘사. 같은 날 4컷 전부에서 같은 인물=같은 옷(색·디자인 동일).
 */
export const FIXED_CHARACTER_DESCRIPTIONS =
  "옷만 다를 뿐, 4컷 모두·다른 날짜에서도 동일한 캐릭터로 그린다. 가족은 아빠 한 명, 엄마 한 명, 남자아이 한 명뿐. 아빠: 40대, 검은 짧은 머리, 반드시 수염 있음, 각진 얼굴, 중간 체형, 안경 절대 금지. 엄마: 40대, 검은 단발 머리, 부드러운 둥근 얼굴, 안경 절대 금지. 아이(한 명): 8세 남자아이(한국 나이 8살, 초등학생), 진한 갈색 머리, 앞머리, 둥근 얼굴, 통통한 볼, 어린이 체형, 안경 절대 금지. 4컷 모두 동일한 아이(같은 얼굴·머리). 화면에 아이는 무조건 한 명만 그린다. 쌍둥이나 형제/친구 절대 그리지 마라(Only one child character in the whole scene). 가족 외 등장인물은 안경 써도 됨. 가족만 등장 시 인물 수는 정확히 3명(엄마1·아빠1·아이1), 동일 성인 복수 금지, 외부인 없으면 가족 외 인물 등장 금지. Avoid multiple fathers, multiple mothers, multiple children, twins, clones, split screens inside panels. Each panel contains at most ONE instance of each family member. Count people carefully: 1 Mom, 1 Dad, 1 Child. No more.";

/**
 * 굵고 울퉁불퉁한 손그림 선과 크레파스 질감이 잘 보이는 어린이 크레파스 그림 스타일.
 */
export const FALLBACK_IMAGE_STYLE =
  "굵고 울퉁불퉁한 손그림 선과 크레파스 질감이 잘 보이는 어린이 크레파스 그림 스타일. 빨강, 파랑, 노랑, 초록 같은 선명한 원색 사용. 색칠이 선 밖으로 넘치고 자유롭고 귀여운 낙서 느낌. 배경은 흰색이며, 전체적으로 순수하고 즐거운 분위기. 어린이 손그림, 유치한 크레파스 그림, 종이 질감, 단순한 형태, 어설픈 비율, 삐뚤빼뚤한 선, 5~7살 남자 아이가 그린 느낌. 더욱 단순하고 유치하게. 5살 아이가 그린 것처럼 삐뚤빼뚤하게. 정돈된 윤곽·프로 일러스트 금지. child crayon drawing, wobbly lines, colors bleeding, naive, messy coloring, simple shapes.";

/**
 * 날짜와 날씨 정보를 기반으로 계절에 맞는 옷차림 설명을 반환합니다.
 */
export function getSeasonalClothingDescription(dateStr?: string, weather?: string): string {
  // 1순위: 날씨 정보(기온)가 있으면 기온 기반으로 옷차림 결정
  if (weather) {
    // "맑음 22 ~ 29°C" 또는 "25°C" 형태에서 숫자 추출
    const temps = weather.match(/-?\d+(\.\d+)?/g)?.map(Number);
    
    if (temps && temps.length > 0) {
      // 평균 기온 계산 (최저/최고가 있으면 평균, 하나만 있으면 그 값)
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      
      console.log(`[Clothing] 날씨 기반 옷차림 결정: ${weather} -> 평균 ${avgTemp.toFixed(1)}°C`);

      if (avgTemp >= 23) {
        return "모든 가족 구성원 반팔 티셔츠, 반바지, 샌들. 시원한 여름 옷차림. Summer fashion, short sleeves, shorts, sandals, cool clothing.";
      } else if (avgTemp >= 17) {
        return "모든 가족 구성원 가벼운 긴팔 티셔츠, 얇은 자켓, 가디건. 화사한 봄/가을 색상 옷. Light long sleeves, thin jackets, cardigans.";
      } else if (avgTemp >= 10) {
        return "모든 가족 구성원 긴팔 셔츠, 니트, 자켓, 트렌치 코트. 차분한 가을/봄 색상. Long sleeves, knits, jackets, trench coats.";
      } else {
        return "모든 가족 구성원 두꺼운 겨울 패딩, 코트, 스웨터, 목도리, 장갑 착용. 따뜻해 보이는 겨울 옷차림. Winter fashion, thick padded jackets, coats, sweaters, scarves, gloves, warm clothing.";
      }
    }
  }

  // 2순위: 날씨 정보가 없거나 기온 파싱 실패 시 날짜(월) 기반 fallback
  if (!dateStr) return "모든 가족 구성원 계절에 맞는 적절한 옷차림.";

  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // 1-12

  console.log(`[Clothing] 날짜 기반 옷차림 결정 (날씨정보 없음): ${month}월`);

  if (month >= 3 && month <= 5) {
    return "모든 가족 구성원 가벼운 긴팔 티셔츠, 얇은 자켓, 가디건. 화사한 봄 색상 옷. Spring fashion, light long sleeves, thin jackets, cardigans, bright pastel colors.";
  } else if (month >= 6 && month <= 9) { // 9월까지 여름 옷차림으로 확장 (fallback)
    return "모든 가족 구성원 반팔 티셔츠, 반바지, 샌들. 시원한 여름 옷차림. Summer fashion, short sleeves, shorts, sandals, cool clothing.";
  } else if (month >= 10 && month <= 11) {
    return "모든 가족 구성원 긴팔 셔츠, 니트, 자켓, 트렌치 코트. 차분한 가을 색상(갈색, 베이지, 와인). Autumn fashion, long sleeves, knits, jackets, trench coats, autumn colors.";
  } else {
    // 12, 1, 2 (겨울)
    return "모든 가족 구성원 두꺼운 겨울 패딩, 코트, 스웨터, 목도리, 장갑 착용. 따뜻해 보이는 겨울 옷차림. Winter fashion, thick padded jackets, coats, sweaters, scarves, gloves, warm clothing.";
  }
}

/**
 * 장면 문장에서 대사(따옴표 안 문자열) 제거 — 이미지에 한글 문자가 나오지 않도록
 */
export function stripDialogueFromScene(text: string): string {
  return text
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/[「『][^』」]*[』」]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 4컷 만화 생성용 최종 프롬프트를 조립합니다.
 */
export function buildCombinedPrompt(
  imagePrompts: string[],
  members: string[] = [],
  imageCaptions?: string[],
  date?: string,
  weather?: string,
) {
  const sceneText = imagePrompts
    .map((prompt, index) => {
      let sceneOnly = prompt.replace(FALLBACK_IMAGE_STYLE, "").trim().replace(/^장면:\s*/i, "").trim();
      sceneOnly = stripDialogueFromScene(sceneOnly);
      if (!sceneOnly) sceneOnly = `장면 ${index + 1}`;
      
      // 가족만 등장하는 경우 인원수 강제
      let suffix = "";
      // 멤버가 없거나 가족 멤버(엄마,아빠,아이)가 포함된 경우
      if (members.length === 0 || members.some(m => ["엄마", "아빠", "아이", "가족"].includes(m))) {
        suffix = " (Count: 1 Mom, 1 Dad, 1 Child. Total 3 people. No other people).";
      }
      
      return `${index + 1}컷: ${sceneOnly}${suffix}`;
    })
    .join(" | ");

  const seasonalClothing = getSeasonalClothingDescription(date, weather);

  const promptParts = [
    // 1. 스타일을 맨 앞으로 이동 (나노바나나/SD 모델은 앞부분 가중치가 높음)
    // Negative Prompt는 완전히 제거 (사용자가 복사해서 쓸 때 혼란 방지)
    "Style: Child crayon drawing, wobbly lines, colors bleeding, naive, messy coloring, simple shapes. 2x2 grid 4-panel comic strip.",
    "No text, no captions, no letters inside the image. 한글 자막은 앱에서 정확하게 오버레이한다. 패널 안에 글자 대신 자막이 들어갈 빈 공간만 남겨둔다.",
    "전체 캔버스 비율은 16:10(가로가 더 긴 직사각형). Aspect Ratio 16:10. 출력 해상도 예시: 1600x1000 또는 1920x1200.",
    "말풍선 없음. 가족은 아빠(수염 있음) 1명, 엄마 1명, 남자아이 1명. 4컷 전부 같은 사람 같은 얼굴 같은 머리.",
    "가족만 등장하는 장면에서는 인물 수를 정확히 3명으로 제한: 엄마 1명, 아빠 1명, 아이 1명. 동일 성인(엄마 또는 아빠)을 두 명 이상 그리지 말 것. 외부인(의사·간호사 등)이 없다면 가족 외 인물은 절대 등장시키지 말 것.",
    "장면:",
    sceneText,
    "옷: 아빠 엄마 아이 각각 1~4컷 같은 색 상의. 아이 4컷 모두 같은 색(예 노란 티셔츠).",
    "실내 장면에서는 외투·목도리·장갑을 그리지 않는다. 실외 장면에서는 날씨와 기온에 맞게 외투·목도리를 선택한다. Indoor: light clothes, no coat/scarf. Outdoor: depends on weather.",
    "캐릭터(옷 제외 동일 인물 유지):",
    FIXED_CHARACTER_DESCRIPTIONS,
    seasonalClothing,
    "매 컷 동일한 캐릭터 디자인(얼굴·헤어·체형 통일). 자막은 칸 안에. 안경·말풍선 금지.",
  ];

  return promptParts.join(" ");
}
