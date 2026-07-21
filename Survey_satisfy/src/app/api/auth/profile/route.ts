import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { divisions, programTypes } from "@/constants/divisions";
import { requireAuthUser } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface ProfileBody {
  division?: string;
  business?: string;
  subBusiness?: string;
  programType?: string;
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
  const business = body.business?.trim() ?? "";
  const subBusiness = body.subBusiness?.trim() ?? "";
  const programType = body.programType?.trim() ?? "";

  if (!business || !subBusiness || !programType) {
    return NextResponse.json({ ok: false, error: "담당 사업·세부사업·사업유형을 입력해 주세요." }, { status: 400 });
  }

  if (!divisions.includes(division as (typeof divisions)[number])) {
    return NextResponse.json({ ok: false, error: "올바른 본부를 선택해 주세요." }, { status: 400 });
  }

  if (!programTypes.includes(programType as (typeof programTypes)[number])) {
    return NextResponse.json({ ok: false, error: "올바른 사업유형을 선택해 주세요." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("platform_users")
    .update({
      division,
      business,
      sub_business: subBusiness,
      program_type: programType,
    })
    .eq("id", auth.user.id)
    .select("id, email, name, division, business, sub_business, program_type, role, status")
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
      role: data.role,
      status: data.status,
    },
  });
}
