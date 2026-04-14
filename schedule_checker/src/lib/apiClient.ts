'use client';

import { auth } from './firebase';

/**
 * API 요청 시 현재 로그인 사용자의 ID 토큰을 Authorization 헤더에 붙입니다.
 * 비로그인 시에는 토큰 없이 요청합니다.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let token: string | null = null;
  try {
    token = (await auth.currentUser?.getIdToken?.()) ?? null;
  } catch {
    // ignore
  }
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
