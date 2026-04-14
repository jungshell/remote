/**
 * 서버 전용: Firebase ID 토큰 검증 후 uid 반환.
 * 환경 변수 FIREBASE_SERVICE_ACCOUNT_JSON 또는
 * FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY 가 필요합니다.
 * 설정되지 않으면 검증을 건너뛰고 null을 반환합니다.
 */
import type { DecodedIdToken } from 'firebase-admin/auth';

let adminApp: import('firebase-admin').app.App | null = null;

/** 서버 전용. Admin SDK 앱 인스턴스 (API에서 Firestore 등에 사용) */
export function getAdminApp(): import('firebase-admin').app.App | null {
  if (adminApp !== null) return adminApp;
  if (typeof window !== 'undefined') return null;

  try {
    const admin = require('firebase-admin');
    if (admin.apps.length > 0) {
      adminApp = admin.app();
      return adminApp;
    }
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      const credential = JSON.parse(json);
      adminApp = admin.initializeApp({ credential: admin.credential.cert(credential) });
      return adminApp;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
      try {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        return adminApp;
      } catch (certError) {
        console.error('Failed to initialize Firebase Admin with individual env vars:', certError instanceof Error ? certError.message : certError);
        throw certError;
      }
    }
  } catch (e) {
    console.warn('Firebase Admin init skipped:', e instanceof Error ? e.message : e);
  }
  return null;
}

/**
 * Authorization: Bearer <idToken> 에서 idToken을 검증하고 uid를 반환합니다.
 * 토큰이 없거나 잘못되었거나 Admin이 초기화되지 않으면 null을 반환합니다.
 */
export async function verifyIdTokenAndGetUid(request: Request): Promise<string | null> {
  const app = getAdminApp();
  if (!app) return null;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const decoded: DecodedIdToken = await app.auth().verifyIdToken(token);
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}
