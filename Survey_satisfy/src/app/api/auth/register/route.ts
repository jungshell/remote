import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, readJsonBody } from "@/lib/api/http";
import { divisions } from "@/constants/divisions";
import { programTypes } from "@/constants/divisions";
import { hashPassword } from "@/lib/auth/password";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
  division?: string;
  business?: string;
  subBusiness?: string;
  programType?: string;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase가 설정되지 않았습니다." }, { status: 503 });
  }

  const ip = getClientIp(request);

  if (!checkRateLimit(`register:${ip}`, 5, 300_000)) {
    return NextResponse.json(
      { ok: false, error: "가입 시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const body = await readJsonBody<RegisterBody>(request);

  if (!body) {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();
  const division = body.division?.trim();
  const business = body.business?.trim() ?? "";
  const subBusiness = body.subBusiness?.trim() ?? "";
  const programType = body.programType?.trim() ?? "";

  if (!email || !password || !name || !division || !business || !subBusiness || !programType) {
    return NextResponse.json(
      { ok: false, error: "이름·이메일·본부·담당 사업·세부사업·사업유형을 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  if (!divisions.includes(division as (typeof divisions)[number])) {
    return NextResponse.json({ ok: false, error: "올바른 본부를 선택해 주세요." }, { status: 400 });
  }

  if (!programTypes.includes(programType as (typeof programTypes)[number])) {
    return NextResponse.json({ ok: false, error: "올바른 사업유형을 선택해 주세요." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const { data, error } = await supabase
    .from("platform_users")
    .insert({
      email,
      password_hash: passwordHash,
      name,
      division,
      business,
      sub_business: subBusiness,
      program_type: programType,
      role: "staff",
      status: "pending",
    })
    .select("id, email, name, division, business, sub_business, program_type, role, status")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "이미 등록된 이메일입니다." }, { status: 409 });
    }

    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "가입 신청이 완료되었습니다. 총괄 관리자 승인 후 로그인할 수 있습니다.",
    user: data,
  });
}
