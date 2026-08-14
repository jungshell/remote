import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

// 항상 실제 DB를 건드리도록 캐시 비활성화
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Supabase 무료 플랜의 7일 무활동 자동 일시정지를 막기 위한 keep-alive.
 * Vercel 크론(매일 1회)이 호출해 DB에 가벼운 조회를 보낸다. 민감정보는 반환하지 않는다.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "no-supabase" }, { status: 503 });
  }

  const { error } = await supabase.from("platform_users").select("id").limit(1);

  if (error) {
    console.error("[keepalive] DB ping 실패:", error.message);
    return NextResponse.json({ ok: false, reason: "db-error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
