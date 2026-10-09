import { Avatar, Box, Flex, Text } from '@chakra-ui/react';
import type { User } from '../../store/auth';
import { PitchLines, reveal } from '../admin/MatchDay';

export const roleLabel: Record<string, string> = {
  SUPER_ADMIN: '총괄관리자',
  ADMIN: '관리자',
  MEMBER: '회원',
};

export const formatJoinedDate = (value?: string) => {
  if (!value) return '가입일 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '가입일 정보 없음';
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}. 가입`;
};

// 선수 기록 요약 (선수 패널·프로필 공통). 계산식은 기존 PlayerPassportPanel 그대로.
export const getPlayerRecord = (user: User) => {
  const gameParticipated = user.gameDetails?.participated ?? 0;
  const gameTotal = user.gameDetails?.total ?? 0;
  const voteParticipated = user.voteDetails?.participated ?? 0;
  const voteTotal = user.voteDetails?.total ?? 0;
  const attendanceRate =
    gameTotal > 0 ? Math.round((gameParticipated / gameTotal) * 100) : null;
  const voteRate =
    voteTotal > 0 ? Math.round((voteParticipated / voteTotal) * 100) : null;
  const voteSessions = [...(user.voteDetails?.sessions || [])].sort(
    (a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime(),
  );
  // 진행 중인데 아직 투표하지 않은 세션은 '미참여'가 아니므로 연속 기록 계산에서 건너뛴다
  const counted = voteSessions[0]?.isActive && !voteSessions[0].userParticipated ? voteSessions.slice(1) : voteSessions;
  let consecutiveVotes = 0;
  for (const session of counted) {
    if (!session.userParticipated) break;
    consecutiveVotes += 1;
  }
  const latestVote = voteSessions[0] || null;
  return { gameParticipated, gameTotal, voteParticipated, voteTotal, attendanceRate, voteRate, consecutiveVotes, latestVote };
};

// 선수 identity 카드 (Match Day 남색 + 경기장 라인). 선수 패널·프로필 상단에서 공통 사용.
export default function PlayerIdentity({ user, eyebrow }: { user: User; eyebrow: string }) {
  return (
    <Box position="relative" overflow="hidden" bg="matchday.navy" color="white" borderRadius="xl" px={5} py={{ base: 5, md: 6 }} sx={reveal(0)}>
      <PitchLines opacity={0.08} />
      {/* 선수 등록 카드: 등번호처럼 큰 이니셜 워터마크 + 상단 라임 라인 */}
      <Text
        aria-hidden="true"
        position="absolute"
        right={3}
        bottom="-28px"
        textStyle="statNumber"
        fontSize="132px"
        lineHeight="1"
        color="whiteAlpha.100"
        pointerEvents="none"
        userSelect="none"
      >
        {user.name?.charAt(0)}
      </Text>
      <Box position="absolute" left={0} right={0} top={0} h="3px" bg="matchday.volt" opacity={0.9} />
      <Flex position="relative" align="center" gap={4}>
        <Avatar
          name={user.name}
          {...(user.avatarUrl ? { src: user.avatarUrl } : {})}
          size="lg"
          bg="white"
          color="brand.500"
          fontWeight="900"
          border="3px solid"
          borderColor="whiteAlpha.700"
          flexShrink={0}
        />
        <Box minW={0}>
          <Flex align="center" gap={2}>
            <Box w="14px" h="3px" bg="matchday.volt" borderRadius="full" />
            <Text textStyle="scoreLabel" fontSize="10px" color="matchday.volt">{eyebrow}</Text>
          </Flex>
          <Text fontSize="2xl" fontWeight="800" letterSpacing="-0.02em" lineHeight="1.2" mt={1} noOfLines={1}>
            {user.name}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" mt={0.5} noOfLines={1}>
            {roleLabel[user.role] || '회원'} · {formatJoinedDate(user.createdAt)}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}
