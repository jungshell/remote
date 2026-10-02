import React from 'react';
import { Box, Flex, Text, type BoxProps } from '@chakra-ui/react';
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
export const StatBlock: React.FC<{
  label: string;
  caption: string;
  value: React.ReactNode;
  unit?: string;
  highlight?: boolean;
}> = ({ label, caption, value, unit, highlight }) => (
  <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }}>
    <Flex align="center" gap={2}>
      {highlight && <LiveDot />}
      <Text textStyle="scoreLabel" color={highlight ? 'matchday.volt' : 'whiteAlpha.600'}>{label}</Text>
    </Flex>
    <Flex align="baseline" gap={1.5} mt={2}>
      <Text textStyle="statNumber" fontSize={{ base: '48px', md: '64px' }} color={highlight ? 'matchday.volt' : 'white'}>
        {value}
      </Text>
      {unit && <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.600">{unit}</Text>}
    </Flex>
    <Text fontSize="xs" color="whiteAlpha.700" mt={1}>{caption}</Text>
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
