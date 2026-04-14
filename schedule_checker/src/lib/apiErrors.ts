/** API 응답용 통일된 한글 에러 메시지 */
export const API_MESSAGES = {
  TASK_NOT_FOUND: '업무를 찾을 수 없습니다.',
  TASK_CREATE_FAILED: '업무 생성에 실패했습니다.',
  TASK_UPDATE_FAILED: '업무 수정에 실패했습니다.',
  TASK_DELETE_FAILED: '업무 삭제에 실패했습니다.',
  TASKS_FETCH_FAILED: '업무 목록을 불러오지 못했습니다.',
  CONTACTS_FETCH_FAILED: '연락처를 불러오지 못했습니다.',
  ALERTS_FETCH_FAILED: '알림을 불러오지 못했습니다.',
  UNKNOWN: '잠시 후 다시 시도해 주세요.',
} as const;
