import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

// 참여자(비로그인) 설문 플로우에 필요한 액션만 무인증 허용, 나머지는 담당자 인증 필수
const PUBLIC_ACTIONS = new Set(["createProjectRound", "submitResponse", "findResponse"]);
const STAFF_ACTIONS = new Set(["generateReport", "getDashboardData"]);

export async function POST(request: Request) {
  if (!SCRIPT_URL) {
    return NextResponse.json(
      {
        ok: false,
        error: "GOOGLE_APPS_SCRIPT_URL 또는 NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL이 설정되지 않았습니다.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.text();
    let action = "";

    try {
      const parsed = JSON.parse(body) as { action?: unknown };
      action = typeof parsed.action === "string" ? parsed.action : "";
    } catch {
      return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    if (STAFF_ACTIONS.has(action)) {
      const auth = await requireAuthUser(request, "staff");

      if (auth.response) {
        return auth.response;
      }
    } else if (PUBLIC_ACTIONS.has(action)) {
      const ip = getClientIp(request);

      if (!checkRateLimit(`google-script:${ip}`, 30, 60_000)) {
        return NextResponse.json(
          { ok: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
          { status: 429 },
        );
      }
    } else {
      return NextResponse.json({ ok: false, error: "허용되지 않은 요청입니다." }, { status: 400 });
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body,
      redirect: "follow",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Apps Script 요청 실패: ${response.status} ${text}`,
        },
        { status: response.status },
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Apps Script 프록시 요청 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
