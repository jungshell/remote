const RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

/**
 * 인메모리 슬라이딩 윈도우 rate limit.
 * 서버리스 인스턴스별로 독립 동작하므로 완전한 방어는 아니지만,
 * 무차별 대입·남용 속도를 크게 낮추는 1차 방어선입니다.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  if (RATE_BUCKETS.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of RATE_BUCKETS) {
      if (bucket.resetAt <= now) {
        RATE_BUCKETS.delete(bucketKey);
      }
    }
  }

  const bucket = RATE_BUCKETS.get(key);

  if (!bucket || bucket.resetAt <= now) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

/** 잘못된 JSON 본문을 500 대신 null로 처리하기 위한 파싱 가드 */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
