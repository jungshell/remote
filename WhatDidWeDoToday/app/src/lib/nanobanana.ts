/**
 * NanoBanana API로 텍스트→이미지 생성 (4컷 만화용).
 * API 키가 있으면 Pollinations 대신 사용해 한글 캡션 품질을 높일 수 있음.
 * @see https://docs.nanobananaapi.ai/
 */

const NANOBANANA_GENERATE_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/generate";
const NANOBANANA_RECORD_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/record-info";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120000;

function getApiKey(): string | null {
  const key =
    process.env.NANOBANANA_API_KEY ||
    process.env.NANO_BANANA_API_KEY ||
    "";
  return key.trim() || null;
}

/**
 * 나노바나나 이미지 생성 시작 (taskId만 반환, 폴링 없음).
 * Vercel 타임아웃 회피를 위해 폴링은 클라이언트/별도 API에서 처리.
 * @deprecated 서버에서 폴링하면 타임아웃 발생. 대신 /api/nanobanana/start 사용 후 클라이언트에서 폴링.
 */
export async function generateImageWithNanobanana(prompt: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  let taskId: string;
  try {
    const body: Record<string, unknown> = {
      prompt,
      type: "TEXTTOIAMGE",
      numImages: 1,
      image_size: "1152x720",
    };
    // 문서상 callBackUrl이 필수일 수 있음. 폴링만 쓸 경우 더미 URL
    const callbackUrl = process.env.NANOBANANA_CALLBACK_URL;
    if (callbackUrl?.trim()) body.callBackUrl = callbackUrl.trim();
    else body.callBackUrl = "https://example.com/nanobanana-callback";

    const res = await fetch(NANOBANANA_GENERATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[Nanobanana] generate failed:", res.status, text);
      return null;
    }

    const json = (await res.json()) as { code?: number; data?: { taskId?: string }; msg?: string };
    if (json?.code === 402) {
      console.warn("[Nanobanana] 크레딧 부족(402). 충전 후 다시 시도하세요:", json?.msg ?? "The current credits are insufficient. Please top up.");
      return null;
    }
    taskId = json?.data?.taskId ?? "";
    if (!taskId) {
      console.warn("[Nanobanana] no taskId in response:", json);
      return null;
    }
  } catch (e) {
    console.warn("[Nanobanana] request error:", e);
    return null;
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await fetch(
        `${NANOBANANA_RECORD_URL}?taskId=${encodeURIComponent(taskId)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        code?: number;
        data?: {
          successFlag?: number;
          response?: { resultImageUrl?: string };
        };
      };
      const flag = json?.data?.successFlag;
      const url = json?.data?.response?.resultImageUrl?.trim();
      if (flag === 1 && url) return url;
      if (flag === 2 || flag === 3) {
        console.warn("[Nanobanana] task failed:", flag, json);
        return null;
      }
    } catch (e) {
      console.warn("[Nanobanana] poll error:", e);
    }
  }
  console.warn("[Nanobanana] poll timeout for taskId:", taskId);
  return null;
}
