import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * 사업명 → 사업유형 매핑 (기존 등록 사용자·설문이 저장한 값 기반).
 * 가입 화면에서 같은 사업명 입력 시 유형을 자동 채우기 위한 공개 조회.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, map: {} });
  }

  const map: Record<string, string> = {};

  const addRows = (rows: Array<{ business?: string | null; program_type?: string | null }> | null) => {
    for (const row of rows ?? []) {
      const business = (row.business ?? "").trim();
      const type = (row.program_type ?? "").trim();
      if (business && type && !map[business]) {
        map[business] = type;
      }
    }
  };

  const [users, surveys] = await Promise.all([
    supabase.from("platform_users").select("business, program_type"),
    supabase.from("surveys").select("business, program_type"),
  ]);

  addRows(users.data);
  addRows(surveys.data);

  return NextResponse.json({ ok: true, map });
}
