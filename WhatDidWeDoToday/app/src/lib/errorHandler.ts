/**
 * 에러 핸들링 유틸리티
 */

import { getUserFriendlyError } from "./messages";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "알 수 없는 오류가 발생했습니다";
}

/**
 * 사용자 친화적인 에러 메시지 가져오기 (통일된 메시지 시스템 사용)
 */
export function getUserErrorMessage(error: unknown, statusCode?: number): string {
  return getUserFriendlyError(error, statusCode);
}

export function logError(context: string, error: unknown) {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, message, error);
  return message;
}

export async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(getErrorMessage(error));
  }
}
