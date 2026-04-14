import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const doc = await adminDb.collection("diaries").doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const diary = { id: doc.id, ...doc.data() } as any;

  // 책형 디자인: 상단에 자동 생성 4컷 우선, 없으면 첫 사진
  const mainImageUrl =
    diary.combinedImageUrl ||
    (Array.isArray(diary.photoUrls) && diary.photoUrls[0]) ||
    "";

  // 날짜 형식: 26.01.25.(일)
  const rawDate = diary.date;
  let dateHeader = "";
  if (rawDate) {
    const m = String(rawDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const yy = m[1].slice(-2);
      const mm = m[2];
      const dd = m[3];
      const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
      const dayOfWeek = weekdays[new Date(rawDate + "T12:00:00").getDay()] ?? "";
      dateHeader = `${yy}.${mm}.${dd}.(${dayOfWeek})`;
    } else {
      dateHeader = String(rawDate);
    }
  }

  const locationStr = diary.location ? String(diary.location).trim() : "";
  const weatherStr = diary.weather ? String(diary.weather).trim() : "";
  // 날씨 문구 → 이모지 매핑 (예: ☀️ 맑음)
  const weatherEmojiMap: [RegExp, string][] = [
    [/맑음|晴|clear|맑/i, "☀️"],
    [/흐림|흐리고|구름|cloud/i, "☁️"],
    [/비|소나기|rain|drizzle/i, "🌧️"],
    [/눈|snow/i, "❄️"],
    [/바람|wind/i, "💨"],
    [/안개|fog|mist/i, "🌫️"],
    [/쾌청|청명/i, "🌤️"],
  ];
  let weatherDisplay = weatherStr;
  for (const [pattern, emoji] of weatherEmojiMap) {
    if (pattern.test(weatherStr)) {
      weatherDisplay = `${emoji} ${weatherStr}`;
      break;
    }
  }
  if (weatherStr && !weatherDisplay.startsWith("☀") && !weatherDisplay.startsWith("☁") && !weatherDisplay.startsWith("🌧") && !weatherDisplay.startsWith("❄") && !weatherDisplay.startsWith("💨") && !weatherDisplay.startsWith("🌫") && !weatherDisplay.startsWith("🌤")) {
    weatherDisplay = `🌡️ ${weatherStr}`;
  }
  const metaRightRaw = [locationStr ? `📍 ${locationStr}` : "", weatherDisplay].filter(Boolean).join(" · ");
  const metaRight = metaRightRaw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const quoteRaw = diary.quote ? String(diary.quote).trim() : "";
  const keywords: string[] = Array.isArray(diary.keywords) ? diary.keywords : [];
  const hashtagsLine = keywords.length > 0 ? keywords.map((k: string) => `#${k}`).join(" ") : "";

  const timeline: string[] = Array.isArray(diary.timeline) ? diary.timeline : [];
  const quoteEscaped = quoteRaw.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 글귀 분석 기반 이모지: 항목/문장별로 내용에 맞는 이모지 하나 선택 (우선순위 순)
  const keywordToEmoji: [RegExp, string][] = [
    [/주사|예방접종|접종|맞으러/g, "💉"],
    [/지각|늦잠|늦어|등원.*늦|학교.*늦/g, "🕐"],
    [/저녁|식사|밥|먹었|맛있는/g, "🍽️"],
    [/레고/g, "🧱"],
    [/인형/g, "🧸"],
    [/사진|찍었/g, "📷"],
    [/정리|청소/g, "🧹"],
    [/잠|자다|잤|잠들/g, "😴"],
    [/열|체온|해열/g, "🤒"],
    [/산책/g, "🚶"],
    [/여행|해외/g, "✈️"],
    [/행복|좋았|기쁘|기뻤|뿌듯|대견/g, "😊"],
    [/신나|즐거웠|즐겁게|재미있었/g, "🎉"],
    [/만족|만족감/g, "💯"],
    [/감사|고마웠/g, "🙏"],
    [/사랑/g, "❤️"],
    [/건강|회복|되찾/g, "💪"],
    [/희망|기대/g, "🌟"],
    [/추억/g, "📔"],
    [/선물|받았/g, "🎁"],
    [/포켓몬/g, "⚔️"],
    [/독감|바이러스/g, "🦠"],
    [/안도|안심/g, "😌"],
    [/초콜릿|초코/g, "🍫"],
    [/놀다|놀았음|놀고|노는/g, "🎮"],
    [/만들었|만들어|만들/g, "✨"],
    [/도너츠|도넛|케이크|과자|간식/g, "🍪"],
  ];
  /** 문장/항목 하나에 대해 내용 분석으로 이모지 하나 반환 */
  const emojiForText = (text: string): string => {
    const t = text.trim();
    for (const [pattern, emoji] of keywordToEmoji) {
      const re = new RegExp(pattern.source, "i");
      if (re.test(t)) return emoji;
    }
    return "•";
  };
  const extractEmojis = (text: string, limit = 6): string => {
    const order: string[] = [];
    const seen = new Set<string>();
    keywordToEmoji.forEach(([pattern, emoji]) => {
      const re = new RegExp(pattern.source, pattern.flags.replace("g", ""));
      if (re.test(text) && !seen.has(emoji)) {
        seen.add(emoji);
        order.push(emoji);
      }
    });
    return order.slice(0, limit).join(" ");
  };

  // 오늘 있었던 일: 시간순으로 표시 (저장이 역순이면 reverse 후 상위 3개)
  const chronologicalTimeline = [...timeline].reverse();
  const top3Timeline = chronologicalTimeline.slice(0, 3);

  const timelineLinesHtml = top3Timeline
    .map((item: string) => {
      const safe = String(item).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const emoji = emojiForText(item);
      return `${emoji} ${safe}`;
    })
    .join("\n");
  const timelineCompactHtml =
    timelineLinesHtml.length > 0
      ? `<div class="timeline-compact">${timelineLinesHtml.replace(/\n/g, "<br />")}</div>`
      : "";

  const summaryRaw = String(diary.summary || "");
  const summaryPlain = summaryRaw.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");

  const timelineEmojis = extractEmojis(top3Timeline.join(" "), 6);
  const summaryEmojis = extractEmojis(summaryRaw, 6);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="description" content="출판용 신A5 (152×224mm)">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap" rel="stylesheet">
  <style>
    /* 신 A5 152×224mm, 폰트 크기 확대 */
    * { box-sizing: border-box; }
    @page { size: 152mm 224mm; margin: 10mm; }
    body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #1c1917; margin: 0; padding: 0; font-size: 12px; background: #fefdfb; overflow-wrap: break-word; }
    .wrap { padding: 0; max-height: 204mm; }

    .title-block { margin-bottom: 8px; padding: 0 1px; }
    .title-line1 { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; font-size: 20px; font-weight: 700; color: #1c1917; line-height: 1.35; letter-spacing: -0.02em; margin-bottom: 4px; }
    .title-line1 .title-left { flex: 1; min-width: 0; }
    .title-line1 .font-handwriting { font-family: 'Gaegu', cursive; font-weight: 700; font-size: 1.15em; }
    .title-line2-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11px; color: #78716c; letter-spacing: 0.02em; margin-bottom: 5px; }
    .title-line2-row .hashtags { flex: 1; min-width: 0; }
    .title-line2-row .meta-right { flex-shrink: 0; font-size: 11px; font-weight: 400; color: #78716c; }

    .illustration { width: 100%; max-height: 84mm; object-fit: contain; border-radius: 8px; margin: 6px 0; display: block; background: #fefce8; border: 1px solid #fde68a; box-sizing: border-box; }

    .section { margin-bottom: 10px; padding: 10px 12px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a; }
    .section:last-of-type { margin-bottom: 8px; }
    .section-title { font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
    .section-title .icon { font-size: 14px; }
    .section-title .title-emojis { font-weight: 400; letter-spacing: 0.05em; }
    .timeline-compact { font-size: 14px; line-height: 1.75; color: #292524; margin: 0; padding: 0; }
    .summary { font-size: 14px; line-height: 1.75; color: #292524; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="title-block">
      <div class="title-line1">
        <span class="title-left">${dateHeader} <span class="font-handwriting">${quoteRaw ? quoteEscaped : "오늘의 한 문장"}</span></span>
      </div>
      <div class="title-line2-row">
        <span class="hashtags">${hashtagsLine || "\u00A0"}</span>
        ${metaRight ? `<span class="meta-right">${metaRight}</span>` : ""}
      </div>
    </div>

    ${mainImageUrl ? `<img src="${mainImageUrl}" alt="일기 그림" class="illustration" />` : ""}

    ${timelineCompactHtml ? `
    <div class="section">
      <div class="section-title"><span class="icon">📝</span> 오늘 있었던 일${timelineEmojis ? ` <span class="title-emojis">${timelineEmojis}</span>` : ""}</div>
      ${timelineCompactHtml}
    </div>
    ` : ""}

    <div class="section">
      <div class="section-title"><span class="icon">📖</span> 일기 내용${summaryEmojis ? ` <span class="title-emojis">${summaryEmojis}</span>` : ""}</div>
      <div class="summary">${summaryPlain}</div>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
