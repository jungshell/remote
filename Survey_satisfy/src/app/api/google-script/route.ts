import { NextResponse } from "next/server";

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

export async function POST(request: Request) {
  if (!SCRIPT_URL) {
    return NextResponse.json(
      {
        ok: false,
        error: "GOOGLE_APPS_SCRIPT_URL 또는 NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL이 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  try {
    const body = await request.text();
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
