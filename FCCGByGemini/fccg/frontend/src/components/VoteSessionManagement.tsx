import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react';
import { LuCalendarX } from 'react-icons/lu';
import { AdminEmptyState, AdminPageHeader, AdminPanel, DateBlock, LiveDot, PitchLines, StatBlock, StatusBadge } from './admin/MatchDay';
import { useAuthStore } from '../store/auth';
import { ensureApiBaseUrl } from '../constants';

interface VoteSessionManagementProps {
  unifiedVoteData: any;
  onRefresh: () => void;
}

const VoteSessionManagement: React.FC<VoteSessionManagementProps> = ({
  unifiedVoteData,
  onRefresh,
}) => {
  const toast = useToast();
  const token = useAuthStore((s) => s.token);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDisabledDaysModalOpen, setIsDisabledDaysModalOpen] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [disabledDays, setDisabledDays] = useState<Array<{ day: string; reason: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeSession = unifiedVoteData?.activeSession;

  // 다음주 월요일 계산
  useEffect(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) % 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    
    const year = nextMonday.getFullYear();
    const month = String(nextMonday.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonday.getDate()).padStart(2, '0');
    setWeekStartDate(`${year}-${month}-${day}`);

    // 기본 startTime: 이번주 월요일 00:01
    const thisWeekMonday = new Date(now);
    const daysToThisMonday = currentDay === 0 ? -6 : 1 - currentDay;
    thisWeekMonday.setDate(now.getDate() + daysToThisMonday);
    thisWeekMonday.setHours(0, 1, 0, 0);
    setStartTime(thisWeekMonday.toISOString().slice(0, 16));

    // 기본 endTime: 다음주 금요일 17:00
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    nextFriday.setHours(17, 0, 0, 0);
    setEndTime(nextFriday.toISOString().slice(0, 16));
  }, []);

  // 활성 세션의 disabledDays 로드
  useEffect(() => {
    if (activeSession?.disabledDays) {
      try {
        // 문자열인 경우 파싱, 배열인 경우 그대로 사용
        const parsed = typeof activeSession.disabledDays === 'string' 
          ? JSON.parse(activeSession.disabledDays) 
          : activeSession.disabledDays;
        setDisabledDays(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.warn('disabledDays 파싱 실패:', e);
        setDisabledDays([]);
      }
    } else {
      setDisabledDays([]);
    }
  }, [activeSession]);

  const handleCreateSession = async () => {
    if (!weekStartDate) {
      toast({
        title: '오류',
        description: '주 시작일을 입력해주세요.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = await ensureApiBaseUrl().catch(() => '/api/auth');
      const authToken = token || localStorage.getItem('token') || '';
      if (!authToken) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      const response = await fetch(`${baseUrl}/admin/vote-sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          weekStartDate,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          disabledDays: disabledDays.length > 0 ? disabledDays : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '세션 생성 실패');
      }

      toast({
        title: '성공',
        description: '투표 세션이 생성되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setIsCreateModalOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '세션 생성 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDisabledDays = async () => {
    setIsLoading(true);
    try {
      const baseUrl = await ensureApiBaseUrl().catch(() => '/api/auth');
      const authToken = token || localStorage.getItem('token') || '';
      if (!authToken) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      console.log('📤 요일 차단 설정 요청:', {
        url: `${baseUrl}/admin/vote-sessions/active/disabled-days`,
        disabledDays,
        tokenLength: authToken.length
      });
      
      const response = await fetch(`${baseUrl}/admin/vote-sessions/active/disabled-days`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          disabledDays,
        }),
      });

      console.log('📥 응답 상태:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📥 응답 데이터:', data);

      if (!response.ok) {
        console.error('요일 차단 설정 실패:', data);
        throw new Error(data.error || '설정 업데이트 실패');
      }

      console.log('✅ 요일 차단 설정 성공:', data);
      console.log('업데이트된 disabledDays:', data.voteSession?.disabledDays);

      toast({
        title: '성공',
        description: '요일 차단 설정이 업데이트되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setIsDisabledDaysModalOpen(false);
      
      // 데이터 새로고침 전에 약간의 지연을 두어 DB 업데이트가 완료되도록 함
      setTimeout(() => {
        onRefresh();
      }, 500);
    } catch (error: any) {
      toast({
        title: '오류',
        description: error.message || '설정 업데이트 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDayDisabled = (dayKey: string, dayName: string) => {
    const existingIndex = disabledDays.findIndex((d) => d.day === dayKey);
    if (existingIndex >= 0) {
      setDisabledDays(disabledDays.filter((_, i) => i !== existingIndex));
    } else {
      setDisabledDays([...disabledDays, { day: dayKey, reason: `${dayName}요일 차단` }]);
    }
  };

  const updateDayReason = (dayKey: string, reason: string) => {
    setDisabledDays(
      disabledDays.map((d) => (d.day === dayKey ? { ...d, reason } : d))
    );
  };

  const dayMapping = [
    { key: 'MON', name: '월' },
    { key: 'TUE', name: '화' },
    { key: 'WED', name: '수' },
    { key: 'THU', name: '목' },
    { key: 'FRI', name: '금' },
  ];

  return (
    <VStack className="fccg-matchday fccg-admin" spacing={5} align="stretch" w="100%">
      <AdminPageHeader
        eyebrow="VOTE SESSION"
        title="투표 세션 관리"
        description="주간 투표 기간과 참여 가능 요일을 관리합니다."
        right={
          <>
            {activeSession && (
              <Button colorScheme="brand" variant="outline" size="sm" onClick={() => setIsDisabledDaysModalOpen(true)}>
                요일 차단 설정
              </Button>
            )}
            <Button colorScheme="brand" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              새 세션 생성
            </Button>
          </>
        }
      />

      {/* 활성 세션 정보 */}
      {activeSession && (() => {
        let parsedDisabledDays: Array<{ day: string; reason: string }> = [];
        if (activeSession.disabledDays) {
          try {
            parsedDisabledDays = typeof activeSession.disabledDays === 'string'
              ? JSON.parse(activeSession.disabledDays)
              : activeSession.disabledDays;
            if (!Array.isArray(parsedDisabledDays)) {
              parsedDisabledDays = [];
            }
          } catch (e) {
            parsedDisabledDays = [];
          }
        }
        const weekStart = new Date(activeSession.weekStartDate);
        const statusValue = activeSession.isActive ? 'ACTIVE' : activeSession.isCompleted ? 'COMPLETED' : 'WAITING';
        // participation: 서버가 이 진행 중 세션 기준으로 계산한 값 (ACTIVE 회원 중 투표 인원 비율)
        const participation = activeSession.participation;
        return (
          <>
            <Box position="relative" overflow="hidden" bg="matchday.navy" borderRadius="xl" color="white">
              <PitchLines opacity={0.08} />
              <Flex position="relative" gap={{ base: 4, md: 6 }} align="center" p={{ base: 4, md: 6 }}>
                <DateBlock date={weekStart} minW={{ base: '80px', md: '92px' }} />
                <Box minW={0} flex={1}>
                  <HStack spacing={2} wrap="wrap">
                    {activeSession.isActive && <LiveDot />}
                    <Text textStyle="scoreLabel" color={activeSession.isActive ? 'matchday.volt' : 'whiteAlpha.700'}>ACTIVE SESSION</Text>
                    <StatusBadge kind="voteSession" value={statusValue} />
                  </HStack>
                  <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="800" letterSpacing="-0.01em" mt={1.5} lineHeight="1.2">
                    {weekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 주간 투표
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
                    투표 기간{' '}
                    {new Date(activeSession.weekStartDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~{' '}
                    {new Date(activeSession.endTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.600" mt={0.5}>세션 #{activeSession.sessionId}</Text>
                </Box>
              </Flex>
              <SimpleGrid position="relative" columns={3} borderTop="1px solid" borderColor="whiteAlpha.200" sx={{ '& > *:not(:last-of-type)': { borderRightWidth: '1px', borderColor: 'whiteAlpha.200' } }}>
                <StatBlock
                  compact
                  label="TURNOUT"
                  value={participation ? participation.participationRate : '—'}
                  {...(participation ? { unit: '%' } : {})}
                  caption={participation ? `활성 회원 ${participation.totalMembers}명 중 ${participation.uniqueVoters}명` : '집계 없음'}
                />
                <StatBlock compact label="VOTERS" value={activeSession.totalParticipants || 0} unit="명" caption="투표 참여 인원" />
                <StatBlock compact label="BLOCKED" value={parsedDisabledDays.length} unit="일" caption="차단된 요일" />
              </SimpleGrid>
            </Box>

            {/* 월~금 투표 가능/차단 스트립 */}
            <AdminPanel label="WEEKDAYS" title="요일별 투표 가능 여부">
              <SimpleGrid columns={5} spacing={{ base: 1.5, md: 3 }}>
                {dayMapping.map(({ key, name }) => {
                  const blocked = parsedDisabledDays.find((d: any) => d.day === key);
                  return (
                    <Box
                      key={key}
                      minW={0}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={blocked ? 'matchday.navy' : 'gray.200'}
                      bg={blocked ? 'matchday.navy' : 'white'}
                      color={blocked ? 'white' : 'matchday.navy'}
                      px={{ base: 2, md: 4 }}
                      py={{ base: 3, md: 4 }}
                      title={blocked ? `${name}요일: ${blocked.reason}` : undefined}
                    >
                      <Text textStyle="scoreLabel" color={blocked ? 'whiteAlpha.700' : 'brand.500'}>{key}</Text>
                      <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="800" mt={1}>{name}</Text>
                      <Text fontSize="11px" fontWeight="700" mt={1} color={blocked ? 'white' : 'brand.500'}>
                        {blocked ? '차단' : '가능'}
                      </Text>
                      {blocked && (
                        <Text fontSize="11px" color="whiteAlpha.700" mt={0.5} noOfLines={2} wordBreak="keep-all">
                          {blocked.reason}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </SimpleGrid>
            </AdminPanel>
          </>
        );
      })()}

      {!activeSession && (
        <AdminPanel p={0}>
          <AdminEmptyState
            icon={LuCalendarX}
            title="현재 활성 세션이 없습니다."
            description="새 세션을 생성하면 이곳에 투표 기간과 요일 상태가 표시됩니다."
          />
        </AdminPanel>
      )}

      {/* 세션 생성 모달 */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>새 투표 세션 생성</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>주 시작일 (월요일)</FormLabel>
                <Input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>의견수렴 시작일시</FormLabel>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>투표 마감일시</FormLabel>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </FormControl>
              <Divider />
              <Text fontWeight="semibold">요일 차단 설정 (선택사항)</Text>
              <VStack spacing={2} align="stretch">
                {dayMapping.map(({ key, name }) => {
                  const disabledDay = disabledDays.find((d) => d.day === key);
                  return (
                    <Box key={key}>
                      <Checkbox
                        isChecked={!!disabledDay}
                        onChange={() => toggleDayDisabled(key, name)}
                      >
                        {name}요일 차단
                      </Checkbox>
                      {disabledDay && (
                        <FormControl mt={2} ml={6}>
                          <FormLabel fontSize="sm">차단 사유</FormLabel>
                          <Input
                            size="sm"
                            value={disabledDay.reason}
                            onChange={(e) => updateDayReason(key, e.target.value)}
                            placeholder="차단 사유를 입력하세요"
                          />
                        </FormControl>
                      )}
                    </Box>
                  );
                })}
              </VStack>
              <HStack spacing={2} justify="flex-end" mt={4}>
                <Button onClick={() => setIsCreateModalOpen(false)}>취소</Button>
                <Button colorScheme="brand" onClick={handleCreateSession} isLoading={isLoading}>
                  생성
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 요일 차단 설정 모달 */}
      <Modal
        isOpen={isDisabledDaysModalOpen}
        onClose={() => setIsDisabledDaysModalOpen(false)}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>요일 차단 설정</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                차단된 요일은 투표에서 선택할 수 없으며, 빨간색으로 표시됩니다.
              </Text>
              <VStack spacing={2} align="stretch">
                {dayMapping.map(({ key, name }) => {
                  const disabledDay = disabledDays.find((d) => d.day === key);
                  return (
                    <Box key={key}>
                      <Checkbox
                        isChecked={!!disabledDay}
                        onChange={() => toggleDayDisabled(key, name)}
                      >
                        {name}요일 차단
                      </Checkbox>
                      {disabledDay && (
                        <FormControl mt={2} ml={6}>
                          <FormLabel fontSize="sm">차단 사유</FormLabel>
                          <Input
                            size="sm"
                            value={disabledDay.reason}
                            onChange={(e) => updateDayReason(key, e.target.value)}
                            placeholder="차단 사유를 입력하세요"
                          />
                        </FormControl>
                      )}
                    </Box>
                  );
                })}
              </VStack>
              <HStack spacing={2} justify="flex-end" mt={4}>
                <Button onClick={() => setIsDisabledDaysModalOpen(false)}>취소</Button>
                <Button
                  colorScheme="brand"
                  onClick={handleUpdateDisabledDays}
                  isLoading={isLoading}
                >
                  저장
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default VoteSessionManagement;

