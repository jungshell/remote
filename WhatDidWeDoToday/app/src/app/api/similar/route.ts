import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

type DiaryDoc = {
  id: string;
  date?: string;
  summary?: string;
  title?: string;
  keywords?: string[];
  location?: string;
  [key: string]: unknown;
};

function parseDate(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`).getTime();
}

/** 키워드 겹침 개수, 같은 장소, 날짜 근접도로 유사도 점수 계산 */
function scoreSimilar(target: DiaryDoc, other: DiaryDoc): number {
  if (target.id === other.id) return -1;
  let score = 0;
  const targetKw = new Set((target.keywords ?? []).map((k) => String(k).toLowerCase()));
  const otherKw = (other.keywords ?? []).map((k) => String(k).toLowerCase());
  otherKw.forEach((k) => {
    if (targetKw.has(k)) score += 2;
  });
  if (target.location && other.location && String(target.location).trim() === String(other.location).trim()) {
    score += 1.5;
  }
  const targetTime = parseDate(target.date);
  const otherTime = parseDate(other.date);
  if (targetTime && otherTime) {
    const diffDays = Math.abs(targetTime - otherTime) / (24 * 60 * 60 * 1000);
    if (diffDays <= 7) score += 1;
    else if (diffDays <= 30) score += 0.5;
  }
  return score;
}

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
  const target = { id: doc.id, ...doc.data() } as DiaryDoc;

  const snapshot = await adminDb
    .collection("diaries")
    .orderBy("createdAt", "desc")
    .limit(80)
    .get();

  const all = (snapshot.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as DiaryDoc));
  const scored = all
    .map((d) => ({ diary: d, score: scoreSimilar(target, d) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ diary }) => diary);

  return NextResponse.json({ similar: scored });
}
