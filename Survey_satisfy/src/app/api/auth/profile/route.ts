import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { divisions } from "@/constants/divisions";
import { normalizeBusinessesInput } from "@/lib/auth/business";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { parseBusinessAssignments } from "@/lib/auth/types";
import type { Json } from "@/lib/supabase/database.types";

interface ProfileBody {
  division?: string;
  business?: string;
  subBusiness?: string;
  programType?: string;
  businesses?: unknown;
}

export async function PATCH(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response || !auth.user) {
    return auth.response;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<ProfileBody>(request);

  if (!body) {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const division = body.division?.trim() ?? auth.user.division;

  if (!divisions.includes(division as (typeof divisions)[number])) {
    return NextResponse.json({ ok: false, error: "올바른 본부를 선택해 주세요." }, { status: 400 });
  }

  const { businesses, error: businessError } = normalizeBusinessesInput(body);
  if (businessError) {
    return NextResponse.json({ ok: false, error: businessError }, { status: 400 });
  }

  const primary = businesses[0];

  const { data, error } = await supabase
    .from("platform_users")
    .update({
      division,
      business: primary.business,
      sub_business: primary.subBusiness,
      program_type: primary.programType,
      businesses: businesses as unknown as Json,
    })
    .eq("id", auth.user.id)
    .select("id, email, name, division, business, sub_business, program_type, businesses, role, status")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: data.id,
      email: data.email,
      name: data.name,
      division: data.division,
      business: data.business,
      subBusiness: data.sub_business,
      programType: data.program_type,
      businesses: parseBusinessAssignments(data.businesses),
      role: data.role,
      status: data.status,
    },
  });
}
