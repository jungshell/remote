/** 새로고침 시 Firebase가 먼저 null을 보낼 수 있어, 이 시간(ms)만큼 대기 후 '로그아웃'으로 간주 */
export const AUTH_SETTLE_MS = Number(process.env.NEXT_PUBLIC_AUTH_SETTLE_MS) || 1000;

/** 토스트 표시 시간(ms). 에러/실패는 더 길게 */
export const TOAST_DURATION_DEFAULT_MS = 2500;
export const TOAST_DURATION_ERROR_MS = 4000;
export const TOAST_DURATION_LONG_MS = 3500;
