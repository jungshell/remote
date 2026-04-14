import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { generateDiary } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const member = url.searchParams.get("member");
  const period = url.searchParams.get("period") || "month";

  if (!member) {
    return NextResponse.json(
      { error: "member is required" },
      { status: 400 },
    );
  }

  const now = new Date();
  const startDate = new Date();
  
  if (period === "month") {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === "quarter") {
    startDate.setMonth(now.getMonth() - 3);
  } else {
    startDate.setFullYear(now.getFullYear() - 1);
  }

  const snapshot = await adminDb
    .collection("diaries")
    .where("createdAt", ">=", startDate.toISOString())
    .orderBy("createdAt", "desc")
    .get();

  const diaries = (snapshot.docs || []).map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  })) as { id: string; date?: string; summary?: string; goodThingsByMember?: Record<string, string[]> }[];

  const memberDiaries = diaries.filter((diary) => {
    const goodThings = diary.goodThingsByMember?.[member] || [];
    return goodThings.length > 0;
  });

  if (memberDiaries.length === 0) {
    return NextResponse.json({
      member,
      period,
      highlight: `${member}님의 ${period === "month" ? "이번 달" : period === "quarter" ? "이번 분기" : "올해"} 하이라이트가 없어요.`,
      diaries: [],
    });
  }

  const allGoodThings = memberDiaries
    .flatMap((diary) => diary.goodThingsByMember?.[member] || [])
    .slice(0, 20);

  const summaryText = memberDiaries
    .map((diary) => `${diary.date}: ${diary.summary}`)
    .join("\n");

  const highlightPrompt = `${member}님의 ${period === "month" ? "이번 달" : period === "quarter" ? "이번 분기" : "올해"} 하이라이트를 만들어줘.

좋았던 일들:
${allGoodThings.join("\n")}

일기 요약들:
${summaryText}

위 내용을 바탕으로 ${member}님의 ${period === "month" ? "이번 달" : period === "quarter" ? "이번 분기" : "올해"}를 한 문장으로 요약해줘. 감성적이고 따뜻하게 작성해줘.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: highlightPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Gemini error");
    }

    const data = await response.json();
    const highlight =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      `${member}님의 ${period === "month" ? "이번 달" : period === "quarter" ? "이번 분기" : "올해"} 하이라이트`;

    return NextResponse.json({
      member,
      period,
      highlight,
      diaries: memberDiaries.slice(0, 10).map((d) => ({
        id: d.id,
        date: d.date,
        summary: d.summary,
      })),
    });
  } catch {
    const fallbackHighlight = `${member}님은 ${memberDiaries.length}개의 일기에서 ${allGoodThings.length}가지 좋았던 일을 기록했어요.`;
    return NextResponse.json({
      member,
      period,
      highlight: fallbackHighlight,
      diaries: memberDiaries.slice(0, 10).map((d) => ({
        id: d.id,
        date: d.date,
        summary: d.summary,
      })),
    });
  }
}
