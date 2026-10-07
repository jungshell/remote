/**
 * 디자인 토큰 상수
 * 모든 디자인 값은 여기서 관리하여 일관성 유지
 */

// 색상
export const COLORS = {
  // 메인 브랜드 색상 (Chakra theme의 brand.* 스케일과 동일한 값을 사용한다)
  BRAND_PRIMARY: '#004ea8', // brand.500
  BRAND_PRIMARY_HOVER: '#003d85', // brand.600
  BRAND_PRIMARY_DARK: '#003d85', // brand.600
  BRAND_PRIMARY_DARKER: '#002c62', // brand.700
  BRAND_PRIMARY_LIGHT: '#1a8cff', // brand.400
  BRAND_SOFT: '#e6f3ff', // brand.50 — 옅은 배경 tint
  BRAND_SOFT_STRONG: '#b3d9ff', // brand.100 — 강조된 옅은 배경 tint

  // Match Day 레이어 (theme의 matchday.* 와 동일)
  MATCHDAY_NAVY: '#0A1B33',
  MATCHDAY_PITCH: '#0F2747',
  MATCHDAY_VOLT: '#D7FF3A', // 신호색 — LIVE / D-DAY / 처리 필요에만

  // 상태 색상
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6',
  
  // 투표 관련
  VOTE_ACTIVE: '#9333ea', // purple.500
  VOTE_CLOSED: '#ef4444', // red.500
  
  // 텍스트 색상
  TEXT_PRIMARY: '#1f2937',
  TEXT_SECONDARY: '#6b7280',
  TEXT_DISABLED: '#9ca3af',
  
  // 배경 색상
  BG_WHITE: '#ffffff',
  BG_GRAY_50: '#f9fafb',
  BG_GRAY_100: '#f3f4f6',
  
  // 보더 색상
  BORDER_GRAY_200: '#e5e7eb',
  BORDER_GRAY_300: '#d1d5db',
} as const;

// 대시보드 NEXT MATCH 카드 그라디언트 — brand.* 스케일에 연결하되
// 기존 스포츠다운 다크 블루 그라디언트 분위기와 MATCHDAY 상태 구분(청록 포인트)은 유지한다.
export const GRADIENTS = {
  NEXT_MATCH_DEFAULT: `linear-gradient(145deg, ${COLORS.BRAND_PRIMARY_DARKER} 0%, ${COLORS.BRAND_PRIMARY_DARK} 58%, ${COLORS.BRAND_PRIMARY_LIGHT} 100%)`,
  NEXT_MATCH_MATCHDAY: `linear-gradient(145deg, ${COLORS.BRAND_PRIMARY_DARKER} 0%, ${COLORS.BRAND_PRIMARY} 52%, #0AA2C0 100%)`,
} as const;

// 경기 유형별 색상 — 대시보드 통계 카드(MainDashboard)와 일정 페이지 캘린더(NewCalendarV2)에서
// 동일한 값을 각자 하드코딩하던 것을 하나로 합쳤다. 두 곳 모두 이 값을 참조한다.
// Match Day 규칙(관리자 StatusBadge eventType)과 같다: 매치 brand / 자체 navy / 회식 orange.
export const EVENT_TYPE_COLORS: Record<string, string> = {
  '매치': '#004ea8',
  '자체': '#0A1B33',
  '회식': '#C05621',
  '기타': '#6b7280',
};

// 간격 (Spacing)
export const SPACING = {
  // 작은 간격
  XS: 0.5, // 2px
  SM: 1,   // 4px
  MD: 2,   // 8px
  LG: 3,   // 12px
  XL: 4,   // 16px
  
  // 큰 간격
  XXL: 6,  // 24px
  XXXL: 8, // 32px
  
  // 반응형 간격
  RESPONSIVE: {
    SMALL: { base: 1, md: 2 },
    MEDIUM: { base: 2, md: 4 },
    LARGE: { base: 4, md: 6 },
    XLARGE: { base: 6, md: 8 },
  },
} as const;

// 패딩
export const PADDING = {
  // 카드/박스 패딩
  CARD: { base: 2, md: 3 },
  CARD_COMPACT: { base: 2, md: 2.67 },
  CARD_TIGHT: { base: 1.5, md: 2 },
  
  // 섹션 패딩
  SECTION: { base: 4, md: 6, lg: 8 },
  SECTION_COMPACT: { base: 2, md: 3 },
  
  // 헤더 패딩
  HEADER: { base: 2, md: 4, lg: 6 },
  HEADER_LOGO: { base: 4, md: 6, lg: 8 },
} as const;

// 마진
export const MARGIN = {
  // 작은 마진
  XS: 0.5,
  SM: 1,
  MD: 2,
  LG: 3,
  XL: 4,
  
  // 섹션 마진
  SECTION: { base: 2, md: 3 },
  SECTION_LARGE: { base: 4, md: 6 },
} as const;

// 폰트 크기
export const FONT_SIZE = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
  '2XL': '2xl',
  '3XL': '3xl',
} as const;

// 폰트 굵기
export const FONT_WEIGHT = {
  NORMAL: 'normal',
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 'bold',
} as const;

// 보더 반경
export const BORDER_RADIUS = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
  FULL: 'full',
} as const;

// 그림자
export const SHADOW = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const;

// 높이
export const HEIGHT = {
  HEADER: '60px',
  HEADER_COMPACT: '50px',
  BANNER_COMPACT: 'auto', // 내용에 맞춤
} as const;

// 너비
export const WIDTH = {
  FULL: '100%',
  FULL_VW: '100vw',
  CONTAINER: { base: '100%', lg: '1400px' },
  SIDEBAR: { base: '100%', lg: '400px' },
} as const;

// 간격 (Gap)
export const GAP = {
  SMALL: { base: 2, md: 3 },
  MEDIUM: { base: 4, md: 6 },
  LARGE: { base: 6, md: 8 },
} as const;

// VStack 간격
export const VSTACK_SPACING = {
  TIGHT: { base: 1, md: 1.5 },
  NORMAL: { base: 2, md: 3 },
  LOOSE: { base: 4, md: 6 },
} as const;

// HStack 간격
export const HSTACK_SPACING = {
  TIGHT: 1,
  NORMAL: 2,
  LOOSE: 4,
} as const;

// 버튼 크기
export const BUTTON_SIZE = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;

// 아이콘 크기
export const ICON_SIZE = {
  SM: '16px',
  MD: '20px',
  LG: '24px',
  XL: '32px',
} as const;

// Z-Index — 플로팅 UI가 겹치지 않도록 화면에 뜨는 순서대로 정리한 단일 스케일
export const Z_INDEX = {
  HEADER: 100,
  FLOATING_WIDGET: 1000, // 대시보드 음악 버튼 등 페이지 내 드래그 가능한 위젯
  CHATBOT: 1200,
  HELP_BUTTON: 1210, // 챗봇 버튼보다 살짝 위, 서로 겹칠 때도 항상 클릭 가능하도록
  MODAL: 1400,
  TOOLTIP: 1800,
  NOTIFICATION: 9999, // 전역 알림은 모달 위에서도 항상 보여야 한다
} as const;

// Motion — 화면 곳곳에 흩어져 있던 hover/state transition 값(0.15~0.2s 사이)을
// 하나의 작은 스케일로 정리한다. 새로운 애니메이션을 추가하는 게 아니라
// 기존 움직임의 duration/easing 표기를 통일하기 위한 토큰이다.
// NEXT MATCH 등 Brand Hero Zone의 고유 keyframe 애니메이션(float/pulse/gradient)은
// 이 토큰으로 통일하지 않고 그대로 둔다.
export const MOTION = {
  DURATION: {
    FAST: '0.15s', // 버튼/링크/아이콘 hover·focus 같은 micro interaction
    NORMAL: '0.2s', // 카드 hover, 드래그 가능한 위젯 등 조금 더 무게감 있는 UI 전환
    SLOW: '0.3s', // 캘린더 셀/정보 박스처럼 상대적으로 큰 표면이 반응하는 전환
  },
  EASING: {
    STANDARD: 'ease',
  },
} as const;

// 모바일에서 전역 ChatbotWidget(우하단 고정, ChatbotWidget.tsx)이 차지하는 가로 폭.
// right 16px + 버튼 48px + 여유 8px. 스크롤 위치와 무관하게 항상 겹치면 안 되는
// 우측 하단 액션 영역(예: 일정 페이지의 "투표하기" 버튼 열)에서 이 값만큼
// 오른쪽 여백을 확보하면, 세로 스크롤 오프셋과 상관없이 챗봇과 절대 겹치지 않는다.
export const MOBILE_CHATBOT_SAFE_RIGHT = '72px';

// 관리자 Shell 치수 — Header(고정), 관리자 모바일 title bar, 데스크톱 사이드바, 챗봇 위치가 같은 값을 공유한다.
// 챗봇은 관리자 화면에서 콘텐츠 영역 밖(데스크톱: 사이드바 하단 칸 / 모바일: title bar 우측 dock)에만 놓여
// 페이지별 여백 없이도 어떤 버튼과도 겹치지 않는다.
export const ADMIN_SHELL = {
  HEADER_H: 80, // Header.tsx 고정 높이
  SIDEBAR_W: 280,
  SIDEBAR_CHATBOT_SLOT_H: 80, // 사이드바 하단, 원형 챗봇 버튼 전용 칸
  MOBILE_BAR_H: 64, // 관리자 모바일 title bar
  DOCK_W: 38,
  DOCK_H: 46,
} as const;

// 반응형 브레이크포인트
export const BREAKPOINTS = {
  SM: '30em',
  MD: '48em',
  LG: '62em',
  XL: '80em',
  '2XL': '96em',
} as const;

// 레이아웃 상수
export const LAYOUT = {
  // 홈페이지
  HOME: {
    TOP_PADDING: '18mm',
    MAIN_GAP: 8,
    MAIN_PADDING: { base: 2, md: 8, lg: 24 },
    QUOTE_CARD: {
      MIN_HEIGHT: '433px',
      MAX_WIDTH: { base: '100%', md: '420px' },
    },
    VIDEO_CARD: {
      MIN_HEIGHT: { base: '180px', md: '300px', lg: '400px' },
    },
    BANNER: {
      PADDING: 2,
      SPACING: { base: 1.33, md: 1.33 },
      MARGIN_BOTTOM: 0.5,
      MARGIN_TOP: 0.5,
    },
  },
  
  // 일정 페이지
  SCHEDULE: {
    SECTION_PADDING: { base: 2, md: 3 },
    SECTION_MARGIN: { base: 2, md: 3 },
    ITEM_SPACING: { base: 1, md: 1.5 },
    SECTION_GAP: { base: 2, md: 3 },
  },
  
  // 헤더
  HEADER: {
    PADDING: { base: 2, md: 4, lg: 6 },
    LOGO_PADDING: { base: 4, md: 6, lg: 8 },
    BUTTON_SPACING: 2,
  },
} as const;

// 타입 정의
export type SpacingValue = typeof SPACING[keyof typeof SPACING];
export type ColorValue = typeof COLORS[keyof typeof COLORS];
export type PaddingValue = typeof PADDING[keyof typeof PADDING];

