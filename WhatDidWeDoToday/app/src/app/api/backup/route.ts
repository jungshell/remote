import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const snapshot = await adminDb.collection("diaries").get();
    const diaries = (snapshot.docs || []).map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      backup: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        count: diaries.length,
        diaries,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backup = body.backup;

    if (!backup || !backup.diaries) {
      return NextResponse.json({ error: "Invalid backup" }, { status: 400 });
    }

    const batch = adminDb.batch();
    let count = 0;

    for (const diary of backup.diaries) {
      const { id, ...data } = diary;
      const docRef = adminDb.collection("diaries").doc(id);
      batch.set(docRef, data);
      count++;
    }

    await batch.commit();

    return NextResponse.json({
      restored: count,
      message: "Backup restored successfully",
    });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
