import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api/http";
import { requireAuthUser } from "@/lib/auth/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

export async function POST(request: Request) {
  const auth = await requireAuthUser(request, "staff");

  if (auth.response) {
    return auth.response;
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "GEMINI_API_KEY가 설정되지 않았습니다.",
      },
      { status: 503 },
    );
  }

  const body = await readJsonBody<{ opinions?: string[]; purpose?: string }>(request);

  if (!body) {
    return NextResponse.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const opinions = body.opinions?.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 200) ?? [];

  if (opinions.length === 0) {
    return NextResponse.json({ ok: true, summary: "", keywords: [], actionItems: [] });
  }

  const prompt = [
    "다음은 공공 지원사업 만족도 조사 주관식 의견입니다.",
    "개인정보를 추정하거나 노출하지 말고, 한국어로 간결하게 분석하세요.",
    "반환 형식은 반드시 JSON만 사용하세요.",
    "{ \"summary\": \"3문장 이내 요약\", \"keywords\": [\"키워드\"], \"actionItems\": [\"개선과제\"] }",
    "",
    opinions.map((opinion, index) => `${index + 1}. ${opinion}`).join("\n"),
  ].join("\n");

  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    );
  } catch (error) {
    console.error("[gemini] 요청 실패:", error);
    return NextResponse.json({ ok: false, error: "AI 요약 요청 중 오류가 발생했습니다." }, { status: 502 });
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("[gemini] 응답 오류:", response.status, text);
    return NextResponse.json(
      {
        ok: false,
        error: `Gemini 요청 실패: ${response.status}`,
      },
      { status: 502 },
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(stripCodeFence(text));
    return NextResponse.json({ ok: true, ...parsed });
  } catch {
    return NextResponse.json({ ok: true, summary: text, keywords: [], actionItems: [] });
  }
}

function stripCodeFence(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}
