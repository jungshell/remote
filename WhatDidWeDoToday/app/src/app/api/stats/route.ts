import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month";
  const member = url.searchParams.get("member");

  try {
    const now = new Date();
    let startDate: Date;

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const db = await getMongoDb();
    const collection = db.collection("diaries");
    
    const docs = await collection
      .find({
        createdAt: { $gte: startDate.toISOString() },
      })
      .toArray();

    const diaries = docs.map((doc: any) => {
      const { _id, ...data } = doc;
      return {
        id: String(_id),
        ...data,
      };
    });

    const stats = {
      totalDiaries: diaries.length,
      totalKeywords: {} as Record<string, number>,
      locations: {} as Record<string, number>,
      moodScores: [] as number[],
      members: {} as Record<string, {
        count: number;
        totalMood: number;
        keywords: Record<string, number>;
      }>,
      timeline: diaries.map((d: any) => ({
        date: d.date,
        title: d.title,
        mood: d.moodScore,
        location: d.location,
      })),
    };

    for (const diary of diaries) {
      const d = diary as any;

      if (d.keywords) {
        for (const kw of d.keywords) {
          stats.totalKeywords[kw] = (stats.totalKeywords[kw] || 0) + 1;
        }
      }

      if (d.location) {
        stats.locations[d.location] = (stats.locations[d.location] || 0) + 1;
      }

      if (typeof d.moodScore === "number") {
        stats.moodScores.push(d.moodScore);
      }

      if (d.goodThingsByMember) {
        for (const [name, items] of Object.entries(d.goodThingsByMember)) {
          if (member && name !== member) continue;

          if (!stats.members[name]) {
            stats.members[name] = {
              count: 0,
              totalMood: 0,
              keywords: {},
            };
          }

          stats.members[name].count += 1;
          if (typeof d.moodScore === "number") {
            stats.members[name].totalMood += d.moodScore;
          }

          if (d.keywords) {
            for (const kw of d.keywords) {
              stats.members[name].keywords[kw] =
                (stats.members[name].keywords[kw] || 0) + 1;
            }
          }
        }
      }
    }

    for (const name of Object.keys(stats.members)) {
      const m = stats.members[name];
      m.totalMood = m.count > 0 ? m.totalMood / m.count : 0;
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
