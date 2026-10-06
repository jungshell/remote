import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Text,
  Button,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@chakra-ui/react';
import {
  getUnifiedVoteDataNew,
  getSavedVoteResults,
  resumeVoteSession,
  closeVoteSession,
  deleteVoteSession,
  startWeeklyVote,
  getAdminVoteSessionsSummary
} from '../api/auth';
import VoteCharts from '../components/VoteCharts';
import { AdminPageHeader, AdminPanel, PanelHeader, StatBlock, StatStrip, StatusBadge } from '../components/admin/MatchDay';

interface VoteSession {
  id: number;
  weekStartDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isCompleted: boolean;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
}

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
    '불참'?: DayVoteResult;
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

interface UnifiedVoteData {
  activeSession: VoteResults | null;
  lastWeekResults: VoteResults | null;
}

const getKstWeekKey = (dateLike: string | Date) => {
  const date = new Date(dateLike);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
};

const getSessionVoteScore = (session: any) => {
  if (typeof session?.participantCount === 'number') return session.participantCount;
  if (typeof session?.voteCount === 'number') return session.voteCount;
  if (Array.isArray(session?.participants)) return session.participants.length;
  return 0;
};

export default function VoteResultsPage() {
  const [allVoteSessions, setAllVoteSessions] = useState<VoteSession[]>([]);
  const [selectedVoteSessionId, setSelectedVoteSessionId] = useState<number | null>(null);
  const [selectedVoteResults, setSelectedVoteResults] = useState<VoteResults | null>(null);
  const [sessionDetails, setSessionDetails] = useState<VoteSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [unifiedData, setUnifiedData] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{ session: VoteSession; type: 'close' | 'resume' | 'delete' } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const sessionsPerPage = 4;
  const toast = useToast();

  // 투표 세션 데이터 로드
  const loadVoteSessionsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('투표 세션 데이터 로드 시작...');
      
      // 1) 통합 데이터 로드 (일정 페이지와 동일한 데이터 소스)
      let unifiedDataFromApi: any = null;
      try {
        unifiedDataFromApi = await getUnifiedVoteDataNew();
        setUnifiedData(unifiedDataFromApi);
        console.log('통합 투표 데이터:', unifiedDataFromApi);
      } catch (apiError: any) {
        console.warn('통합 데이터 로드 실패(summary fallback 사용):', apiError);
      }

      // 2) fallback: 투표 세션 요약 데이터 로드
      let summaryData: any = null;
      if (!Array.isArray(unifiedDataFromApi?.allSessions)) {
        try {
          summaryData = await getAdminVoteSessionsSummary();
          console.log('투표 세션 요약 데이터:', summaryData);
        } catch (apiError: any) {
          console.error('API 호출 실패:', apiError);
          throw new Error(`투표 세션 데이터를 불러오는데 실패했습니다: ${apiError.message || '알 수 없는 오류'}`);
        }
      }
      
      // 백엔드 응답 형태 통합
      const allSessions: VoteSession[] = (
        unifiedDataFromApi?.allSessions
        || summaryData?.data?.sessions
        || summaryData?.sessions
        || []
      ) as VoteSession[];
      
      // 디버깅: 각 세션의 isActive 상태 확인
      console.log('🔍 세션 데이터 isActive 상태:', allSessions.map(s => ({
        id: s.id,
        isActive: s.isActive,
        isCompleted: s.isCompleted,
        weekStartDate: s.weekStartDate
      })));
      
      // 같은 주차 중복 세션은 1개만 노출(운영 백엔드 레거시 중복 생성 안전장치)
      const sessionsByWeek = new Map<string, VoteSession[]>();
      allSessions.forEach((session) => {
        const weekKey = getKstWeekKey(session.weekStartDate);
        if (!sessionsByWeek.has(weekKey)) sessionsByWeek.set(weekKey, []);
        sessionsByWeek.get(weekKey)!.push(session);
      });

      const uniqueSessions: VoteSession[] = Array.from(sessionsByWeek.values()).map((group) => {
        const sorted = [...group].sort((a: any, b: any) => {
          const voteDiff = getSessionVoteScore(b) - getSessionVoteScore(a);
          if (voteDiff !== 0) return voteDiff;
          const completedDiff = Number(b.isCompleted) - Number(a.isCompleted);
          if (completedDiff !== 0) return completedDiff;
          const activeDiff = Number(b.isActive) - Number(a.isActive);
          if (activeDiff !== 0) return activeDiff;
          return b.id - a.id;
        });
        return sorted[0];
      });
      
      // weekStartDate 기준으로 내림차순 정렬 (최신 세션이 먼저)
      const sessions: VoteSession[] = uniqueSessions.sort((a: VoteSession, b: VoteSession) => {
        return new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime();
      });
      
      setAllVoteSessions(sessions);
      setCurrentPage(1);

      // 활성 세션 또는 첫 세션 자동 선택
      const activeSession = sessions.find((s: VoteSession) => s.isActive) || sessions[0];
      if (activeSession) {
        console.log('선택된 세션:', activeSession);
        setSelectedVoteSessionId(activeSession.id);
        setSessionDetails(activeSession);

        // 해당 세션의 상세 결과 로드
        const results = await getSavedVoteResults(activeSession.id);
        console.log('세션 상세 결과:', results);
        setSelectedVoteResults(results);
      } else {
        console.log('선택할 수 있는 세션이 없습니다.');
        setError('투표 세션이 없습니다.');
      }
      
    } catch (e) {
      console.error('투표 세션 데이터 로드 실패:', e);
      setError('투표 세션 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVoteSessionsData();
    
    // 투표 데이터 변경 이벤트 리스너 추가 (일정 페이지와 동기화)
    const handleVoteDataChanged = () => {
      console.log('🔄 투표 데이터 변경 이벤트 수신 - 세션 목록 새로고침');
      loadVoteSessionsData();
    };
    
    window.addEventListener('voteDataChanged', handleVoteDataChanged);
    return () => {
      window.removeEventListener('voteDataChanged', handleVoteDataChanged);
    };
  }, [loadVoteSessionsData]); // loadVoteSessionsData를 의존성에 추가

  // 자동 새로고침 기능 (수정: autoRefresh가 true일 때만 실행)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        console.log('자동 새로고침 실행...');
        loadVoteSessionsData();
      }, 30000); // 30초마다 새로고침
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  // 투표 데이터 변경 이벤트 리스너
  useEffect(() => {
    const handleVoteDataChanged = () => {
      console.log('🔄 관리자 페이지: 투표 데이터 변경 이벤트 수신 - 데이터 새로고침');
      loadVoteSessionsData();
    };

    window.addEventListener('voteDataChanged', handleVoteDataChanged);

    return () => {
      window.removeEventListener('voteDataChanged', handleVoteDataChanged);
    };
  }, [loadVoteSessionsData]);

  // 다음주 투표 세션 생성 핸들러
  const createNextWeekVoteSession = async () => {
    try {
      const result = await startWeeklyVote();
      toast({
        title: '투표 세션 생성 완료',
        description: result.message,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // 데이터 새로고침 및 이벤트 발생
      await loadVoteSessionsData();
      window.dispatchEvent(new CustomEvent('voteDataChanged'));
      console.log('✅ 투표 세션 생성 후 이벤트 발생');
    } catch (error: any) {
      console.error('투표 세션 생성 실패:', error);
      toast({
        title: '투표 세션 생성 실패',
        description: error.response?.data?.error || '서버 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // 투표 세션 마감/재개 토글 핸들러
  const toggleVoteSessionStatus = async (sessionId: number) => {
    try {
      // 토큰 확인
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token_backup') || sessionStorage.getItem('token');
      console.log('🔍 투표마감 토큰 확인:', { sessionId, token: token ? '있음' : '없음' });
      
      const session = allVoteSessions.find(s => s.id === sessionId);
      
      if (!session) {
        toast({
          title: '오류',
          description: '세션을 찾을 수 없습니다.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const isCurrentlyActive = session.isActive;
      
      if (isCurrentlyActive) {
        // 투표 마감 처리
        await closeVoteSession(sessionId);
        try { window.dispatchEvent(new CustomEvent('votesChanged')); } catch {}
        try { window.dispatchEvent(new CustomEvent('voteDataChanged')); } catch {}
        try { window.dispatchEvent(new CustomEvent('gamesChanged')); } catch {}
        toast({
          title: '투표 마감 완료',
          description: '투표가 성공적으로 마감되었습니다.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // 투표 재개 처리
        try {
          await resumeVoteSession(sessionId);
          try { window.dispatchEvent(new CustomEvent('votesChanged')); } catch {}
          try { window.dispatchEvent(new CustomEvent('voteDataChanged')); } catch {}
          
          toast({
            title: '투표 재개 완료',
            description: '투표가 재개되었습니다.',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        } catch (error) {
          console.error('투표 재개 오류:', error);
          toast({
            title: '투표 재개 실패',
            description: error.message || '투표 재개 중 오류가 발생했습니다.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
      }
      
      // 데이터 새로고침 및 이벤트 발생
      loadVoteSessionsData();
      window.dispatchEvent(new CustomEvent('voteDataChanged'));
      console.log('✅ 투표 세션 상태 변경 후 이벤트 발생');
    } catch (error) {
      console.error('투표 세션 상태 변경 실패:', error);
      toast({
        title: '처리 실패',
        description: error instanceof Error ? error.message : '투표 상태 변경 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // 투표 세션 삭제 핸들러 (확인은 호출 전 confirm modal에서 처리됨)
  const handleDeleteVoteSession = async (sessionId: number | string) => {
    try {
      // ID 파싱 (문자열인 경우 숫자로 변환, 복합 ID인 경우 첫 번째 부분만 사용)
      const cleanId = typeof sessionId === 'string' 
        ? parseInt(sessionId.split(':')[0]) 
        : sessionId;
      
      if (isNaN(cleanId)) {
        throw new Error('유효하지 않은 세션 ID입니다.');
      }
      
      await deleteVoteSession(cleanId);
      toast({
        title: '세션 삭제 완료',
        description: '투표 세션이 성공적으로 삭제되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // 데이터 새로고침
      loadVoteSessionsData();
      window.dispatchEvent(new CustomEvent('voteDataChanged'));
    } catch (error) {
      console.error('투표 세션 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '투표 세션 삭제 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // 마감/재개/삭제 확인 모달 → 실제 실행
  const handleConfirmPendingAction = async () => {
    if (!pendingAction || isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      if (pendingAction.type === 'delete') {
        await handleDeleteVoteSession(pendingAction.session.id);
      } else {
        await toggleVoteSessionStatus(pendingAction.session.id);
      }
    } finally {
      setIsProcessingAction(false);
      setPendingAction(null);
    }
  };


  // 세션 선택 핸들러
  const handleSessionSelect = async (session: VoteSession) => {
    setSelectedVoteSessionId(session.id);
    setSessionDetails(session);
    
    try {
      console.log('세션 선택:', session.id);
      const results = await getSavedVoteResults(session.id);
      console.log('선택된 세션 결과:', results);
      setSelectedVoteResults(results);
    } catch (e) {
      console.error('투표 결과 로드 실패:', e);
      setSelectedVoteResults(null);
    }
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="gray.600">투표 세션 데이터를 불러오는 중...</Text>
        </VStack>
      </Box>
    );
  }

  // 오류가 있어도 폴백 데이터를 보여주기 위해 상단 경고만 노출

  return (
    <VStack className="fccg-matchday fccg-admin" spacing={6} align="stretch">
      <AdminPageHeader eyebrow="MATCH STATS" title="투표 결과" description="투표 현황과 참여 결과를 확인합니다." />

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">오류가 발생했습니다!</Text>
            <Text fontSize="sm">{error}</Text>
          </Box>
        </Alert>
      )}
      {/* 세션 통계: 실제 세션 목록·진행 중 세션 participation 값만 사용 */}
      {(() => {
        // participation은 서버가 진행 중(isActive) 세션 하나에 대해 계산한 값: ACTIVE 회원 중 투표한 인원 비율
        const participation = unifiedData?.activeSession?.participation;
        const activeCount = allVoteSessions.filter((s: VoteSession) => s.isActive).length;
        return (
          <StatStrip columns={4}>
            <StatBlock label="SESSIONS" value={allVoteSessions.length} unit="개" caption="전체 세션" />
            <StatBlock label="LIVE" value={activeCount} unit="개" caption="진행 중 세션" highlight={activeCount > 0} />
            <StatBlock
              label="TURNOUT"
              value={participation ? participation.participationRate : '—'}
              {...(participation ? { unit: '%' } : {})}
              caption={participation ? `${participation.uniqueVoters}/${participation.totalMembers}명 · 진행 중 세션` : '진행 중 세션 없음'}
            />
            <StatBlock label="CLOSED" value={allVoteSessions.filter((s: VoteSession) => s.isCompleted).length} unit="개" caption="마감 완료 세션" />
          </StatStrip>
        );
      })()}

      {/* 투표 세션 목록 */}
      <AdminPanel label="VOTE SESSIONS" title="투표 세션 목록">
        <VStack align="stretch" spacing={2}>
          {allVoteSessions.length === 0 ? (
            <Box textAlign="center" py={4} px={4}>
              <Text color="gray.500" fontSize="sm" lineHeight={0.95}>투표 세션이 없습니다.</Text>
              <Text color="gray.400" fontSize="xs" mt={1} lineHeight={0.95}>
                첫 번째 투표 세션을 생성해보세요.
              </Text>
            </Box>
          ) : (
            <VStack spacing={2} align="stretch">
            {(() => {
              // 페이지네이션 계산
              const totalPages = Math.ceil(allVoteSessions.length / sessionsPerPage);
              const startIndex = (currentPage - 1) * sessionsPerPage;
              const endIndex = startIndex + sessionsPerPage;
              const currentSessions = allVoteSessions.slice(startIndex, endIndex);
              
              // 디버깅: currentSessions 확인
              console.log('🔍 페이지네이션 디버깅:', {
                allVoteSessionsLength: allVoteSessions.length,
                currentPage,
                sessionsPerPage,
                startIndex,
                endIndex,
                currentSessionsLength: currentSessions.length,
                currentSessionsIds: currentSessions.map(s => s.id)
              });

              return (
                <>
                  {currentSessions.map((session: VoteSession, index: number) => {
              // 날짜 포맷팅 함수 (로컬 시간 기준으로 처리)
              const formatDateWithDay = (dateString: string) => {
                const date = new Date(dateString);
                // 로컬 시간 기준으로 날짜 추출
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dayName = days[date.getDay()];
                return `${year}. ${month}. ${day}.(${dayName})`;
              };

              // 다음주 일정투표기간 (월-금) - weekStartDate부터 4일 후(금요일)까지
              const voteStartDate = new Date(session.weekStartDate);
              const voteEndDate = new Date(voteStartDate);
              voteEndDate.setDate(voteStartDate.getDate() + 4); // 금요일
              
              const votePeriod = `${formatDateWithDay(voteStartDate.toISOString())} ~ ${formatDateWithDay(voteEndDate.toISOString())}`;
              
              // 의견수렴기간 (투표기간 전주 월요일 00:01부터 시작)
              const opinionStartDate = new Date(voteStartDate);
              opinionStartDate.setDate(opinionStartDate.getDate() - 7); // 전주로 이동
              
              // 월요일로 강제 조정
              const opinionDayOfWeek = opinionStartDate.getDay();
              if (opinionDayOfWeek !== 1) {
                const daysToMonday = opinionDayOfWeek === 0 ? 1 : 1 - opinionDayOfWeek;
                opinionStartDate.setDate(opinionStartDate.getDate() + daysToMonday);
              }
              
              let opinionPeriod: string;
              
              if (session.isActive) {
                // 진행중인 경우 "진행중" 표시
                opinionPeriod = `${formatDateWithDay(opinionStartDate.toISOString())} 00:01 - 진행중`;
              } else {
                // 완료된 경우 실제 투표 마감 시간 표시
                // session.endTime은 서버가 실제 UTC 인스턴트로 저장한 값(auth_simple.ts 마감 처리 주석 참고).
                // 브라우저가 이미 KST 로컬 타임존이므로 getFullYear/getHours 등은 추가 보정 없이 KST 값을 반환한다.
                const opinionEndDate = new Date(session.endTime);

                const year = opinionEndDate.getFullYear();
                const month = String(opinionEndDate.getMonth() + 1).padStart(2, '0');
                const day = String(opinionEndDate.getDate()).padStart(2, '0');
                const hours = String(opinionEndDate.getHours()).padStart(2, '0');
                const minutes = String(opinionEndDate.getMinutes()).padStart(2, '0');
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dayName = days[opinionEndDate.getDay()];

                // 최종 시간 표시
                const timeDisplay = `${year}. ${month}. ${day}.(${dayName}) ${hours}:${minutes}`;

                opinionPeriod = `${formatDateWithDay(opinionStartDate.toISOString())} 00:01 ~ ${timeDisplay}`;
              }

              // 오늘 날짜(달력 기준)가 투표 시작일보다 이전인지 — 시각까지 비교하면 KST 오프셋 때문에
              // 시작 당일 오전~오후 경계에서 왜곡될 수 있어 두 값 모두 로컬 달력일로 정규화해 비교한다.
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const voteStartDay = new Date(voteStartDate.getFullYear(), voteStartDate.getMonth(), voteStartDate.getDate());
              const isBeforeVoteStart = today < voteStartDay;
              const canResume = !session.isActive && (!session.isCompleted || isBeforeVoteStart);

              // 참여자와 미참자 목록
              const participants = session.participants || [];
              const participantNames = session.participantNames ? session.participantNames.join(', ') : (participants.map(p => p.userName).join(', ') || '없음');
              const nonParticipantNames = session.nonParticipants || [];
              const participantCount = session.participantCount || session.voteCount || 0;

              // 선택된 세션이거나 현재 진행중인 세션인지 확인
              const isSelected = selectedVoteSessionId === session.id;
              const isActive = session.isActive;
              const showDetailed = isSelected || isActive;

              const sessionNumber = allVoteSessions.length - (startIndex + index);
              const statusValue = session.isActive ? 'ACTIVE' : session.isCompleted ? 'COMPLETED' : 'WAITING';

              return (
                <Box
                  key={session.id}
                  position="relative"
                  px={{ base: 3, md: 4 }}
                  py={3}
                  border="1px solid"
                  borderColor={isSelected ? 'brand.500' : 'gray.200'}
                  borderRadius="md"
                  cursor="pointer"
                  bg={isSelected ? 'brand.50' : 'white'}
                  _hover={{ bg: isSelected ? 'brand.50' : 'gray.50' }}
                  onClick={() => handleSessionSelect(session)}
                >
                  {/* 모바일: 제목·배지 → 기간 → 액션 순으로 쌓고, md 이상에서 액션을 오른쪽으로 */}
                  <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'flex-start' }} gap={{ base: 2.5, md: 4 }}>
                    <Box minW={0} flex={1}>
                      <HStack spacing={2} wrap="wrap">
                        <Text textStyle="scoreLabel" color={isSelected ? 'brand.600' : 'matchday.navy'}>SESSION #{sessionNumber}</Text>
                        <StatusBadge kind="voteSession" value={statusValue} />
                        {isSelected && <Text fontSize="11px" fontWeight="700" color="brand.600">선택됨</Text>}
                      </HStack>
                      <Text fontWeight="700" fontSize={showDetailed ? 'md' : 'sm'} color="matchday.navy" mt={1.5}>
                        <Text as="span" fontWeight="600" color="gray.500" fontSize="xs" mr={1.5}>다음주 일정투표기간</Text>
                        {votePeriod}
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                        의견수렴기간 : {opinionPeriod}
                      </Text>
                    </Box>
                    <HStack spacing={1.5} flexShrink={0} wrap="wrap">
                      {session.isActive ? (
                        <Button
                          size="xs"
                          bg="matchday.navy"
                          color="white"
                          _hover={{ bg: 'brand.700' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingAction({ session, type: 'close' });
                          }}
                        >
                          투표 마감
                        </Button>
                      ) : canResume ? (
                        <Button
                          size="xs"
                          colorScheme="brand"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingAction({ session, type: 'resume' });
                          }}
                        >
                          투표 재개
                        </Button>
                      ) : null}
                      {showDetailed && session.id !== 10 && session.id !== 11 && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingAction({ session, type: 'delete' });
                          }}
                        >
                          삭제
                        </Button>
                      )}
                    </HStack>
                  </Flex>

                  {/* 참여자/미참자 목록 (선택·진행중 세션만 상세) */}
                  {showDetailed ? (
                    <Box mt={2.5} pt={2.5} borderTop="1px dashed" borderColor="gray.200">
                      <Text fontSize="xs" color="gray.600">
                        <Text as="span" fontWeight="700" color="matchday.navy">참여자 {participantCount}명</Text> · {participantNames || '없음'}
                      </Text>
                      {nonParticipantNames.length > 0 && (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          <Text as="span" fontWeight="700">미참자 {nonParticipantNames.length}명</Text> · {nonParticipantNames.join(', ')}
                        </Text>
                      )}
                    </Box>
                  ) : (
                    <Text fontSize="xs" color="gray.500" mt={1.5}>참여자 {participantCount}명</Text>
                  )}
                </Box>
              );
                  })}
                  
                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <HStack justify="center" spacing={2} mt={2}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        isDisabled={currentPage === 1}
                      >
                        이전
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          size="xs"
                          variant={currentPage === page ? "solid" : "outline"}
                          colorScheme={currentPage === page ? "brand" : "gray"}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        isDisabled={currentPage === totalPages}
                      >
                        다음
                      </Button>
                    </HStack>
                  )}
                </>
              );
            })()}
          </VStack>
        )}
        </VStack>
      </AdminPanel>

      {/* 선택된 세션의 상세 결과 */}
      {selectedVoteSessionId && sessionDetails && (
        <AdminPanel>
          <PanelHeader
            label="WEEKDAY RESULT"
            title="요일별 투표 분포"
            right={
            <Text fontSize="xs" color="gray.500">
              {(() => {
                const voteWeekStartDate = new Date(sessionDetails.weekStartDate);
                const dayOfWeek = voteWeekStartDate.getDay();
                if (dayOfWeek === 0) {
                  voteWeekStartDate.setDate(voteWeekStartDate.getDate() + 1);
                } else if (dayOfWeek !== 1) {
                  const daysToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
                  voteWeekStartDate.setDate(voteWeekStartDate.getDate() + daysToMonday);
                }
                
                const year = voteWeekStartDate.getFullYear();
                const month = String(voteWeekStartDate.getMonth() + 1).padStart(2, '0');
                const day = String(voteWeekStartDate.getDate()).padStart(2, '0');
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dayName = days[voteWeekStartDate.getDay()];
                return `${year}. ${month}. ${day}.(${dayName}) 주간`;
              })()}
            </Text>
            }
          />
          {selectedVoteResults ? (
            <VoteCharts 
              key={`vote-charts-${selectedVoteResults.sessionId}-${selectedVoteResults.totalVotes}`}
              voteResults={selectedVoteResults} 
            />
          ) : (
            <Box textAlign="center" py={4}>
              <Text color="gray.500" fontSize="sm">투표 결과 데이터가 없습니다.</Text>
              <Text color="gray.400" fontSize="xs" mt={1}>
                투표가 진행되면 여기에 요일별 분포가 표시됩니다.
              </Text>
            </Box>
          )}
        </AdminPanel>
      )}

      {/* 마감/재개/삭제 확인 모달 */}
      <Modal isOpen={!!pendingAction} onClose={() => !isProcessingAction && setPendingAction(null)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {pendingAction?.type === 'close' && '투표를 마감하시겠습니까?'}
            {pendingAction?.type === 'resume' && '투표를 재개하시겠습니까?'}
            {pendingAction?.type === 'delete' && '투표 세션 삭제 확인'}
          </ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="gray.700">
              {pendingAction?.type === 'close' && '요일별 득표 결과에 따라 자동 일정이 생성되고, 기존 자동 생성 일정은 정리됩니다.'}
              {pendingAction?.type === 'resume' && '재개하면 이번 주에 생성된 자동 일정이 삭제되고, 투표가 다시 진행 상태로 전환됩니다.'}
              {pendingAction?.type === 'delete' && '이 투표 세션과 관련 투표 기록이 영구히 삭제됩니다. 이 작업은 되돌릴 수 없습니다.'}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={() => setPendingAction(null)} isDisabled={isProcessingAction}>
              취소
            </Button>
            <Button
              colorScheme={pendingAction?.type === 'resume' ? 'brand' : 'red'}
              onClick={handleConfirmPendingAction}
              isLoading={isProcessingAction}
            >
              {pendingAction?.type === 'close' ? '마감' : pendingAction?.type === 'resume' ? '재개' : '삭제'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
