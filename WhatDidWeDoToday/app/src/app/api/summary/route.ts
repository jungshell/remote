import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";
import { generateDiary } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "week";
  const member = url.searchParams.get("member");

  try {
    const now = new Date();
    let startDate: Date;

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const snapshot = await adminDb
      .collection("diaries")
      .where("createdAt", ">=", startDate.toISOString())
      .get();

    const diaries = (snapshot.docs || []).map((doc: any) => doc.data());

    let transcripts = diaries
      .map((d: any) => d.transcript || "")
      .filter(Boolean)
      .join("\n\n");

    if (member && diaries.length > 0) {
      const memberDiaries = diaries.filter((d: any) =>
        d.goodThingsByMember?.[member],
      );
      transcripts = memberDiaries
        .map((d: any) => d.transcript || "")
        .filter(Boolean)
        .join("\n\n");
    }

    if (!transcripts.trim()) {
      return NextResponse.json({
        summary: "요약할 내용이 없어요.",
      });
    }

    const summaryPrompt = [
      "아래는 가족 일기들의 모음이야. 이 내용을 요약해서",
      period === "week" ? "주간 요약본" : "월간 요약본",
      "을 만들어줘.",
      "",
      "요구사항:",
      "- 핵심 내용만 간결하게 요약",
      "- 가족의 감정과 경험을 담아서",
      "- 3-5문단으로 구성",
      "",
      "내용:",
      transcripts,
    ].join("\n");

    const summary = await generateDiary(summaryPrompt, {
      date: new Date().toISOString().slice(0, 10),
      location: "집",
      weather: "맑음",
      members: [],
    });

    return NextResponse.json({
      summary: summary.summary || "요약 생성 실패",
      period,
      member: member || "전체",
    });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
