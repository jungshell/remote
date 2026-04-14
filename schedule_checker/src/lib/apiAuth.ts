/**
 * API 라우트에서 사용: 요청에서 인증된 사용자 uid를 가져옵니다.
 */
import { verifyIdTokenAndGetUid } from './verifyToken';

export async function getUidFromRequest(request: Request): Promise<string | null> {
  return verifyIdTokenAndGetUid(request);
}
