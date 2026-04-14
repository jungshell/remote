import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

export type MapPlaceDiary = {
  id: string;
  date: string;
  title: string;
  quote?: string;
};

export type MapPlace = {
  location: string;
  diaryIds: string[];
  diaries: MapPlaceDiary[];
};

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("diaries")
      .orderBy("date", "desc")
      .limit(300)
      .get();

    const byLocation = new Map<string, MapPlaceDiary[]>();

    (snapshot.docs || []).forEach((doc: any) => {
      const data = doc.data();
      const loc = (data.location || "").trim() || "장소 없음";
      const entry: MapPlaceDiary = {
        id: doc.id,
        date: data.date || "",
        title: data.title || "제목 없음",
        quote: data.quote || undefined,
      };
      if (!byLocation.has(loc)) {
        byLocation.set(loc, []);
      }
      byLocation.get(loc)!.push(entry);
    });

    const places: MapPlace[] = Array.from(byLocation.entries()).map(
      ([location, diaries]) => ({
        location,
        diaryIds: diaries.map((d) => d.id),
        diaries,
      }),
    );

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Map API error:", error);
    return NextResponse.json(
      { error: "장소 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
