import React from 'react';
import { Box, Flex, Icon, SimpleGrid, Text, type BoxProps } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

// Match Day 비주얼 레이어 공통 조각: 경기장 라인, 임시 엠블럼, 날짜 블록, 스탯 블록, LIVE 점.

export const EASE_EXPO_OUT = 'cubic-bezier(.16,1,.3,1)';

const livePulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .35; transform: scale(.7); }
`;

// 경기장 라인 모티프 (터치라인·하프라인·센터서클·페널티박스). 부모는 position: relative 여야 한다.
export const PitchLines: React.FC<{ opacity?: number; color?: string }> = ({ opacity = 0.09, color = '#ffffff' }) => (
  <Box
    as="svg"
    viewBox="0 0 1200 400"
    preserveAspectRatio="xMidYMid slice"
    position="absolute"
    inset={0}
    w="100%"
    h="100%"
    pointerEvents="none"
    aria-hidden="true"
    opacity={opacity}
  >
    <g fill="none" stroke={color} strokeWidth="2">
      <rect x="20" y="20" width="1160" height="360" />
      <line x1="600" y1="20" x2="600" y2="380" />
      <circle cx="600" cy="200" r="70" />
      <circle cx="600" cy="200" r="4" fill={color} />
      <rect x="20" y="100" width="150" height="200" />
      <rect x="20" y="150" width="55" height="100" />
      <rect x="1030" y="100" width="150" height="200" />
      <rect x="1125" y="150" width="55" height="100" />
      <path d="M170 160 A 60 60 0 0 1 170 240" />
      <path d="M1030 160 A 60 60 0 0 0 1030 240" />
    </g>
  </Box>
);

// TEMPORARY: 최종 FC CGG 엠블럼 asset이 프로젝트에 없어서 만든 로컬 프로토타입용 CGG 모노그램 방패.
// 운영 배포용 final asset이 아니다 — 공식 엠블럼 파일이 준비되면 교체한다.
export const CggShieldTemp: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <Box as="svg" viewBox="0 0 64 74" w={`${size}px`} h={`${size * 74 / 64}px`} flexShrink={0} aria-label="FC CGG (임시 엠블럼)" role="img">
    <path d="M32 2.5 L59 10 V35 C59 52.5 47 64.5 32 71 C17 64.5 5 52.5 5 35 V10 Z" fill="#004EA8" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M32 8 L54 14 V35 C54 49.5 44.5 59.5 32 65 C19.5 59.5 10 49.5 10 35 V14 Z" fill="none" stroke="#ffffff" strokeOpacity=".28" strokeWidth="1" />
    <path d="M5.9 27 L58.1 17 V23.5 L5.9 33.5 Z" fill="#D7FF3A" />
    <text x="32" y="52" textAnchor="middle" fontFamily="'Bahnschrift SemiCondensed', 'Arial Narrow', sans-serif" fontWeight="700" fontSize="17" fill="#ffffff" letterSpacing="0.5">CGG</text>
  </Box>
);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// 큰 날짜 블록: 10 / OCT / SAT
export const DateBlock: React.FC<{ date: Date } & BoxProps> = ({ date, ...rest }) => {
  const weekday = date.getDay();
  return (
    <Box bg="white" color="matchday.navy" borderRadius="md" px={4} py={3} minW="92px" textAlign="center" {...rest}>
      <Text textStyle="scoreLabel" color="brand.500">{MONTHS[date.getMonth()]}</Text>
      <Text textStyle="statNumber" fontSize="56px" my={1}>{String(date.getDate()).padStart(2, '0')}</Text>
      <Text textStyle="scoreLabel" color={weekday === 0 ? 'red.500' : weekday === 6 ? 'brand.500' : 'gray.500'}>
        {WEEKDAYS[weekday]}
      </Text>
    </Box>
  );
};

// 스코어보드 스탯 블록 (어두운 배경 위)
// compact: 한 줄 3칸처럼 좁은 칸용 — 모바일(base)에서만 여백·글자를 줄이고 md 이상은 기본과 같다.
export const StatBlock: React.FC<{
  label: string;
  caption: string;
  value: React.ReactNode;
  unit?: string;
  highlight?: boolean;
  compact?: boolean;
}> = ({ label, caption, value, unit, highlight, compact }) => (
  <Box px={{ base: compact ? 3 : 4, md: 6 }} py={{ base: 4, md: 5 }} minW={0}>
    <Flex align="center" gap={compact ? 1.5 : 2}>
      {highlight && <LiveDot />}
      <Text textStyle="scoreLabel" {...(compact ? { fontSize: { base: '9px', md: '0.6875rem' }, letterSpacing: { base: '0.1em', md: '0.14em' } } : {})} color={highlight ? 'matchday.volt' : 'whiteAlpha.600'} noOfLines={1}>{label}</Text>
    </Flex>
    <Flex align="baseline" gap={compact ? 1 : 1.5} mt={compact ? 1.5 : 2}>
      <Text textStyle="statNumber" fontSize={{ base: compact ? '40px' : '48px', md: '64px' }} color={highlight ? 'matchday.volt' : 'white'}>
        {value}
      </Text>
      {unit && <Text fontSize={compact ? { base: 'xs', md: 'sm' } : 'sm'} fontWeight="semibold" color="whiteAlpha.600">{unit}</Text>}
    </Flex>
    <Text fontSize={compact ? { base: '11px', md: 'xs' } : 'xs'} color="whiteAlpha.700" mt={1} noOfLines={1}>{caption}</Text>
  </Box>
);

export const LiveDot: React.FC<{ color?: string }> = ({ color = 'matchday.volt' }) => (
  <Box
    as="span"
    display="inline-block"
    w="7px"
    h="7px"
    borderRadius="full"
    bg={color}
    flexShrink={0}
    animation={`${livePulse} 1.6s ease-in-out infinite`}
    sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
  />
);

// 섹션 헤더: 모노 라벨 + 한글 제목
export const PanelHeader: React.FC<{ label: string; title: string; right?: React.ReactNode }> = ({ label, title, right }) => (
  <Flex justify="space-between" align="flex-end" gap={3} mb={4} wrap="wrap">
    <Box>
      <Text fontSize="lg" fontWeight="800" color="matchday.navy" letterSpacing="-0.01em">{title}</Text>
      <Text textStyle="scoreLabel" fontSize="10px" color="brand.500" mt={1}>{label}</Text>
    </Box>
    {right}
  </Flex>
);

// ── 관리자 하위 화면 공통 ─────────────────────────────────────────────

// 페이지 헤더: 모노 eyebrow + 큰 한글 제목 + 설명 + 우측 액션 슬롯
export const AdminPageHeader: React.FC<{ eyebrow: string; title: string; description?: string; right?: React.ReactNode }> = ({ eyebrow, title, description, right }) => (
  <Flex justify="space-between" align={{ base: 'stretch', sm: 'flex-end' }} direction={{ base: 'column', sm: 'row' }} gap={3}>
    <Box minW={0}>
      <Flex align="center" gap={2}>
        <Box w="16px" h="3px" bg="brand.500" borderRadius="full" />
        <Text textStyle="scoreLabel" color="brand.500">{eyebrow}</Text>
      </Flex>
      <Text fontSize={{ base: '26px', md: '32px' }} fontWeight="800" color="matchday.navy" letterSpacing="-0.02em" lineHeight="1.15" mt={2}>{title}</Text>
      {description && <Text fontSize="sm" color="gray.500" mt={1}>{description}</Text>}
    </Box>
    {right && <Flex gap={2} flexShrink={0} wrap="wrap">{right}</Flex>}
  </Flex>
);

// 흰색 패널: 대시보드 패널과 같은 radius·테두리·여백 (그림자 없음)
export const AdminPanel: React.FC<{ label?: string; title?: string; right?: React.ReactNode } & BoxProps> = ({ label, title, right, children, ...rest }) => (
  <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={{ base: 4, md: 6 }} {...rest}>
    {label && title && <PanelHeader label={label} title={title} right={right} />}
    {children}
  </Box>
);

// 남색 스코어보드 스트립: StatBlock을 children으로 받는다. 4칸은 모바일 2x2, 3칸 이하는 항상 한 줄.
export const StatStrip: React.FC<{ children: React.ReactNode; columns: 3 | 4 }> = ({ children, columns }) => (
  <Box position="relative" overflow="hidden" bg="matchday.navy" borderRadius="xl" color="white">
    <PitchLines opacity={0.07} />
    <SimpleGrid
      position="relative"
      columns={columns === 4 ? { base: 2, lg: 4 } : columns}
      sx={columns === 4 ? {
        '& > *': { borderColor: 'whiteAlpha.200' },
        '& > *:nth-of-type(odd)': { borderRightWidth: '1px' },
        '& > *:nth-of-type(-n+2)': { borderBottomWidth: { base: '1px', lg: 0 } },
        '@media (min-width: 62em)': { '& > *:not(:last-of-type)': { borderRightWidth: '1px' } },
      } : {
        '& > *': { borderColor: 'whiteAlpha.200', minW: 0 },
        '& > *:not(:last-of-type)': { borderRightWidth: '1px' },
      }}
    >
      {children}
    </SimpleGrid>
  </Box>
);

// 상태 배지: 회원 등급·회원 상태·경기 유형·확정 대기를 하나의 색상 규칙으로.
// Volt는 pending(실제 처리 대기)에만 쓴다.
type BadgeTone = { label: string; bg: string; color: string; borderColor?: string };
const NEUTRAL_TONE = { bg: 'gray.100', color: 'gray.600' };
const STATUS_BADGE_MAP = {
  role: {
    SUPER_ADMIN: { label: '슈퍼관리자', bg: 'matchday.navy', color: 'white' },
    ADMIN: { label: '관리자', bg: 'brand.50', color: 'brand.600', borderColor: 'brand.100' },
    MEMBER: { label: '회원', ...NEUTRAL_TONE },
  },
  status: {
    ACTIVE: { label: '활성', bg: 'green.50', color: 'green.700', borderColor: 'green.100' },
    INACTIVE: { label: '비활성', ...NEUTRAL_TONE },
    SUSPENDED: { label: '정지', bg: 'orange.50', color: 'orange.700', borderColor: 'orange.100' },
    DELETED: { label: '삭제됨', bg: 'transparent', color: 'gray.400', borderColor: 'gray.300' },
  },
  eventType: {
    매치: { label: '매치', bg: 'brand.500', color: 'white' },
    자체: { label: '자체', bg: 'matchday.navy', color: 'white' },
    회식: { label: '회식', bg: 'orange.50', color: 'orange.700', borderColor: 'orange.100' },
  },
  pending: {
    PENDING: { label: '확정 필요', bg: 'matchday.volt', color: 'matchday.navy' },
  },
  voteSession: {
    ACTIVE: { label: '진행중', bg: 'brand.500', color: 'white' },
    COMPLETED: { label: '완료', bg: 'brand.50', color: 'brand.600', borderColor: 'brand.100' },
    WAITING: { label: '대기', ...NEUTRAL_TONE },
  },
  toggle: {
    ON: { label: 'ON', bg: 'brand.500', color: 'white' },
    OFF: { label: 'OFF', ...NEUTRAL_TONE },
  },
  delivery: {
    SENT: { label: '발송됨', bg: 'green.50', color: 'green.700', borderColor: 'green.100' },
    FAILED: { label: '실패', bg: 'red.50', color: 'red.700', borderColor: 'red.100' },
    PENDING: { label: '대기', ...NEUTRAL_TONE },
  },
} satisfies Record<string, Record<string, BadgeTone>>;

export type StatusBadgeKind = keyof typeof STATUS_BADGE_MAP;

export const StatusBadge: React.FC<{ kind: StatusBadgeKind; value?: string | null }> = ({ kind, value }) => {
  const tones: Record<string, BadgeTone> = STATUS_BADGE_MAP[kind];
  const tone = (value && tones[value]) || { label: value || '알 수 없음', ...NEUTRAL_TONE };
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py="2px"
      borderRadius="sm"
      border="1px solid"
      borderColor={tone.borderColor || 'transparent'}
      bg={tone.bg}
      color={tone.color}
      fontSize="11px"
      fontWeight="700"
      lineHeight="1.5"
      whiteSpace="nowrap"
    >
      {tone.label}
    </Box>
  );
};

// 모달/패널 헤더: 남색 + 경기장 라인 + Volt 모노 라벨 + 제목 (닫기 버튼 자리만큼 우측 여백)
export const MatchDayModalHeader: React.FC<{ label: string; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode } & BoxProps> = ({ label, title, subtitle, right, ...rest }) => (
  <Box className="fccg-matchday" position="relative" overflow="hidden" bg="matchday.navy" color="white" px={{ base: 5, md: 6 }} pt={4} pb={3.5} {...rest}>
    <PitchLines opacity={0.08} />
    <Flex position="relative" align="center" gap={3} pr={8}>
      <Box minW={0} flex={1}>
        <Text textStyle="scoreLabel" fontSize="10px" color="matchday.volt">{label}</Text>
        <Text fontSize="md" fontWeight="800" mt={1} lineHeight="1.3">{title}</Text>
        {subtitle && <Text fontSize="xs" color="whiteAlpha.700" mt={0.5}>{subtitle}</Text>}
      </Box>
      {right}
    </Flex>
  </Box>
);

// 밝은 배경용 기록 타일: 한글 라벨 + statNumber 값 + 캡션. 회원 화면(선수 패널·프로필·홈 통계)에서 공통 사용.
export const RecordTile: React.FC<{
  label: string;
  value: React.ReactNode;
  unit?: string | undefined;
  caption?: string | undefined;
  accent?: boolean | undefined;
} & BoxProps> = ({ label, value, unit, caption, accent, ...rest }) => (
  <Box
    bg={accent ? 'brand.50' : 'white'}
    border="1px solid"
    borderColor={accent ? 'brand.100' : 'gray.200'}
    borderRadius="lg"
    px={4}
    py={3.5}
    minW={0}
    {...rest}
  >
    <Text fontSize="xs" fontWeight="700" color={accent ? 'brand.600' : 'gray.500'} noOfLines={1}>{label}</Text>
    <Flex align="baseline" gap={1} mt={1.5}>
      <Text textStyle="statNumber" fontSize={{ base: '32px', md: '36px' }} color={accent ? 'brand.600' : 'matchday.navy'}>{value}</Text>
      {unit && <Text fontSize="xs" fontWeight="700" color="gray.500">{unit}</Text>}
    </Flex>
    {caption && <Text fontSize="xs" color="gray.500" mt={1} lineHeight="1.4" noOfLines={2}>{caption}</Text>}
  </Box>
);

// 빈 상태: 남색 아이콘 원 + 제목 + 설명 + 선택 액션
export const AdminEmptyState: React.FC<{ icon: React.ElementType; title: string; description?: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <Flex direction="column" align="center" textAlign="center" gap={2} px={6} py={{ base: 10, md: 14 }}>
    <Flex align="center" justify="center" w={12} h={12} borderRadius="full" bg="matchday.navy" mb={1}>
      <Icon as={icon} boxSize={5} color="white" />
    </Flex>
    <Text fontWeight="800" fontSize="md" color="matchday.navy">{title}</Text>
    {description && <Text fontSize="sm" color="gray.500">{description}</Text>}
    {action && <Box mt={2}>{action}</Box>}
  </Flex>
);
