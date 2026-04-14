import { NextResponse } from "next/server";
import { adminDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member, features } = body;

    if (!member || !features) {
      return NextResponse.json(
        { error: "member and features are required" },
        { status: 400 },
      );
    }

    const profileRef = adminDb.collection("familyProfiles").doc(member);
    await profileRef.set({
      member,
      features,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile save error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const member = url.searchParams.get("member");

    if (member) {
      const doc = await adminDb.collection("familyProfiles").doc(member).get();
      if (doc.exists) {
        return NextResponse.json({ profile: doc.data() });
      }
      return NextResponse.json({ profile: null });
    }

    const snapshot = await adminDb.collection("familyProfiles").get();
    const profiles = (snapshot.docs || []).map((doc: any) => doc.data());

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Profile get error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
