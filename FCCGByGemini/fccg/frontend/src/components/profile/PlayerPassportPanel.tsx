import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { User } from '../../store/auth';

type PlayerPassportPanelProps = {
  user: User;
  onEditProfile: () => void;
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: '총괄관리자',
  ADMIN: '관리자',
  MEMBER: '회원',
};

const formatJoinedDate = (value?: string) => {
  if (!value) return '가입일 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '가입일 정보 없음';
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}. 가입`;
};

export default function PlayerPassportPanel({
  user,
  onEditProfile,
}: PlayerPassportPanelProps) {
  const gameParticipated = user.gameDetails?.participated ?? 0;
  const gameTotal = user.gameDetails?.total ?? 0;
  const voteParticipated = user.voteDetails?.participated ?? 0;
  const voteTotal = user.voteDetails?.total ?? 0;
  const attendanceRate =
    gameTotal > 0 ? Math.round((gameParticipated / gameTotal) * 100) : null;
  const voteRate =
    voteTotal > 0 ? Math.round((voteParticipated / voteTotal) * 100) : null;
  const voteSessions = [...(user.voteDetails?.sessions || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  let consecutiveVotes = 0;
  for (const session of voteSessions) {
    if (!session.userParticipated) break;
    consecutiveVotes += 1;
  }
  const latestVote = voteSessions[0] || null;

  const statItems = [
    {
      label: '경기 출석',
      value: attendanceRate === null ? '기록 없음' : `${attendanceRate}%`,
      detail: gameTotal > 0 ? `${gameParticipated}/${gameTotal}경기` : '참여 기록이 쌓이면 표시됩니다',
    },
    {
      label: '투표 참여',
      value: voteRate === null ? '기록 없음' : `${voteRate}%`,
      detail: voteTotal > 0 ? `${voteParticipated}/${voteTotal}회` : '투표 기록이 쌓이면 표시됩니다',
    },
  ];
  const activityItems = [
    { label: '참석 경기', value: `${gameParticipated}회` },
    { label: '투표 참여', value: `${voteParticipated}회` },
    { label: '연속 투표', value: `${consecutiveVotes}회` },
  ];

  return (
    <VStack align="stretch" spacing={6} color="#0F172A">
      <Box
        bg="linear-gradient(135deg, #052B57 0%, #0057B8 62%, #0B78D0 100%)"
        borderRadius="2xl"
        px={5}
        py={6}
        color="white"
        boxShadow="0 18px 45px rgba(0, 78, 168, 0.22)"
      >
        <HStack spacing={4} align="center">
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="lg"
            bg="white"
            color="#0057B8"
            fontWeight="900"
            border="3px solid rgba(255,255,255,0.72)"
          />
          <VStack align="start" spacing={1} minW={0}>
            <Badge
              bg="rgba(255,255,255,0.18)"
              color="white"
              borderRadius="full"
              px={2.5}
              py={1}
              fontSize="xs"
            >
              PLAYER PASSPORT
            </Badge>
            <Text fontSize="2xl" fontWeight="900" noOfLines={1}>
              {user.name}
            </Text>
            <Text color="rgba(255,255,255,0.86)" fontSize="sm">
              {roleLabel[user.role] || '회원'} · {formatJoinedDate(user.createdAt)}
            </Text>
          </VStack>
        </HStack>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="800" color="#334155" mb={3}>
          MY RECORD
        </Text>
        <SimpleGrid columns={2} spacing={3}>
          {statItems.map((item) => (
            <Box
              key={item.label}
              bg="#EFF6FF"
              border="1px solid"
              borderColor="#BFDBFE"
              borderRadius="xl"
              px={4}
              py={4}
              minH="132px"
            >
              <Text color="#334155" fontSize="sm" fontWeight="700">
                {item.label}
              </Text>
              <Text
                mt={2}
                color="#064A96"
                fontSize={item.value === '기록 없음' ? 'lg' : '3xl'}
                fontWeight="900"
                letterSpacing="-0.03em"
              >
                {item.value}
              </Text>
              <Text mt={1} color="#475569" fontSize="xs" lineHeight="1.45">
                {item.detail}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Box>
        <Text fontSize="sm" fontWeight="800" color="#334155" mb={3}>
          ACTIVITY SNAPSHOT
        </Text>
        <SimpleGrid columns={3} spacing={2}>
          {activityItems.map((item) => (
            <Box
              key={item.label}
              bg="white"
              border="1px solid"
              borderColor="#CBD5E1"
              borderRadius="xl"
              py={3}
              px={2}
              textAlign="center"
            >
              <Text color="#64748B" fontSize="xs" fontWeight="700">
                {item.label}
              </Text>
              <Text mt={1} color="#0F172A" fontSize="lg" fontWeight="900">
                {item.value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
        <HStack
          mt={3}
          bg={latestVote?.userParticipated ? '#ECFDF5' : '#FFF7ED'}
          border="1px solid"
          borderColor={latestVote?.userParticipated ? '#A7F3D0' : '#FED7AA'}
          borderRadius="xl"
          px={4}
          py={3}
          justify="space-between"
        >
          <Text color="#475569" fontSize="sm" fontWeight="700">
            최근 투표
          </Text>
          <Badge
            bg={latestVote?.userParticipated ? '#047857' : '#C2410C'}
            color="white"
            borderRadius="full"
            px={2.5}
            py={1}
          >
            {!latestVote
              ? '기록 없음'
              : latestVote.userParticipated
                ? '참여 완료'
                : '미참여'}
          </Badge>
        </HStack>
      </Box>

      <Divider borderColor="#CBD5E1" />

      <Box>
        <Text fontSize="sm" fontWeight="800" color="#334155" mb={2}>
          ACCOUNT
        </Text>
        <Text fontSize="sm" color="#475569" wordBreak="break-all">
          {user.email}
        </Text>
      </Box>

      <Button
        bg="#0057B8"
        color="white"
        _hover={{ bg: '#003F86' }}
        _focusVisible={{ boxShadow: '0 0 0 3px rgba(0,87,184,0.28)' }}
        onClick={onEditProfile}
      >
        내 정보 수정
      </Button>
    </VStack>
  );
}
