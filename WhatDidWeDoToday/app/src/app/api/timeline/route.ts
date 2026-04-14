import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

function includesMember(data: Record<string, unknown>, member: string): boolean {
  const members = data.members as string[] | undefined;
  if (members && Array.isArray(members) && members.includes(member)) return true;
  const good = data.goodThingsByMember as Record<string, unknown> | undefined;
  if (good && typeof good === "object" && member in good) return true;
  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("start");
  const endDate = url.searchParams.get("end");
  const member = url.searchParams.get("member")?.trim() || null;

  try {
    const db = await getMongoDb();
    const collection = db.collection("diaries");
    
    const query: any = {};
    if (startDate) {
      query.createdAt = { ...query.createdAt, $gte: startDate };
    }
    if (endDate) {
      query.createdAt = { ...query.createdAt, $lte: endDate };
    }

    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    let list = docs.map((doc: any) => {
      const { _id, ...data } = doc;
      return {
        id: String(_id),
        date: data.date,
        title: data.title,
        summary: data.summary,
        location: data.location,
        weather: data.weather,
        moodScore: data.moodScore,
        quote: data.quote,
        keywords: data.keywords || [],
        createdAt: data.createdAt,
        _data: data,
      };
    });

    if (member) {
      list = list.filter((item: any) => includesMember(item._data as Record<string, unknown>, member));
    }

    const timeline = list.map(({ _data, ...rest }: any) => rest);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("Timeline error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
