/**
 * 통일된 에러 및 로딩 메시지 시스템
 */

export type ErrorType = 
  | "quota_exceeded"
  | "credit_insufficient"
  | "network_error"
  | "server_error"
  | "not_found"
  | "validation_error"
  | "upload_failed"
  | "transcription_failed"
  | "image_generation_failed"
  | "unknown";

export type LoadingType =
  | "uploading"
  | "transcribing"
  | "generating"
  | "saving"
  | "loading";

/**
 * 에러 메시지 매핑
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  quota_exceeded: "할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.",
  credit_insufficient: "크레딧이 부족합니다. 크레딧을 충전하거나 다른 방법을 사용해주세요.",
  network_error: "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.",
  server_error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  not_found: "요청한 내용을 찾을 수 없습니다.",
  validation_error: "입력한 내용을 확인해주세요.",
  upload_failed: "파일 업로드에 실패했습니다. 파일 크기나 형식을 확인해주세요.",
  transcription_failed: "음성 인식에 실패했습니다. 오디오 파일을 확인해주세요.",
  image_generation_failed: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
  unknown: "알 수 없는 오류가 발생했습니다.",
};

/**
 * 로딩 메시지 매핑
 */
export const LOADING_MESSAGES: Record<LoadingType, string> = {
  uploading: "업로드 중...",
  transcribing: "음성 인식 중...",
  generating: "생성 중...",
  saving: "저장 중...",
  loading: "불러오는 중...",
};

/**
 * 에러 타입 감지
 */
export function detectErrorType(error: unknown, statusCode?: number): ErrorType {
  if (statusCode === 402) return "credit_insufficient";
  if (statusCode === 404) return "not_found";
  if (statusCode === 400) return "validation_error";
  if (statusCode === 413) return "upload_failed";
  if (statusCode === 502 || statusCode === 503) return "network_error";
  if (statusCode === 500) return "server_error";
  
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes("quota") || lowerMessage.includes("resource_exhausted")) {
    return "quota_exceeded";
  }
  if (lowerMessage.includes("credit") || lowerMessage.includes("크레딧")) {
    return "credit_insufficient";
  }
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "network_error";
  }
  if (lowerMessage.includes("upload") || lowerMessage.includes("업로드")) {
    return "upload_failed";
  }
  if (lowerMessage.includes("transcribe") || lowerMessage.includes("음성 인식")) {
    return "transcription_failed";
  }
  if (lowerMessage.includes("image") || lowerMessage.includes("이미지")) {
    return "image_generation_failed";
  }
  
  return "unknown";
}

/**
 * 사용자 친화적인 에러 메시지 생성
 */
export function getUserFriendlyError(error: unknown, statusCode?: number): string {
  const errorType = detectErrorType(error, statusCode);
  const baseMessage = ERROR_MESSAGES[errorType];
  
  // 특수 케이스 처리
  if (errorType === "credit_insufficient") {
    return `${baseMessage}\n\nNanoBanana 크레딧은 매일 자동으로 충전되지 않으며, 수동으로 충전이 필요합니다.`;
  }
  
  if (errorType === "quota_exceeded") {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const koreaOffset = 9 * 60;
    const koreaTime = new Date(utcNow.getTime() + (koreaOffset * 60000));
    const tomorrow = new Date(koreaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const hoursUntilReset = Math.ceil((tomorrow.getTime() - koreaTime.getTime()) / (1000 * 60 * 60));
    
    return `${baseMessage}\n\n할당량은 매일 오전 9시(한국 시간)에 자동으로 리셋됩니다.\n다음 리셋까지 약 ${hoursUntilReset}시간 남았습니다.`;
  }
  
  return baseMessage;
}

/**
 * 로딩 메시지 가져오기
 */
export function getLoadingMessage(type: LoadingType): string {
  return LOADING_MESSAGES[type];
}
