import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { generateReportSummary } from "@/lib/llm";

export const runtime = "nodejs";

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month";
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");

  const now = new Date();
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  if (period !== "month" && period !== "year") {
    return NextResponse.json(
      { error: "period는 month 또는 year여야 합니다." },
      { status: 400 },
    );
  }
  if (Number.isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json(
      { error: "유효한 year를 입력해주세요." },
      { status: 400 },
    );
  }
  if (period === "month" && (Number.isNaN(month) || month < 1 || month > 12)) {
    return NextResponse.json(
      { error: "month는 1~12 사이여야 합니다." },
      { status: 400 },
    );
  }

  const { start, end } =
    period === "month"
      ? getMonthRange(year, month)
      : getYearRange(year);

  try {
    const snapshot = await adminDb
      .collection("diaries")
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();

    const diaries = (snapshot.docs || []).map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const diaryCount = diaries.length;

    const totalKeywords: Record<string, number> = {};
    const locations: Record<string, number> = {};
    const moodScores: number[] = [];
    const quotesOrSummaries: string[] = [];

    for (const d of diaries) {
      if (d.keywords?.length) {
        for (const kw of d.keywords) {
          totalKeywords[kw] = (totalKeywords[kw] || 0) + 1;
        }
      }
      if (d.location) {
        locations[d.location] = (locations[d.location] || 0) + 1;
      }
      if (typeof d.moodScore === "number") {
        moodScores.push(d.moodScore);
      }
      const one = d.quote?.trim() || d.summary?.trim();
      if (one) quotesOrSummaries.push(one.slice(0, 200));
    }

    const avgMood =
      moodScores.length > 0
        ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
        : 0;

    const topKeywords = Object.entries(totalKeywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([k, v]) => `${k}(${v})`);
    const topLocations = Object.entries(locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k}(${v})`);

    let summary = "";
    if (diaryCount === 0) {
      summary =
        period === "month"
          ? `${year}년 ${month}월에는 기록된 일기가 없어요.`
          : `${year}년에는 기록된 일기가 없어요.`;
    } else {
      const periodLabel =
        period === "month"
          ? `${year}년 ${month}월`
          : `${year}년`;

      const prompt = [
        `아래는 "${periodLabel}" 기간의 가족 일기 집계와 대표 문장들이야.`,
        "이걸 바탕으로 한 달/한 해를 한 장으로 요약하는 따뜻하고 감성적인 요약 문단을 작성해줘.",
        "",
        "요구사항:",
        "- 2~4문장으로 간결하게",
        "- 숫자 나열보다는 분위기와 감정을 담아서",
        "- 가족 일기 특유의 워밍한 톤 유지",
        "",
        "=== 집계 ===",
        `총 일기 수: ${diaryCount}개`,
        `평균 기분 점수: ${avgMood.toFixed(1)}`,
        `자주 나온 키워드: ${topKeywords.join(", ") || "없음"}`,
        `자주 간 장소: ${topLocations.join(", ") || "없음"}`,
        "",
        "=== 일기에서 뽑은 한 줄들 (일부) ===",
        quotesOrSummaries.slice(0, 8).join("\n"),
      ].join("\n");

      try {
        summary = await generateReportSummary(prompt);
      } catch (err) {
        console.error("Report summary LLM error:", err);
        summary = `${periodLabel}에는 일기 ${diaryCount}개가 기록되었어요. 평균 기분은 ${avgMood.toFixed(1)}점이에요. ${topKeywords.length ? `자주 나온 키워드는 ${topKeywords.slice(0, 5).join(", ")} 등이에요.` : ""}`;
      }
    }

    return NextResponse.json({
      period,
      year,
      ...(period === "month" && { month }),
      diaryCount,
      stats: {
        totalKeywords,
        locations,
        avgMood,
        topKeywords: topKeywords,
        topLocations: topLocations,
      },
      summary,
    });
  } catch (error) {
    console.error("Report API error:", error);
    return NextResponse.json(
      { error: "리포트 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
