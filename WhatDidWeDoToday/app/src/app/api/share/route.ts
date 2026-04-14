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

  const diary = { id: doc.id, ...doc.data() } as { id: string; title?: string; date?: string; summary?: string };
  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005"}/share/${id}`;

  return NextResponse.json({
    shareUrl,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`,
    diary: {
      id: diary.id,
      title: diary.title,
      date: diary.date,
      summary: diary.summary,
    },
  });
}
