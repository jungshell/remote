/**
 * 카카오톡 등에 붙여넣기 할 공통 요약 카드 포맷 (일정·투표 독려·내 투표 확인)
 * 카카오맵: 주소(두정동 등)가 아니라 장소 줄(location) 기준 시설명으로 검색
 */

export const SHARE_CARD_BRAND = '⚽ FC CHAL-GGYEO';

/** NBSP 등 유니코드 공백을 일반 공백으로 통일 (카톡·DB 복사 시 split 실패 방지) */
const UNICODE_SPACE_RE = /[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g;

export function normalizeVenueWhitespace(raw?: string | null): string {
  if (raw == null || typeof raw !== 'string') return '';
  return raw.replace(UNICODE_SPACE_RE, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * API/화면에서 쓰는 장소 문자열 후보를 하나로 합침 (location 우선, gameLocation 보조)
 */
export function resolvePrimaryVenueName(gameData: {
  location?: string | null;
  gameLocation?: string | null;
}): string {
  const a = normalizeVenueWhitespace(gameData.location);
  const b = normalizeVenueWhitespace(gameData.gameLocation);
  if (a && a !== '미정') return a;
  if (b && b !== '미정') return b;
  return '';
}

/** 장소 필드에서 지도 검색어 (예: "아트풋살장 2구장" → "아트풋살장") */
export function getVenueMapSearchQuery(location?: string | null): string {
  const loc = normalizeVenueWhitespace(location);
  if (!loc || loc === '미정') return '';
  const refined = loc.includes(' ') ? loc.substring(0, loc.lastIndexOf(' ')).trim() : loc;
  return refined || loc;
}

/** UI·공유 문구에 쓸 짧은 지도 라벨 */
export function getVenueMapDisplayLabel(location?: string | null): string {
  const q = getVenueMapSearchQuery(location);
  if (q) return q;
  const raw = normalizeVenueWhitespace(location);
  return raw || '장소';
}

/** 카카오맵 검색 URL (장소명 우선, 장소 없을 때만 주소 사용) */
export function buildKakaoMapSearchUrl(location?: string, locationAddress?: string): string {
  const query = getVenueMapSearchQuery(location);
  if (query) {
    return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
  }
  const addr = normalizeVenueWhitespace(locationAddress);
  if (addr) {
    return `https://map.kakao.com/link/search/${encodeURIComponent(addr)}`;
  }
  return 'https://map.kakao.com';
}

/** 모달·복사 공통: venue 후보를 반영한 지도 URL (시설명이 있으면 주소로 검색하지 않음) */
export function buildKakaoMapSearchUrlFromGame(gameData: {
  location?: string | null;
  gameLocation?: string | null;
  locationAddress?: string | null;
}): string {
  const venue = resolvePrimaryVenueName(gameData);
  if (venue) return buildKakaoMapSearchUrl(venue, undefined);
  return buildKakaoMapSearchUrl('', gameData.locationAddress);
}

/** 확정 일정 → 카톡용 (기존 일정 모달과 동일 계열) */
export function buildGameDetailShareText(gameData: {
  date?: string;
  time?: string;
  location?: string;
  gameLocation?: string | null;
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

  const venueName = resolvePrimaryVenueName(gameData);
  const mapUrl = buildKakaoMapSearchUrlFromGame(gameData);
  const mapLabel = getVenueMapDisplayLabel(venueName || gameData.location);
  const locationLine = venueName || normalizeVenueWhitespace(gameData.location) || '장소 미정';
  const addressLine = gameData.locationAddress ? `\n- 주소: ${normalizeVenueWhitespace(gameData.locationAddress)}` : '';

  return [
    `${SHARE_CARD_BRAND} 일정 안내`,
    `- 유형: ${normalizedType}`,
    `- 일시: ${dateLine}`,
    `- 장소: ${locationLine}${addressLine}`,
    '',
    '🗺 카카오맵 검색',
    mapLabel,
    mapUrl
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
    '🔗 일정·투표 페이지',
    opts.scheduleUrl
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
    '🔗 일정·투표 페이지',
    opts.scheduleUrl
  ].join('\n');
}
