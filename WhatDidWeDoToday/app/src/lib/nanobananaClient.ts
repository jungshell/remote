/**
 * 클라이언트 사이드에서 나노바나나 API 폴링 (Vercel 타임아웃 회피용).
 * 서버 API를 통해 폴링하므로 API 키는 서버에만 있음.
 */

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120000;

export interface NanobananaPollResult {
  url: string | null;
  error?: string;
}

/**
 * 나노바나나 taskId로 서버 API를 통해 폴링해 결과 이미지 URL 반환.
 * 브라우저에서 실행되므로 Vercel 타임아웃 없음.
 */
export async function pollNanobananaTask(
  taskId: string,
  onProgress?: (elapsed: number) => void,
): Promise<NanobananaPollResult> {
  const startTime = Date.now();
  const deadline = startTime + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const elapsed = Date.now() - startTime;
    onProgress?.(elapsed);

    try {
      const res = await fetch(`/api/nanobanana/poll?taskId=${encodeURIComponent(taskId)}`);

      if (!res.ok) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      const json = (await res.json()) as {
        status: "pending" | "completed" | "error";
        url?: string;
        error?: string;
        message?: string;
      };

      if (json.status === "completed" && json.url) {
        return { url: json.url };
      }

      if (json.status === "error") {
        return {
          url: null,
          error: json.error || json.message || "나노바나나 작업 실패",
        };
      }

      // pending이면 대기 후 재시도
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    } catch (e) {
      console.warn("[Nanobanana Client] poll error:", e);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  return {
    url: null,
    error: `타임아웃 (${Math.floor((Date.now() - startTime) / 1000)}초 경과)`,
  };
}

/**
 * 나노바나나 이미지 생성 시작 (taskId 받기).
 */
export async function startNanobananaTask(prompt: string): Promise<{ taskId: string } | { error: string }> {
  try {
    const res = await fetch("/api/nanobanana/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.taskId) {
      return { taskId: data.taskId };
    }

    return { error: data.error || "taskId를 받지 못했습니다" };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "나노바나나 시작 실패",
    };
  }
}
