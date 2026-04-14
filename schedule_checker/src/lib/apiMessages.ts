/**
 * API 한글 에러·안내 메시지 통일 (Phase 3)
 */
export const API_MESSAGES = {
  // 업무
  TASKS_FETCH_FAIL: '업무 목록을 불러오지 못했습니다.',
  TASK_CREATE_FAIL: '업무 생성에 실패했습니다.',
  TASK_NOT_FOUND: '업무를 찾을 수 없습니다.',
  TASK_UPDATE_FAIL: '업무 수정에 실패했습니다.',
  TASK_DELETE_FAIL: '업무 삭제에 실패했습니다.',

  // 연락처
  CONTACTS_FETCH_FAIL: '연락처를 불러오지 못했습니다.',
  CONTACT_CREATE_FAIL: '연락처 생성에 실패했습니다.',
  CONTACT_NOT_FOUND: '연락처를 찾을 수 없습니다.',
  CONTACT_UPDATE_FAIL: '연락처 수정에 실패했습니다.',
  CONTACT_DELETE_FAIL: '연락처 삭제에 실패했습니다.',

  // 알림
  ALERTS_FETCH_FAIL: '알림 목록을 불러오지 못했습니다.',
  ALERT_CREATE_FAIL: '알림 생성에 실패했습니다.',

  // 시드
  SEED_FAIL: '테스트 데이터 생성에 실패했습니다.',

  // 자동화
  SUMMARY_FAIL: '데일리 요약 생성에 실패했습니다.',
} as const;
