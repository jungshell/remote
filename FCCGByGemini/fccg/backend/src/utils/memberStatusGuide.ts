// 비활성/정지 회원에게 메일·로그인 모달로 동일하게 안내하는 문구
export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  SUSPENDED: '정지',
  DELETED: '삭제됨',
};

export const MEMBER_STATUS_RELEASE_GUIDE: Record<string, string[]> = {
  INACTIVE: [
    '관리자(강병우, 정성인)에게 활동 재개 의사를 전달해주세요.',
    '관리자가 회원 상태를 "활성"으로 변경하면 바로 다시 로그인할 수 있습니다.',
    '복구 후에는 주간 투표와 경기에 꾸준히 참여해주세요. (투표 4회 연속 / 3개월 6회 미참여, 3개월 경기 미참석 시 다시 비활성 처리)',
  ],
  SUSPENDED: [
    '관리자(강병우, 정성인)에게 정지 해제를 요청해주세요.',
    '관리자가 회원 상태를 "활성"으로 변경하면 바로 다시 로그인할 수 있습니다.',
    '복구 후 60일 이상 로그인하지 않으면 다시 정지 처리됩니다.',
  ],
};
