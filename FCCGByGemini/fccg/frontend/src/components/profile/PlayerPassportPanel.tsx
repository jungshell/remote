import { Box, Button, Flex, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { MdOutlineEdit, MdOutlineEmail } from 'react-icons/md';
import type { User } from '../../store/auth';
import { PanelHeader, RecordTile } from '../admin/MatchDay';
import PlayerIdentity, { getPlayerRecord } from './PlayerIdentity';

const DAY_INDEX: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

// "10월 14일(수) 외 2일" / "불참" — 세션 주(월요일) 기준으로 요일 코드를 날짜로 바꾼다
const formatVoteSummary = (weekStartDate: string, selectedDays: string[] = []) => {
  if (selectedDays.includes('불참')) return '불참';
  const dates = selectedDays
    .filter((d) => d in DAY_INDEX)
    .sort((a, b) => DAY_INDEX[a] - DAY_INDEX[b])
    .map((d) => {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + DAY_INDEX[d]);
      return `${date.getMonth() + 1}월 ${date.getDate()}일(${WEEKDAY_KO[date.getDay()]})`;
    });
  if (dates.length === 0) return '참여';
  return dates.length > 1 ? `${dates[0]} 외 ${dates.length - 1}일` : dates[0];
};

type PlayerPassportPanelProps = {
  user: User;
  onEditProfile: () => void;
};

export default function PlayerPassportPanel({
  user,
  onEditProfile,
}: PlayerPassportPanelProps) {
  const { gameParticipated, gameTotal, voteParticipated, voteTotal, attendanceRate, voteRate, consecutiveVotes, latestVote } = getPlayerRecord(user);

  return (
    <VStack className="fccg-matchday fccg-member" align="stretch" spacing={6} color="gray.900">
      <PlayerIdentity user={user} eyebrow="PLAYER PASSPORT" />

      <Box>
        <PanelHeader label="MY RECORD" title="내 기록" />
        <SimpleGrid columns={2} spacing={3}>
          <RecordTile
            accent
            label="경기 출석"
            value={attendanceRate === null ? '—' : attendanceRate}
            unit={attendanceRate === null ? undefined : '%'}
            caption={gameTotal > 0 ? `${gameParticipated}/${gameTotal}경기` : '참여 기록이 쌓이면 표시됩니다'}
          />
          <RecordTile
            accent
            label="투표 참여"
            value={voteRate === null ? '—' : voteRate}
            unit={voteRate === null ? undefined : '%'}
            caption={voteTotal > 0 ? `${voteParticipated}/${voteTotal}회` : '투표 기록이 쌓이면 표시됩니다'}
          />
        </SimpleGrid>
      </Box>

      <Box>
        <PanelHeader label="ACTIVITY" title="활동 요약" />
        <SimpleGrid columns={3} spacing={2}>
          <RecordTile label="참석 경기" value={gameParticipated} unit="회" px={3} />
          <RecordTile label="투표 참여" value={voteParticipated} unit="회" px={3} />
          <RecordTile label="연속 투표" value={consecutiveVotes} unit="회" px={3} />
        </SimpleGrid>
        <Flex
          mt={3}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          px={4}
          py={3}
          justify="space-between"
          align="center"
        >
          <Box minW={0}>
            <Text color="gray.600" fontSize="sm" fontWeight="700">최근 투표</Text>
            {latestVote?.userParticipated && (
              <Text fontSize="xs" color="gray.500" mt={0.5} noOfLines={1}>
                {formatVoteSummary(latestVote.weekStartDate, latestVote.selectedDays)}
                {latestVote.isActive ? ' · 이번주 투표' : ''}
              </Text>
            )}
          </Box>
          {(() => {
            const tone = !latestVote
              ? { label: '기록 없음', bg: 'gray.100', color: 'gray.600', border: 'transparent' }
              : latestVote.userParticipated
                ? { label: '참여 완료', bg: 'green.50', color: 'green.700', border: 'green.100' }
                : latestVote.isActive
                  ? { label: '투표 진행 중', bg: 'brand.50', color: 'brand.600', border: 'brand.100' }
                  : { label: '미참여', bg: 'orange.50', color: 'orange.700', border: 'orange.100' };
            return (
              <Box as="span" flexShrink={0} px={2} py="2px" borderRadius="sm" bg={tone.bg} color={tone.color} border="1px solid" borderColor={tone.border} fontSize="11px" fontWeight="700">
                {tone.label}
              </Box>
            );
          })()}
        </Flex>
      </Box>

      <HStack spacing={2} color="gray.500" px={1}>
        <Icon as={MdOutlineEmail} boxSize="14px" flexShrink={0} />
        <Text fontSize="sm" wordBreak="break-all">{user.email}</Text>
      </HStack>

      <Button
        h="48px"
        bg="brand.500"
        color="white"
        borderRadius="lg"
        _hover={{ bg: 'brand.600' }}
        _focusVisible={{ boxShadow: '0 0 0 3px rgba(0,78,168,0.28)' }}
        leftIcon={<Icon as={MdOutlineEdit} boxSize="16px" />}
        onClick={onEditProfile}
      >
        내 정보 수정
      </Button>
    </VStack>
  );
}
