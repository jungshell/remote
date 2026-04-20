/**
 * 카카오톡 등에 붙여넣기 할 공통 요약 카드 포맷 (일정·투표 독려·내 투표 확인)
 */

export const SHARE_CARD_BRAND = '⚽ FC CHAL-GGYEO';

export function buildKakaoMapSearchUrl(location?: string, locationAddress?: string): string {
  const base = (locationAddress || location || '').trim();
  const refined = base.includes(' ') ? base.substring(0, base.lastIndexOf(' ')) : base;
  return `https://map.kakao.com/link/search/${encodeURIComponent(refined || base)}`;
}

/** 확정 일정 → 카톡용 (기존 일정 모달과 동일 계열) */
export function buildGameDetailShareText(gameData: {
  date?: string;
  time?: string;
  location?: string;
  locationAddress?: string | null;
  eventType?: string;
}): string {
  if (!gameData) return '';
  const eventType = gameData.eventType || '자체';
  const normalizedType = ['풋살', 'FRIENDLY', 'FRIENDLY_MATCH'].includes(eventType)
    ? '매치'
    : ['매치', '자체', '회식', '기타'].includes(eventType)
      ? eventType
      : '기타';

  let dateLine = '일시 미정';
  if (gameData.date && gameData.time) {
    const d = new Date(gameData.date);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    dateLine = `${d.getMonth() + 1}월 ${d.getDate()}일(${dayOfWeek}) ${gameData.time}`;
  } else if (gameData.date) {
    const d = new Date(gameData.date);
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    dateLine = `${d.getMonth() + 1}월 ${d.getDate()}일(${dayOfWeek})`;
  }

  const mapUrl = buildKakaoMapSearchUrl(gameData.location, gameData.locationAddress);
  const locationLine = gameData.location || '장소 미정';
  const addressLine = gameData.locationAddress ? `\n- 주소: ${gameData.locationAddress}` : '';

  return [
    `${SHARE_CARD_BRAND} 일정 안내`,
    `- 유형: ${normalizedType}`,
    `- 일시: ${dateLine}`,
    `- 장소: ${locationLine}${addressLine}`,
    '',
    `🗺 카카오맵: ${mapUrl}`
  ].join('\n');
}

/** 투표 독려 / 현황 (관리자 공유 플로팅과 동일 계열) */
export function buildVoteRosterShareCard(opts: {
  votePeriodLabel: string;
  votedNames: string[];
  nonVotedNames: string[];
  scheduleUrl: string;
}): string {
  const votedList = opts.votedNames.length > 0 ? opts.votedNames.join(', ') : '없음';
  const nonVotedList = opts.nonVotedNames.length > 0 ? opts.nonVotedNames.join(', ') : '없음';
  return [
    `${SHARE_CARD_BRAND} 투표 안내`,
    `- 투표기간: ${opts.votePeriodLabel || '일정 확인 중'}`,
    `- 참여 (${opts.votedNames.length}명): ${votedList}`,
    `- 미참여 (${opts.nonVotedNames.length}명): ${nonVotedList}`,
    '- 안내: 아직 투표 안 하신 분은 링크에서 참여 부탁드립니다.',
    '',
    `🔗 투표·일정: ${opts.scheduleUrl}`
  ].join('\n');
}

/** 본인 투표 직후 고정 피드백용 */
export function buildVoteSelfConfirmationCard(opts: {
  votePeriodLabel: string;
  selectionSummary: string;
  scheduleUrl: string;
  isRevote?: boolean;
}): string {
  const head = opts.isRevote ? '재투표가 반영되었습니다.' : '투표가 반영되었습니다.';
  return [
    `${SHARE_CARD_BRAND} 투표 확인`,
    `- ${head}`,
    `- 투표기간: ${opts.votePeriodLabel || '일정 확인 중'}`,
    `- 내 선택: ${opts.selectionSummary}`,
    '',
    `🔗 일정·투표 페이지: ${opts.scheduleUrl}`
  ].join('\n');
}
