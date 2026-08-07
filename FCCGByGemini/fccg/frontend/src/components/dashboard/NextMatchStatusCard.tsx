import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import {
  MdCheckCircle,
  MdDateRange,
  MdEventBusy,
  MdFreeBreakfast,
  MdHowToVote,
  MdSchedule,
} from 'react-icons/md';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NextMatchState =
  | 'VOTE_REQUIRED'
  | 'VOTED'
  | 'ANON_VOTE'
  | 'NO_GAME_THIS_WEEK'
  | 'SCHEDULING';

export interface NextMatchStatusCardProps {
  state: NextMatchState;
  votedCount: number;
  totalMembers: number;
  deadlineDaysLeft: number | null;
  lastGameLabel: string | null;
  onVote: () => void;
  onViewVote: () => void;
  onViewSchedule: () => void;
  onLogin: () => void;
}

// ── Animations ────────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
`;

const pillPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.025); }
`;

// ── Pill ──────────────────────────────────────────────────────────────────────

type PillCfg = {
  label: string;
  color: string;
  bg: string;
  border: string;
  pulse: boolean;
  Icon: React.ElementType;
};

const PILL: Record<NextMatchState, PillCfg> = {
  VOTE_REQUIRED: {
    label: '투표중',
    color: '#7CEBFF',
    bg: 'rgba(124,235,255,0.14)',
    border: 'rgba(124,235,255,0.38)',
    pulse: true,
    Icon: MdHowToVote,
  },
  VOTED: {
    label: '투표완료',
    color: '#86EFAC',
    bg: 'rgba(74,222,128,0.14)',
    border: 'rgba(74,222,128,0.32)',
    pulse: false,
    Icon: MdCheckCircle,
  },
  ANON_VOTE: {
    label: '투표중',
    color: '#7CEBFF',
    bg: 'rgba(124,235,255,0.14)',
    border: 'rgba(124,235,255,0.38)',
    pulse: true,
    Icon: MdHowToVote,
  },
  NO_GAME_THIS_WEEK: {
    label: '이번주 휴식',
    color: '#CBD5E1',
    bg: 'rgba(148,163,184,0.14)',
    border: 'rgba(148,163,184,0.32)',
    pulse: false,
    Icon: MdFreeBreakfast,
  },
  SCHEDULING: {
    label: '일정조율',
    color: '#FCD34D',
    bg: 'rgba(251,191,36,0.14)',
    border: 'rgba(251,191,36,0.32)',
    pulse: false,
    Icon: MdDateRange,
  },
};

export function NextMatchPill({ state }: { state: NextMatchState }) {
  const cfg = PILL[state];
  const { Icon } = cfg;
  return (
    <Box
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontSize="10px"
      fontWeight="800"
      letterSpacing="0.06em"
      bg={cfg.bg}
      color={cfg.color}
      border={`1px solid ${cfg.border}`}
      flexShrink={0}
      display="inline-flex"
      alignItems="center"
      sx={
        cfg.pulse
          ? {
              gap: '3px',
              animation: `${pillPulse} 3s ease-in-out infinite`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }
          : { gap: '3px' }
      }
    >
      <Icon size={10} />
      {cfg.label}
    </Box>
  );
}

// ── Watermark icon map ─────────────────────────────────────────────────────────

const ICON_MAP: Record<NextMatchState, React.ElementType> = {
  VOTE_REQUIRED:     MdHowToVote,
  VOTED:             MdCheckCircle,
  ANON_VOTE:         MdHowToVote,
  NO_GAME_THIS_WEEK: MdEventBusy,
  SCHEDULING:        MdSchedule,
};

// ── Content config ─────────────────────────────────────────────────────────────

type ContentCfg = { title1: string; title2: string; desc: string; cta: string | null };

function getContent(state: NextMatchState): ContentCfg {
  switch (state) {
    case 'VOTE_REQUIRED':
      return {
        title1: '다음주 경기',
        title2: '투표중',
        desc: '참석 가능한 요일을 선택해주세요.\n투표 마감 후 경기 일정이 확정됩니다.',
        cta: '투표 참여하기',
      };
    case 'VOTED':
      return {
        title1: '다음주 경기',
        title2: '투표 완료',
        desc: '투표를 완료했어요.\n다른 회원들의 응답을 기다리고 있습니다.',
        cta: '투표 현황 보기',
      };
    case 'ANON_VOTE':
      return {
        title1: '다음주 경기',
        title2: '투표 진행중',
        desc: '로그인하면 투표에 참여할 수 있습니다.',
        cta: '로그인하고 투표하기',
      };
    case 'NO_GAME_THIS_WEEK':
      return {
        title1: '이번주',
        title2: '경기 없음',
        desc: '이번 주는 정규 경기가 없습니다.\n다음 일정이 등록되면 바로 알려드릴게요.',
        cta: '경기 일정 보기',
      };
    case 'SCHEDULING':
      return {
        title1: '다음 경기',
        title2: '일정 조율 중',
        desc: '다음 경기 일정을 준비하고 있습니다.\n확정되는 즉시 알려드릴게요.',
        cta: null,
      };
  }
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function VoteProgressBar({
  votedCount,
  totalMembers,
  state,
}: {
  votedCount: number;
  totalMembers: number;
  state: NextMatchState;
}) {
  const pct = totalMembers > 0 ? Math.round((votedCount / totalMembers) * 100) : 0;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(pct);
      return;
    }
    const duration = 800;
    const start = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const ratio = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setProgress(Math.round(eased * pct));
      if (ratio < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const isVoted = state === 'VOTED';
  const barBg = isVoted ? '#4ADE80' : 'linear-gradient(90deg, #60C5FF 0%, #7CEBFF 100%)';
  const pctColor = isVoted ? '#86EFAC' : '#7CEBFF';

  return (
    <Box w="full">
      {/* Large animated % with label */}
      <Text
        fontSize="3xl"
        fontWeight="900"
        letterSpacing="-0.04em"
        lineHeight="1"
        color={pctColor}
        mb={1.5}
      >
        <Text as="span" fontSize="xs" fontWeight="600" letterSpacing="0.01em" opacity={0.75} mr={1}>참여율</Text>
        {progress}%
      </Text>

      {/* Bar */}
      <Box w="full" h="4px" bg="rgba(255,255,255,0.11)" borderRadius="full" overflow="hidden">
        <Box
          h="full"
          w={`${progress}%`}
          bg={barBg}
          borderRadius="full"
        />
      </Box>

      {/* Participant count */}
      <Text
        mt={1}
        fontSize="10px"
        fontWeight="700"
        color="rgba(255,255,255,0.55)"
        letterSpacing="0.04em"
      >
        {votedCount} / {totalMembers}명 참여
      </Text>
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NextMatchStatusCard({
  state,
  votedCount,
  totalMembers,
  deadlineDaysLeft,
  lastGameLabel,
  onVote,
  onViewVote,
  onViewSchedule,
  onLogin,
}: NextMatchStatusCardProps) {
  const IconComp = ICON_MAP[state];
  const content = getContent(state);
  const showProgress =
    (state === 'VOTE_REQUIRED' || state === 'VOTED' || state === 'ANON_VOTE') && totalMembers > 0;
  const showDeadline =
    (state === 'VOTE_REQUIRED' || state === 'VOTED' || state === 'ANON_VOTE') &&
    deadlineDaysLeft !== null;
  const showLastGame =
    (state === 'NO_GAME_THIS_WEEK' || state === 'SCHEDULING') && !!lastGameLabel;

  const descLines = content.desc.split('\n');

  function handleCta() {
    if (state === 'VOTE_REQUIRED') onVote();
    else if (state === 'VOTED') onViewVote();
    else if (state === 'ANON_VOTE') onLogin();
    else if (state === 'NO_GAME_THIS_WEEK') onViewSchedule();
  }

  return (
    <VStack
      align="start"
      spacing={0}
      position="relative"
      zIndex={1}
      w="full"
      flex="1"
      mt={3}
      sx={{
        animation: `${fadeUp} 400ms ease-out both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {/* Watermark icon */}
      <Box
        position="absolute"
        bottom="-4px"
        right="-2px"
        opacity={0.08}
        pointerEvents="none"
        color="white"
        sx={{
          animation: `${float} 4s ease-in-out infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <IconComp size={96} />
      </Box>

      {/* Title */}
      <Text
        fontSize={{ base: '2xl', lg: '3xl' }}
        fontWeight="900"
        letterSpacing="-0.04em"
        lineHeight="1.12"
        color="white"
      >
        {content.title1}
        <br />
        {content.title2}
      </Text>

      {/* Description with visual hierarchy */}
      <Box mt={3}>
        {descLines[0] && (
          <Text fontSize="sm" color="rgba(255,255,255,0.75)" lineHeight="1.7">
            {descLines[0]}
          </Text>
        )}
        {descLines[1] && (
          <Text fontSize="xs" color="rgba(255,255,255,0.45)" lineHeight="1.7" mt={0.5}>
            {descLines[1]}
          </Text>
        )}
      </Box>

      {/* Sub-info */}
      {(showDeadline || showLastGame) && (
        <HStack mt={2} spacing={3} flexWrap="wrap" align="center">
          {showDeadline && (
            <Box
              px={2}
              py="2px"
              borderRadius="full"
              border="1px solid rgba(124,235,255,0.45)"
              bg="rgba(124,235,255,0.08)"
              fontSize="10px"
              fontWeight="800"
              color="#7CEBFF"
              letterSpacing="0.05em"
              lineHeight="1.6"
            >
              {deadlineDaysLeft === 0 ? '오늘 마감' : `D-${deadlineDaysLeft}`}
            </Box>
          )}
          {showLastGame && (
            <Text fontSize="xs" fontWeight="600" color="rgba(255,255,255,0.45)">
              최근 경기 · {lastGameLabel}
            </Text>
          )}
        </HStack>
      )}

      {/* Progress bar */}
      {showProgress && (
        <Box w="full" mt={3.5}>
          <VoteProgressBar votedCount={votedCount} totalMembers={totalMembers} state={state} />
          {state === 'VOTED' && (
            <Text mt={2} fontSize="xs" fontWeight="600" color="rgba(134,239,172,0.7)">
              ✔ 참여해주셔서 감사합니다.
            </Text>
          )}
        </Box>
      )}

      {/* CTA */}
      {content.cta && (
        <Box mt="auto" pt={5}>
          <Button
            size="sm"
            variant="unstyled"
            display="inline-flex"
            alignItems="center"
            px={4}
            py={2}
            h="auto"
            bg="rgba(255,255,255,0.09)"
            color="white"
            borderRadius="lg"
            border="1px solid rgba(255,255,255,0.18)"
            fontWeight="700"
            fontSize="sm"
            onClick={handleCta}
            transition="all 0.2s ease"
            _hover={{
              bg: 'rgba(255,255,255,0.15)',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
            }}
            sx={{
              '& .arrow': { display: 'inline-block', transition: 'transform 0.2s ease', marginLeft: '4px' },
              '&:hover .arrow': { transform: 'translateX(3px)' },
            }}
          >
            {content.cta}
            <Text as="span" className="arrow">&#8594;</Text>
          </Button>
        </Box>
      )}
    </VStack>
  );
}
