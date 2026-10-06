import { Box, Text, VStack, SimpleGrid, Flex } from '@chakra-ui/react';
import { PanelHeader, PitchLines } from './admin/MatchDay';

interface DayVoteResult {
  count: number;
  participants: Array<{
    userId: number;
    userName: string;
    votedAt: string;
  }>;
}

interface VoteResults {
  sessionId: number;
  weekStartDate: string;
  weekRange: string;
  isActive: boolean;
  isCompleted: boolean;
  results: {
    MON: DayVoteResult;
    TUE: DayVoteResult;
    WED: DayVoteResult;
    THU: DayVoteResult;
    FRI: DayVoteResult;
  };
  participants: Array<{
    userId: number;
    userName: string;
    selectedDays: string[];
    votedAt: string;
  }>;
  totalParticipants: number;
  totalVotes: number;
}

interface VoteChartsProps {
  voteResults: VoteResults;
}

/** selectedDays가 문자열·이중 JSON이면 배열로만 쓰기 (문자열 spread로 글자 깨짐 방지) */
function coerceSelectedDaysToArray(selectedDays: unknown): string[] {
  if (Array.isArray(selectedDays)) {
    return selectedDays.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof selectedDays !== 'string') return [];
  const raw = selectedDays.trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [raw];
  }
  let depth = 0;
  while (typeof parsed === 'string' && depth < 5) {
    const inner = (parsed as string).trim();
    if (!inner) return [];
    try {
      parsed = JSON.parse(inner);
      depth += 1;
    } catch {
      return [inner];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  if (typeof parsed === 'string' && parsed.length > 0) return [parsed];
  return [];
}

const WEEKDAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

export default function VoteCharts({ voteResults }: VoteChartsProps) {
  // 개발용 진단은 콘솔에만 남긴다 (운영 UI·운영 콘솔에는 노출하지 않음).
  if (import.meta.env.DEV) {
    console.debug('[VoteCharts]', { sessionId: voteResults?.sessionId, results: voteResults?.results });
  }

  if (!voteResults || !voteResults.weekStartDate || !voteResults.results) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500" fontSize="sm">투표 결과 데이터가 없습니다.</Text>
      </Box>
    );
  }

  const weekStartDate = new Date(voteResults.weekStartDate);
  const dayStats = WEEKDAY_KEYS.map((day, index) => {
    const data = voteResults.results[day];
    const currentDate = new Date(weekStartDate.getTime() + index * 24 * 60 * 60 * 1000);
    return {
      day,
      date: `${currentDate.getMonth() + 1}.${currentDate.getDate()}`,
      votes: data?.count ?? 0,
      participants: data?.participants?.map(p => p.userName).join(', ') || '',
    };
  });
  const maxVotes = Math.max(...dayStats.map(d => d.votes));
  const hasVoteData = maxVotes > 0;
  const absentCount = (voteResults.results as Record<string, DayVoteResult | undefined>)['불참']?.count ?? 0;

  const getSortValue = (dayStr: string) => {
    if (!dayStr) return Number.MAX_SAFE_INTEGER;

    const looseDigits = dayStr.match(/(\d{1,2})\D+(\d{1,2})/);
    if (looseDigits && (!dayStr.includes('월') || !dayStr.includes('일'))) {
      return parseInt(looseDigits[1], 10) * 100 + parseInt(looseDigits[2], 10);
    }

    const koreanMatch = dayStr.match(/(\d+)월 (\d+)일/);
    if (koreanMatch) {
      const month = parseInt(koreanMatch[1], 10);
      const day = parseInt(koreanMatch[2], 10);
      return month * 100 + day;
    }

    const dayMapping: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };
    const weekdayIndex = dayMapping[dayStr];
    if (typeof weekdayIndex === 'number') {
      const baseDate = new Date(voteResults.weekStartDate);
      const targetDate = new Date(baseDate.getTime() + weekdayIndex * 24 * 60 * 60 * 1000);
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();
      return month * 100 + day;
    }

    return Number.MAX_SAFE_INTEGER;
  };
 
  return (
    <VStack spacing={6} align="stretch">
      {/* 요일별 득표: 스코어보드 스탯 행. 최다 득표 요일(동률 포함)은 모두 Volt 강조 */}
      <Box>
        <Box position="relative" overflow="hidden" bg="matchday.navy" borderRadius="xl" color="white">
          <PitchLines opacity={0.07} />
          <SimpleGrid position="relative" columns={5} sx={{ '& > *:not(:last-of-type)': { borderRightWidth: '1px', borderColor: 'whiteAlpha.200' } }}>
            {dayStats.map(({ day, date, votes, participants }) => {
              const isTop = hasVoteData && votes === maxVotes;
              return (
                <Box key={day} px={{ base: 2, md: 5 }} py={{ base: 4, md: 5 }} minW={0} title={participants ? `참여자: ${participants}` : undefined}>
                  <Text textStyle="scoreLabel" color={isTop ? 'matchday.volt' : 'whiteAlpha.600'}>{day}</Text>
                  <Text fontSize={{ base: '11px', md: 'xs' }} color="whiteAlpha.700" mt={0.5}>{date}</Text>
                  <Flex align="baseline" gap={1} mt={2}>
                    <Text textStyle="statNumber" fontSize={{ base: '32px', md: '56px' }} color={isTop ? 'matchday.volt' : 'white'}>{votes}</Text>
                    <Text fontSize="xs" fontWeight="semibold" color="whiteAlpha.600" display={{ base: 'none', md: 'block' }}>명</Text>
                  </Flex>
                  <Box h="4px" bg="whiteAlpha.200" borderRadius="full" mt={3} overflow="hidden">
                    <Box h="100%" w={`${hasVoteData ? (votes / maxVotes) * 100 : 0}%`} bg={isTop ? 'matchday.volt' : 'brand.300'} borderRadius="full" />
                  </Box>
                  <Text fontSize="10px" fontWeight="700" color="matchday.volt" mt={2} visibility={isTop ? 'visible' : 'hidden'} noOfLines={1}>최다 득표</Text>
                </Box>
              );
            })}
          </SimpleGrid>
        </Box>
        <Flex justify="space-between" gap={2} mt={2} px={1} wrap="wrap">
          <Text fontSize="xs" color="gray.500">{hasVoteData ? '막대 길이는 최다 득표 대비 비율입니다.' : '아직 투표 데이터가 없습니다.'}</Text>
          <Text fontSize="xs" color="gray.500">참여 {voteResults.participants.length}명{absentCount > 0 ? ` · 불참 ${absentCount}명` : ''}</Text>
        </Flex>
      </Box>

      {/* 참여자별 투표 현황 */}
      <Box>
        <PanelHeader label="PARTICIPANTS" title="참여자별 투표 현황" />
        {voteResults.participants.length === 0 && (
          <Text fontSize="sm" color="gray.500">아직 참여한 회원이 없습니다.</Text>
        )}
        <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6, xl: 8 }} spacing={2}>
          {voteResults.participants.map((participant) => (
            <VStack
              key={participant.userId}
              py={2}
              px={2}
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              spacing={1}
              minW={0}
            >
              <Text fontSize="sm" fontWeight="800" textAlign="center" color="matchday.navy" noOfLines={1}>
                {participant.userName}
              </Text>
              <VStack spacing={0.1}>
                {[...coerceSelectedDaysToArray(participant.selectedDays)]
                  .sort((a, b) => getSortValue(a) - getSortValue(b))
                  .map((day, dayIndex) => {
                    // 영어 요일 코드를 한글 날짜로 변환
                    const convertToKoreanDate = (dayStr: string) => {
                      const dayMapping = {
                        'MON': '월', 'TUE': '화', 'WED': '수', 'THU': '목', 'FRI': '금'
                      };
                      
                      // 이미 한글 날짜 형식인 경우 그대로 반환
                      if (dayStr.includes('월') && dayStr.includes('일')) {
                        return dayStr;
                      }
                      
                      // 영어 요일 코드인 경우 한글 날짜로 변환
                      const weekStartDate = new Date(voteResults.weekStartDate);
                      const weekdayIdx = Object.keys(dayMapping).indexOf(dayStr);
                      if (weekdayIdx !== -1) {
                        const targetDate = new Date(weekStartDate.getTime() + weekdayIdx * 24 * 60 * 60 * 1000);
                        const month = targetDate.getMonth() + 1;
                        const date = targetDate.getDate();
                        const dayName = dayMapping[dayStr as keyof typeof dayMapping];
                        return `${month}월 ${date}일(${dayName})`;
                      }

                      const loose = dayStr.match(/(\d{1,2})\D+(\d{1,2})/);
                      if (loose) {
                        const mNum = parseInt(loose[1], 10);
                        const dNum = parseInt(loose[2], 10);
                        if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
                          const y = new Date(voteResults.weekStartDate).getFullYear();
                          const cal = new Date(y, mNum - 1, dNum);
                          if (!isNaN(cal.getTime())) {
                            const dowKo = ['일', '월', '화', '수', '목', '금', '토'][cal.getDay()];
                            return `${mNum}월 ${dNum}일(${dowKo})`;
                          }
                        }
                      }

                      return dayStr;
                    };
                    
                    return (
                      <Text key={dayIndex} fontSize="xs" color="gray.600" textAlign="center" lineHeight={1.3}>
                        {convertToKoreanDate(day)}
                      </Text>
                    );
                  })}
              </VStack>
            </VStack>
          ))}
        </SimpleGrid>
      </Box>

    </VStack>
  );
}
