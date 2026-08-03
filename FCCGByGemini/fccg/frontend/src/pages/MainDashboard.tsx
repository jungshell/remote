import { Box, Flex, Text, SimpleGrid, Stack, HStack, IconButton, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, useDisclosure, Spinner, Alert, AlertIcon, VStack, Button, Badge, Tooltip, Wrap, WrapItem, Tag } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { MdMusicNote, MdMusicOff } from 'react-icons/md';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import type { StatsSummary } from '../api/auth';
import type { Member } from '../api/auth';
import { getUnifiedVoteDataNew } from '../api/auth';
import { eventBus, EVENT_TYPES } from '../utils/eventBus';
import YouTube from 'react-youtube';
import { getApiBaseUrl } from '../config/api';
import { ensureApiBaseUrl } from '../constants';

const getKstDateKey = (dateLike: string | Date) => {
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

const normalizeSelectedDays = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseNameList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      : [];
  } catch {
    return value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
  }
};

const getGameParticipantNames = (game: any): string[] => {
  const attendanceNames = Array.isArray(game?.attendances)
    ? game.attendances
        .filter((attendance: any) => attendance?.status === 'YES')
        .map((attendance: any) => attendance?.user?.name)
        .filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
    : [];
  const selectedNames = parseNameList(game?.selectedMembers);
  return [...new Set(attendanceNames.length > 0 ? attendanceNames : selectedNames)].sort((a, b) =>
    a.localeCompare(b, 'ko-KR'),
  );
};

const getGameDateLabel = (dateValue: unknown) => {
  const date = new Date(String(dateValue || ''));
  if (Number.isNaN(date.getTime())) return '날짜 미정';
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}.(${dayName})`;
};

const getSessionVoteWeight = (session: any) => {
  const participantCount = Array.isArray(session?.participants) ? session.participants.length : 0;
  const resultCount = session?.results && typeof session.results === 'object'
    ? ['MON', 'TUE', 'WED', 'THU', 'FRI'].reduce((sum, key) => {
        const day = session.results?.[key];
        const count = day && typeof day === 'object' && 'count' in day ? Number(day.count || 0) : 0;
        return sum + count;
      }, 0)
    : 0;
  return Math.max(participantCount, resultCount);
};

// 폴백 비디오는 API에서 가져오지 못할 때만 사용
const fallbackVideos = [
  { id: 'AAftIIK3MOg', title: '2025.07.17.(목) / 매치' },
  { id: 'wbKuojsQZfA', title: '2025.07.03.(목) / 매치 1' },
  { id: 'bH9uYBOuQ3E', title: '2025.06.25.(수) / 매치 2' },
];

// 더미 데이터 제거됨 - 실제 API 데이터만 사용

export default function MainDashboard() {
  // 로그인 상태 확인
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token_backup');
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  };
  
  // 배경음악 자동 재생 (메인 화면 진입 시) - MP3 파일 랜덤 재생
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    // localStorage에서 음악 설정 불러오기
    const saved = localStorage.getItem('backgroundMusicEnabled');
    return saved !== null ? saved === 'true' : true; // 기본값: 켜짐
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 드래그 가능한 음악 버튼 위치 상태
  const [buttonPosition, setButtonPosition] = useState({ x: 20, y: 200 }); // 유튜브 카드 상단 위치로 초기값 설정
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  
  // 사용 가능한 음악 파일 목록
  const musicFiles = useMemo(() => [
    '/clip%26music/FC Chal Ggyeo Anthem.mp3',
    '/clip%26music/FC Chal Ggyeo Anthem (1).mp3',
    '/clip%26music/FC Chal Ggyeo Anthem (2).mp3',
    '/clip%26music/FC Chal Ggyeo Anthem (3).mp3',
  ], []);
  
  useEffect(() => {
    if (!isMusicEnabled) {
      // 음악이 꺼져있으면 정리
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      localStorage.setItem('backgroundMusicEnabled', String(isMusicEnabled));
      return;
    }
    
    // 랜덤으로 음악 선택
    const randomIndex = Math.floor(Math.random() * musicFiles.length);
    const selectedMusic = musicFiles[randomIndex];
    
    // HTML5 Audio로 MP3 재생
    const audio = new Audio(selectedMusic);
    audio.loop = true; // 반복 재생
    audio.volume = 0.3; // 볼륨 30% (0.0 ~ 1.0)
    audioRef.current = audio;
    
    // 음악이 끝나면 다음 랜덤 음악 재생
    const handleEnded = () => {
      const nextRandomIndex = Math.floor(Math.random() * musicFiles.length);
      const nextMusic = musicFiles[nextRandomIndex];
      audio.src = nextMusic;
      audio.load();
      audio.play().catch((err) => {
        console.log('다음 음악 재생 실패:', err);
      });
    };
    
    audio.addEventListener('ended', handleEnded);
    
    // 사용자 상호작용 후 자동 재생 (브라우저 정책 - 자동재생 방지)
    const handleUserInteraction = () => {
      audio.play().catch((err) => {
        console.log('배경음악 자동 재생 실패 (브라우저 정책):', err);
      });
      // 한 번만 실행되도록 리스너 제거
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    // 사용자 상호작용 이벤트 리스너 등록
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // localStorage에 설정 저장
    localStorage.setItem('backgroundMusicEnabled', String(isMusicEnabled));
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isMusicEnabled, musicFiles]);
  
  // 음악 on/off 토글
  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicEnabled) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.log('음악 재생 실패:', err);
        });
      }
    }
    setIsMusicEnabled(prev => !prev);
  };
  
  // 드래그 관련 상태
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  
  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasMoved.current = false;
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      dragStartPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };
  
  // 클릭 핸들러 (드래그가 아닐 때만 실행)
  const handleClick = () => {
    if (!hasMoved.current) {
      toggleMusic();
    }
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && buttonRef.current) {
        // 움직임 감지
        const moveThreshold = 5; // 5px 이상 움직이면 드래그로 간주
        const deltaX = Math.abs(e.clientX - (buttonPosition.x + dragStart.x));
        const deltaY = Math.abs(e.clientY - (buttonPosition.y + dragStart.y));
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
          hasMoved.current = true;
        }
        
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        // 화면 경계 내로 제한
        const maxX = window.innerWidth - 32; // 버튼 너비 고려
        const maxY = window.innerHeight - 32; // 버튼 높이 고려
        setButtonPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      // 약간의 지연 후 hasMoved 리셋 (다음 클릭을 위해)
      setTimeout(() => {
        hasMoved.current = false;
      }, 100);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // 터치 이벤트도 지원
      document.addEventListener('touchmove', handleMouseMove as any);
      document.addEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove as any);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart, buttonPosition]);
  
  // 통계 상태 - 기본값으로 초기화
  const [stats, setStats] = useState<StatsSummary>({
    totalMembers: 0,
    totalGames: 0,
    thisWeekGames: 0,
    nextWeekVotes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialDataLoadedRef = useRef(false);
  
  // 투표 현황 상태
  const [voteData, setVoteData] = useState<any[]>([]);
  const [voteSummary, setVoteSummary] = useState({
    totalMembers: 0,
    votedMembers: 0,
    voteRate: 0,
    votedMemberNames: [] as string[],
    mostVotedDate: '',
    mostVotedCount: 0,
    userVoted: false
  });

  // 통합 투표 데이터 로드 함수
  const loadUnifiedVoteData = useCallback(async () => {
    try {
      const data = await getUnifiedVoteDataNew();
      setUnifiedVoteData(data);
      console.log('🏠 홈 화면 통합 투표 데이터 로드:', data);
    } catch (error) {
      console.error('홈 화면 통합 투표 데이터 로드 오류:', error);
    }
  }, []);

  // 더미 데이터 제거됨 - 실제 API 데이터만 사용



  // 실시간 멤버 데이터 업데이트를 위한 상태
  const [realTimeMembers, setRealTimeMembers] = useState<Member[]>([]); // 빈 배열로 시작
  const [realTimeMemberCount, setRealTimeMemberCount] = useState<number>(0); // 0명으로 시작
  const realTimeMembersRef = useRef<Member[]>([]);
  
  // 실시간 경기 데이터 업데이트를 위한 상태
  const [realTimeGames, setRealTimeGames] = useState<any[]>([]);
  const [thisWeekGame, setThisWeekGame] = useState<any>(null);
  const [nextWeekVote, setNextWeekVote] = useState<any>(null);
  
  // 통합 투표 데이터 상태
  const [unifiedVoteData, setUnifiedVoteData] = useState<any>(null);
  const normalizedVoteSession = useMemo(() => {
    if (!unifiedVoteData) return null;
    let session = unifiedVoteData.activeSession || unifiedVoteData.nextWeekVoteSession || null;
    const allSessions = Array.isArray(unifiedVoteData.allSessions) ? unifiedVoteData.allSessions : [];
    if (session && allSessions.length > 0) {
      const weekKey = getKstDateKey(session.weekStartDate);
      const sameWeek = allSessions.filter((s: any) => getKstDateKey(s.weekStartDate) === weekKey);
      if (sameWeek.length > 1) {
        session = [...sameWeek].sort((a: any, b: any) => {
          const voteDiff = getSessionVoteWeight(b) - getSessionVoteWeight(a);
          if (voteDiff !== 0) return voteDiff;
          const completedDiff = Number(b.isCompleted) - Number(a.isCompleted);
          if (completedDiff !== 0) return completedDiff;
          const activeDiff = Number(b.isActive) - Number(a.isActive);
          if (activeDiff !== 0) return activeDiff;
          return Number((b.sessionId ?? b.id) || 0) - Number((a.sessionId ?? a.id) || 0);
        })[0];
      }
    }
    if (!session) return null;

    const participantMap = new Map<string, any>();
    (Array.isArray(session.participants) ? session.participants : []).forEach((p: any) => {
      const key = String(p?.userId ?? p?.id ?? p?.userName ?? p?.name ?? '');
      if (!key) return;
      if (!participantMap.has(key)) participantMap.set(key, p);
    });
    const participants = Array.from(participantMap.values());

    let results = session.results;
    if (!results || typeof results !== 'object') {
      results = { MON: { count: 0, participants: [] }, TUE: { count: 0, participants: [] }, WED: { count: 0, participants: [] }, THU: { count: 0, participants: [] }, FRI: { count: 0, participants: [] }, '불참': { count: 0, participants: [] } };
      participants.forEach((p: any) => {
        normalizeSelectedDays(p?.selectedDays).forEach((day) => {
          if (!results[day]) return;
          results[day].count += 1;
          results[day].participants.push({ userId: p.userId, userName: p.userName, votedAt: p.votedAt });
        });
      });
    }

    return {
      ...session,
      participants,
      totalParticipants: participants.length,
      results,
    };
  }, [unifiedVoteData]);

  const matchdayGame = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = realTimeGames
      .filter((game: any) => {
        const date = new Date(game?.date);
        return (
          !Number.isNaN(date.getTime()) &&
          date.getTime() >= now.getTime() &&
          game?.confirmed !== false &&
          game?.eventType !== '회식'
        );
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] || thisWeekGame || null;
  }, [realTimeGames, thisWeekGame]);

  // 🔄 이벤트 시스템 리스너 설정
  useEffect(() => {
    // 회원 추가 이벤트 리스너
    const handleMemberAdded = (eventData: any) => {
      console.log('🏠 홈화면: 새 회원 추가 이벤트 수신:', eventData.payload);
      // 실시간 회원 수 업데이트
      setRealTimeMemberCount(prev => prev + 1);
      // 통계 데이터 새로고침
      loadUnifiedVoteData();
    };

    // 데이터 새로고침 이벤트 리스너
    const handleDataRefresh = (eventData: any) => {
      console.log('🏠 홈화면: 데이터 새로고침 이벤트 수신:', eventData.payload);
      if (eventData.payload.dataType === 'members' || eventData.payload.dataType === 'all') {
        loadUnifiedVoteData();
      }
    };

    // 이벤트 리스너 등록
    eventBus.on(EVENT_TYPES.MEMBER_ADDED, handleMemberAdded);
    eventBus.on(EVENT_TYPES.DATA_REFRESH_NEEDED, handleDataRefresh);

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      eventBus.off(EVENT_TYPES.MEMBER_ADDED, handleMemberAdded);
      eventBus.off(EVENT_TYPES.DATA_REFRESH_NEEDED, handleDataRefresh);
    };
  }, [loadUnifiedVoteData]);

  const homeGameSummary = useMemo(() => {
    const now = new Date();
    const footballGames = realTimeGames
      .filter((game: any) => {
        const gameDate = new Date(game?.date);
        return (
          !Number.isNaN(gameDate.getTime()) &&
          game?.confirmed !== false &&
          game?.eventType !== '회식'
        );
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const completedGames = footballGames.filter(
      (game: any) => new Date(game.date).getTime() <= now.getTime(),
    );
    const thisMonthGames = footballGames.filter((game: any) => {
      const gameDate = new Date(game.date);
      return (
        gameDate.getFullYear() === now.getFullYear() &&
        gameDate.getMonth() === now.getMonth()
      );
    });
    const thisMonthCompleted = thisMonthGames.filter(
      (game: any) => new Date(game.date).getTime() <= now.getTime(),
    ).length;
    const thisMonthUpcoming = Math.max(0, thisMonthGames.length - thisMonthCompleted);
    const recordedAttendanceTotal = completedGames.reduce(
      (sum: number, game: any) => sum + getGameParticipantNames(game).length,
      0,
    );
    const averageAttendance =
      completedGames.length > 0
        ? Math.round((recordedAttendanceTotal / completedGames.length) * 10) / 10
        : 0;
    return {
      completedGames,
      thisMonthGames,
      completedCount: completedGames.length,
      sinceLabel: 'Since 2025.3.12.',
      thisMonthCount: thisMonthGames.length,
      thisMonthCompleted,
      thisMonthUpcoming,
      averageAttendance,
    };
  }, [realTimeGames]);

  const bottomInfoData = useMemo(
    () => [
      {
        icon: '👥',
        title: '총 멤버',
        eyebrow: '활동 회원 기준',
        value: `${realTimeMemberCount}명`,
        action: 'members',
      },
      {
        icon: '🏆',
        title: '총 경기수',
        eyebrow: homeGameSummary.sinceLabel,
        value: `${homeGameSummary.completedCount}경기`,
        action: 'games',
      },
      {
        icon: '📅',
        title: '이번 달 경기',
        eyebrow: `완료 ${homeGameSummary.thisMonthCompleted} · 예정 ${homeGameSummary.thisMonthUpcoming}`,
        value: `${homeGameSummary.thisMonthCount}경기`,
        action: 'month',
      },
      {
        icon: '⚽',
        title: '평균 참석 인원',
        eyebrow: `완료 경기 ${homeGameSummary.completedCount}회 기준`,
        value: `${homeGameSummary.averageAttendance}명`,
        action: 'attendance',
      },
    ],
    [homeGameSummary, realTimeMemberCount],
  );

  const updateRealTimeMembers = useCallback((members: Member[]) => {
    realTimeMembersRef.current = members;
    setRealTimeMembers(members);
    setRealTimeMemberCount(members.length);
  }, []);

  // 실시간 멤버 데이터 fetch 함수
  const fetchRealTimeMembers = useCallback(async () => {
    try {
      console.log('🔄 MainDashboard - 회원 데이터 로드 시작');
      
      // API BASE URL 가져오기 (환경별 자동 감지)
      const baseUrl = await getApiBaseUrl();
      
      const response = await fetch(`${baseUrl}/members`, {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
      const data = await response.json();
        console.log('✅ MainDashboard - 회원 데이터 응답 성공:', data.members?.length || 0, '명');
        console.log('📊 MainDashboard - 전체 응답 데이터:', data);
      
      if (data.members && Array.isArray(data.members) && data.members.length > 0) {
        // 메인 총원은 실제 활동 회원만 카운트한다.
        const activeMembers = data.members.filter((member: Member) => 
          member.status === 'ACTIVE'
        );
        
          console.log('📋 MainDashboard - 활성 회원:', activeMembers.length, '명');
        updateRealTimeMembers(activeMembers);
        console.log('✅ MainDashboard - 멤버 카운트 업데이트:', activeMembers.length, '명');
      } else {
          console.log('⚠️ MainDashboard - 회원 데이터가 비어있음');
          updateRealTimeMembers([]);
        }
      } else {
        console.log('❌ MainDashboard - 회원 데이터 API 응답 실패:', response.status);
        updateRealTimeMembers([]);
      }
    } catch (error) {
      console.error('❌ MainDashboard - 회원 데이터 fetch 실패:', error);
      updateRealTimeMembers([]);
    }
  }, [updateRealTimeMembers]);

  // 투표 현황 데이터 fetch 함수 (통합 API 사용)
  const fetchVoteData = useCallback(async () => {
    try {
      console.log('🔄 MainDashboard - 통합 투표 데이터 로드 시작');
      
      // API BASE URL 가져오기 (환경별 자동 감지)
      const baseUrl = await getApiBaseUrl();
      
      // 통합 API에서 투표 데이터 가져오기
      const unifiedData = await fetch(`${baseUrl}/votes/unified`, {
        headers: getAuthHeaders(),
      });
      
      let data: any[] = [];
      
      if (unifiedData.ok) {
        const result = await unifiedData.json();
        console.log('✅ MainDashboard - 통합 투표 데이터 로드 성공:', result);
        
        if (result.activeSession && result.activeSession.votes) {
          data = result.activeSession.votes;
        }
      } else {
        // 폴백: localStorage에서 복원
        const stored = localStorage.getItem('voteResults');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            console.log('✅ MainDashboard - localStorage 폴백 투표 데이터:', parsed);
            
            if (parsed.voteSession && parsed.voteSession.votes && Array.isArray(parsed.voteSession.votes)) {
              data = parsed.voteSession.votes;
            }
          } catch (error) {
            console.error('❌ MainDashboard - localStorage 투표 데이터 파싱 오류:', error);
          }
        }
      }
      
      console.log('📊 MainDashboard - 최종 투표 데이터:', data?.length || 0, '개');
      setVoteData(data || []);
        
        // 투표 현황 요약 계산 (실제 회원 정보 기준)
        const membersSnapshot = realTimeMembersRef.current;
        const totalMembers = membersSnapshot.length;
        const normalizeId = (value: any): number => {
          if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? -1 : parsed;
          }
          if (typeof value === 'number') return value;
          return -1;
        };
        
        // 실제 회원 중에서만 투표한 인원 계산
        const memberIdSet = new Set<number>(
          membersSnapshot
            .map(member => normalizeId(member.id))
            .filter(id => id > -1)
        );
        const participants = new Set<number>();
        data.forEach((vote: any) => {
          const voteUserId = normalizeId(vote.userId);
          if (voteUserId > -1 && memberIdSet.has(voteUserId)) {
            participants.add(voteUserId);
          }
        });
        
        // 투표한 회원 이름들 (실제 회원 정보에서 가져오기)
        const votedMemberNames = Array.from(participants).map((userId: number) => {
          const member = membersSnapshot.find(m => normalizeId(m.id) === userId);
          return member ? member.name : `회원${userId}`;
        }).filter(Boolean);
        
        console.log('🔍 MainDashboard 투표 데이터 분석:', {
          totalMembers,
          memberIds: Array.from(memberIdSet),
          dataLength: data.length,
          participants: Array.from(participants),
          votedMemberNames
        });
        
        // 최다 투표일 계산 (실제 회원의 투표만)
        const dateVoteCount: { [key: string]: number } = {};
        data.forEach((vote: any) => {
          const voteUserId = normalizeId(vote.userId);
          if (voteUserId > -1 && memberIdSet.has(voteUserId) && vote.selectedDays && Array.isArray(vote.selectedDays)) {
            vote.selectedDays.forEach((date: string) => {
              if (date !== '불참') { // 불참은 제외
                // 날짜 형식 처리: "9월 24일(수)" 형태인지 확인
                let formattedDate = date;
                
                // 이미 한국어 형식인 경우 그대로 사용
                if (date.includes('월') && date.includes('일')) {
                  formattedDate = date;
                } else {
                  // ISO 형식인 경우 변환
                  try {
                    const dateObj = new Date(date);
                    if (!isNaN(dateObj.getTime())) {
                      const month = dateObj.getMonth() + 1;
                      const day = dateObj.getDate();
                      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
                      formattedDate = `${month}월 ${day}일(${dayOfWeek})`;
                    }
                  } catch (error) {
                    console.error('날짜 파싱 오류:', error, '원본 날짜:', date);
                    formattedDate = date; // 파싱 실패 시 원본 사용
                  }
                }
                
                dateVoteCount[formattedDate] = (dateVoteCount[formattedDate] || 0) + 1;
              }
            });
          }
        });
        
        let mostVotedDates: string[] = [];
        let mostVotedCount = 0;
        Object.entries(dateVoteCount).forEach(([date, count]) => {
          if (count > mostVotedCount) {
            mostVotedCount = count;
            mostVotedDates = [date];
          } else if (count === mostVotedCount && count > 0) {
            mostVotedDates.push(date);
          }
        });
        
        // 최다투표일을 문자열로 변환
        let mostVotedDate = '';
        if (mostVotedDates.length > 1) {
          // 동일 투표자수가 있는 복수의 날짜가 있는 경우 - 각 날짜별 줄바꿈
          mostVotedDate = mostVotedDates.join('\n');
        } else if (mostVotedDates.length === 1) {
          mostVotedDate = mostVotedDates[0];
        }
        
        console.log('📊 MainDashboard 최다투표일 분석:', {
          dateVoteCount,
          mostVotedDates,
          mostVotedCount,
          mostVotedDate
        });
        
        // 사용자 투표 여부 확인
        const currentUserId = user?.id;
        const userVoted = data.some((vote: any) => vote.userId === currentUserId);
        
        const summary = {
          totalMembers: totalMembers,
          votedMembers: participants.size, // 실제 회원 중 실제 참여한 인원 수
          voteRate: totalMembers > 0 ? Math.round((participants.size / totalMembers) * 100) : 0,
          votedMemberNames: votedMemberNames,
          mostVotedDate: mostVotedDate,
          mostVotedCount: mostVotedCount,
          userVoted: userVoted
        };
        
        console.log('📊 MainDashboard - 투표 현황 요약:', summary);
        setVoteSummary(summary);
    } catch (error) {
      console.error('❌ MainDashboard - 투표 데이터 fetch 실패:', error);
      setVoteData([]);
      setVoteSummary({
        totalMembers: 0,
        votedMembers: 0,
        voteRate: 0,
        votedMemberNames: [],
        mostVotedDate: '',
        mostVotedCount: 0,
        userVoted: false
      });
    }
  }, [user]);

  // 실시간 경기 데이터 fetch 함수
  const fetchRealTimeGames = useCallback(async () => {
    try {
      console.log('🔄 MainDashboard - 경기 데이터 로드 시작');
      
      // API BASE URL 가져오기 (환경별 자동 감지)
      const baseUrl = await getApiBaseUrl();
      
      const response = await fetch(`${baseUrl}/games`, {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ MainDashboard - 경기 데이터 응답 성공:', Array.isArray(data) ? data.length : (data.games?.length || 0), '경기');
        console.log('📊 MainDashboard - 전체 응답 데이터:', data);
        
        // /games 엔드포인트는 배열을 직접 반환하거나 {games: [...]} 형태일 수 있음
        const games = Array.isArray(data) ? data : (data.games || []);
        
        if (games && Array.isArray(games) && games.length > 0) {
          setRealTimeGames(games);
          console.log('✅ MainDashboard - 경기 카운트 업데이트:', games.length, '회');
        
        // 이번주 경기 찾기 (이번주 월요일~금요일)
        const today = new Date();
        const currentDay = today.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        
        // 이번주 월요일 계산
        let daysUntilMonday;
        if (currentDay === 0) { // 일요일
          daysUntilMonday = -6; // 지난 월요일
        } else if (currentDay === 1) { // 월요일
          daysUntilMonday = 0; // 오늘
        } else {
          daysUntilMonday = 1 - currentDay; // 이번주 월요일
        }
        
        const thisWeekMonday = new Date(today);
        thisWeekMonday.setDate(today.getDate() + daysUntilMonday);
        thisWeekMonday.setHours(0, 0, 0, 0);
        
        // 이번주 금요일 계산
        const thisWeekFriday = new Date(thisWeekMonday);
        thisWeekFriday.setDate(thisWeekMonday.getDate() + 4); // 월요일 + 4일 = 금요일
        thisWeekFriday.setHours(23, 59, 59, 999);
        
        const thisWeekGames = games.filter((game: any) => {
          const gameDate = new Date(game.date);
          return gameDate >= thisWeekMonday && gameDate <= thisWeekFriday;
        });
        
        if (thisWeekGames.length > 0) {
          // 가장 가까운 경기를 찾되, 시간이 설정된 경기를 우선으로
          const sortedGames = thisWeekGames.sort((a: any, b: any) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          });
          
          const nextGame = sortedGames[0];
          console.log('✅ MainDashboard - 이번주 경기 설정:', nextGame);
          setThisWeekGame({
            ...nextGame, // 모든 게임 정보를 포함
            date: nextGame.date,
            title: nextGame.eventType || '매치',
            description: `${nextGame.location}에서 진행`
          });
        } else {
          setThisWeekGame(null);
        }
        
        // 다음주 투표 정보 설정 (다음주 월요일 ~ 금요일)
        const nextWeekMonday = new Date(today);
        // 다음주 월요일 계산: 현재 요일이 월요일(1)이면 7일 후, 아니면 다음 월요일까지의 일수
        const daysUntilMondayNext = currentDay === 1 ? 7 : (8 - currentDay) % 7;
        nextWeekMonday.setDate(today.getDate() + daysUntilMondayNext);
        
        const nextWeekFriday = new Date(nextWeekMonday);
        nextWeekFriday.setDate(nextWeekMonday.getDate() + 4);
        
        console.log('다음주 투표 날짜 계산:', {
          today: today.toLocaleString(),
          currentDay,
          daysUntilMonday: daysUntilMondayNext,
          nextWeekMonday: nextWeekMonday.toLocaleString(),
          nextWeekFriday: nextWeekFriday.toLocaleString()
        });
        
        const formatDate = (date: Date) => {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
          const weekday = weekdays[date.getDay()];
          return `${month}월 ${day}일(${weekday})`;
        };
        
        setNextWeekVote({
          date: nextWeekMonday.toISOString(),
          title: '투표 진행중',
          description: '다음주 경기 일정 투표',
          deadline: `${formatDate(nextWeekMonday)} ~ ${formatDate(nextWeekFriday)}`
        });
        
        } else {
          console.log('⚠️ MainDashboard - 경기 데이터가 비어있음');
          setThisWeekGame(null);
          setNextWeekVote(null);
        }
      } else {
        console.log('❌ MainDashboard - 경기 데이터 API 응답 실패:', response.status);
        setThisWeekGame(null);
        setNextWeekVote(null);
      }
    } catch (error) {
      console.error('❌ MainDashboard - 경기 데이터 fetch 실패:', error);
      setThisWeekGame(null);
      setNextWeekVote(null);
    }
  }, []);

  // 멤버 데이터 가져오기 함수
  // 초기 로딩 시 실시간 데이터 fetch
  useEffect(() => {
    if (initialDataLoadedRef.current) return;
    initialDataLoadedRef.current = true;

    setLoading(true);
    setError(null);
    
    // 런타임에서 BASE_URL 가져오기
    const loadData = async () => {
      const baseUrl = await ensureApiBaseUrl().catch(() => '/api/auth');
      const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 8000, fallback: T): Promise<T> => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise<T>((resolve) => {
          timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
        });
        const result = await Promise.race([promise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        return result;
      };
    
    // 통계 데이터, 멤버 데이터, 경기 데이터, 투표 데이터를 모두 fetch
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token_backup');
    // 통합 투표 데이터는 백그라운드로 분리해서 첫 화면 블로킹 방지
    loadUnifiedVoteData().catch(() => undefined);
    Promise.all([
      // 통계 API 호출 (로그인 시에만)
      token 
        ? withTimeout(
            fetch(`${baseUrl}/members/stats`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(res => res.json())
              .catch(() => null),
            6000,
            null
          )
        : Promise.resolve(null),
      withTimeout(fetchRealTimeMembers(), 8000, undefined),
      // 경기 데이터 가져오기
      withTimeout(fetchRealTimeGames(), 8000, undefined)
    ]).then(([statsData]) => {
      if (statsData && !statsData.error) {
        setStats({
          totalMembers: statsData.totalMembers || 0,
          totalGames: 0, // 이 필드는 현재 API에 없음
          thisWeekGames: statsData.thisWeekGames || 0,
          nextWeekVotes: statsData.nextWeekVotes || 0
        });
      } else {
        // API 실패 시 기본값 사용
        setStats({
          totalMembers: 0,
          totalGames: 0,
          thisWeekGames: 0,
          nextWeekVotes: 0
        });
      }
      setLoading(false);
    }).catch((error) => {
      console.error('데이터 로딩 실패:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setStats({
        totalMembers: 0,
        totalGames: 0,
        thisWeekGames: 0,
        nextWeekVotes: 0
      });
      setLoading(false);
    });
    };

    loadData();
  }, [fetchRealTimeMembers, fetchRealTimeGames, loadUnifiedVoteData]);

  // 투표 데이터는 초기 로드 + 주기적 갱신에서만 호출 (불필요한 반복 호출 방지)



  // 주기적으로 멤버 데이터와 경기 데이터 업데이트 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealTimeMembers();
      fetchRealTimeGames();
      fetchVoteData();
      loadUnifiedVoteData(); // 통합 투표 데이터도 함께 업데이트
    }, 1 * 60 * 1000); // 1분

    return () => clearInterval(interval);
  }, [fetchRealTimeMembers, fetchRealTimeGames, fetchVoteData, loadUnifiedVoteData]);

  // 투표 데이터 변경 이벤트 리스너
  useEffect(() => {
    const handleVoteDataChanged = () => {
      console.log('🏠 홈 화면: 투표 데이터 변경 이벤트 수신');
      loadUnifiedVoteData();
    };

    window.addEventListener('voteDataChanged', handleVoteDataChanged);
    // 경기/회원 변경 이벤트도 즉시 반영
    const handleGamesChanged = () => {
      console.log('🏠 홈 화면: 경기 변경 이벤트 수신');
      fetchRealTimeGames();
      loadUnifiedVoteData();
    };
    const handleMembersChanged = () => {
      console.log('🏠 홈 화면: 회원 변경 이벤트 수신');
      fetchRealTimeMembers();
      loadUnifiedVoteData();
    };
    window.addEventListener('gamesChanged', handleGamesChanged);
    window.addEventListener('membersChanged', handleMembersChanged);
    return () => {
      window.removeEventListener('voteDataChanged', handleVoteDataChanged);
      window.removeEventListener('gamesChanged', handleGamesChanged);
      window.removeEventListener('membersChanged', handleMembersChanged);
    };
  }, [loadUnifiedVoteData]);

  // 페이지 포커스 시에도 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      fetchRealTimeMembers();
      fetchRealTimeGames();
      fetchVoteData();
      loadUnifiedVoteData(); // 통합 투표 데이터도 함께 새로고침
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchRealTimeMembers, fetchRealTimeGames, fetchVoteData, loadUnifiedVoteData]);

  // 유튜브 영상 fetch (최신 3개 자동)
  const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  const PLAYLIST_ID = 'PLQ5o2f7efzlZ-RDG64h4Oj_5pXt0g6q3b';
  const [youtubeVideos, setYoutubeVideos] = useState(fallbackVideos);
  useEffect(() => {
    if (!YT_API_KEY) {
      setYoutubeVideos(fallbackVideos);
      return;
    }
    fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${PLAYLIST_ID}&key=${YT_API_KEY}`)
      .then(res => res.json())
      .then(async (data: { items?: { snippet: { resourceId: { videoId: string }, title: string } }[] }) => {
        if (!data.items || data.items.length === 0) {
          setYoutubeVideos(fallbackVideos);
          return;
        }

        // 1차: 플레이리스트에서 id/제목만 추출
        const playlistVideos = data.items
          .map((item) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
          }))
          .filter(v => !!v.id);

        if (playlistVideos.length === 0) {
          setYoutubeVideos(fallbackVideos);
          return;
        }

        try {
          // 2차: videos API로 privacyStatus 확인 (private / deleted 등 제거)
          const idsParam = playlistVideos.map(v => v.id).join(',');
          const statusRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=status&id=${idsParam}&key=${YT_API_KEY}`
          );
          const statusJson: { items?: { id: string; status?: { privacyStatus?: string } }[] } = await statusRes.json();

          const statusMap: Record<string, string> = {};
          statusJson.items?.forEach(item => {
            if (item.id && item.status?.privacyStatus) {
              statusMap[item.id] = item.status.privacyStatus;
            }
          });

          const filteredByStatus = playlistVideos.filter(v => {
            const privacy = statusMap[v.id];
            if (privacy) {
              // status 가 있으면 public 만 사용
              return privacy === 'public';
            }
            // status 없으면 제목 기반 필터만
            const title = (v.title || '').toLowerCase();
            return !title.includes('deleted video') && 
                   !title.includes('private video') && 
                   !title.includes('unavailable') &&
                   !title.includes('삭제') &&
                   !title.includes('비공개') &&
                   v.title.trim() !== '';
          });

          const finalVideos = (filteredByStatus.length > 0 ? filteredByStatus : playlistVideos).slice(0, 3);

          if (finalVideos.length > 0) {
            setYoutubeVideos(finalVideos);
          } else {
            setYoutubeVideos(fallbackVideos);
          }
        } catch (e) {
          console.error('YouTube videos 상태 확인 실패:', e);
          // videos API 실패 시 제목 기반 필터
          const fallbackList = playlistVideos
            .filter((v) => {
              if (!v.id) return false;
              const title = (v.title || '').toLowerCase();
              return !title.includes('deleted video') && 
                     !title.includes('private video') && 
                     !title.includes('unavailable') &&
                     !title.includes('삭제') &&
                     !title.includes('비공개') &&
                     v.title.trim() !== '';
            })
            .slice(0, 3);

          setYoutubeVideos(fallbackList.length > 0 ? fallbackList : fallbackVideos);
        }
      })
      .catch(() => setYoutubeVideos(fallbackVideos));
  }, [YT_API_KEY]);

  // 유튜브 IFrame Player는 외부 라이브러리로 동작하며, 최신화 fetch만 사용합니다.

  const [videoIdx, setVideoIdx] = useState<number>(0);
  const currentVideo = youtubeVideos[videoIdx] || fallbackVideos[0] || { id: 'AAftIIK3MOg', title: '기본 영상' };
  
  // 삭제된/비공개 영상 감지 시 다음 영상으로 단순 이동
  const handleVideoError = useCallback(() => {
    console.log('영상 재생 오류 감지, 다음 영상으로 이동:', currentVideo.id);
    setVideoIdx((idx: number) => {
      if (youtubeVideos.length === 0) return 0;
      return (idx + 1) % youtubeVideos.length;
    });
  }, [currentVideo.id, youtubeVideos.length]);

  /** IFrame API가 허용하는 범위에서 최고 화질을 우선 요청한다. */
  const applyYoutubeBestQuality = useCallback((player: any) => {
    try {
      const levels: string[] | undefined = player?.getAvailableQualityLevels?.();
      const qualityOrder = [
        'highres',
        'hd2160',
        'hd1440',
        'hd1080',
        'hd720',
        'large',
        'medium',
        'small',
        'tiny',
      ];
      const bestAvailable =
        qualityOrder.find((quality) => levels?.includes(quality)) || levels?.[0] || 'highres';
      player.setPlaybackQuality?.(bestAvailable);
    } catch {
      try {
        player.setPlaybackQuality?.('highres');
      } catch {
        /* 무시 */
      }
    }
  }, []);

  // 동영상 인덱스 이동 (최신화된 리스트에 맞게)
  const handlePrev = () => {
    setVideoIdx((idx: number) => {
      if (youtubeVideos.length === 0) return 0;
      return idx === 0 ? youtubeVideos.length - 1 : idx - 1;
    });
  };
  
  const handleNext = () => {
    setVideoIdx((idx: number) => {
      if (youtubeVideos.length === 0) return 0;
      return (idx + 1) % youtubeVideos.length;
    });
  };

  // 상세 모달 상태
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalIdx, setModalIdx] = useState<number | null>(null);

  // 멤버 리스트 상태
  const [membersLoading, setMembersLoading] = useState(false);

  // 모달 열릴 때 멤버 리스트 fetch
  useEffect(() => {
    if (isOpen && modalIdx === 0) {
      setMembersLoading(true);
      // 직접 API 호출 (인증 토큰 포함)
      (async () => {
        try {
          // 런타임에서 BASE_URL 가져오기
          const baseUrl = await ensureApiBaseUrl().catch(() => '/api/auth');
          
          const response = await fetch(`${baseUrl}/members`, {
            headers: getAuthHeaders(),
          });
          
          if (response.ok) {
            const data = await response.json();
          if (data.members && data.members.length > 0) {
              updateRealTimeMembers(data.members);
          } else {
            // API 실패 시 빈 배열 사용
              updateRealTimeMembers([]);
            }
          } else {
            updateRealTimeMembers([]);
          }
        } catch (error) {
          console.log('멤버 API 실패, 빈 데이터 사용:', error);
          updateRealTimeMembers([]);
        } finally {
          setMembersLoading(false);
        }
      })();
    }
  }, [isOpen, modalIdx]);

  // 투표 모달 열릴 때 투표 데이터 fetch
  useEffect(() => {
    if (isOpen && modalIdx === 3) { // 다음주 경기 투표하기 모달
      // 모달에서는 unifiedVoteData만 사용하므로 중복 API 호출을 줄여 체감 로딩 개선
      loadUnifiedVoteData(); // 통합 투표 데이터도 함께 로드
    }
  }, [isOpen, modalIdx, loadUnifiedVoteData]);

  // 상세 내용 생성 함수
  function getDetailContent(idx: number) {
    if (!stats) return null;
    switch (idx) {
      case 0:
        return (
          <Box>
            <Box textAlign="center" mb={2}>
              <Text fontSize="2xl" fontWeight="bold" display="inline-block" verticalAlign="middle" mr={2}>👥</Text>
              <Text fontSize="xl" fontWeight="bold" display="inline-block" verticalAlign="middle">총 멤버: {realTimeMemberCount}명</Text>
            </Box>

            {membersLoading ? (
              <Text color="gray.500">멤버 목록을 불러오는 중...</Text>
            ) : (
              <Box maxH="200px" overflowY="auto" mt={2} display="flex" flexWrap="wrap" gap={2} justifyContent="center">
                {realTimeMembers.length > 0 ? realTimeMembers
                  .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
                  .map((m) => (
                    <Box 
                      key={m.id} 
                      px={3} 
                      py={1} 
                      borderRadius="full" 
                      bg="#2563eb" 
                      color="white" 
                      fontWeight="medium" 
                      fontSize="xs" 
                      mr={2} 
                      mb={2} 
                      display="inline-block"
                      boxShadow="0 1px 3px rgba(0,0,0,0.1)"
                      _hover={{ 
                        transform: 'translateY(-1px)', 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {m.name}
                    </Box>
                  )) : (
                  <Text color="gray.500">멤버 데이터를 불러오는 중...</Text>
                )}
              </Box>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
             {thisWeekGame ? (
               <VStack spacing={1.5} align="stretch">
                 {/* 유형 */}
                 <Flex align="center" gap={2}>
                   <Box as="span" fontSize="md">⚽</Box>
                   <Text fontSize="sm" fontWeight="medium">
                     유형: {(() => {
                       const eventType = thisWeekGame.eventType || '자체';
                       if (['풋살', 'FRIENDLY', 'FRIENDLY_MATCH'].includes(eventType)) return '매치';
                       if (!['매치', '자체', '회식', '기타'].includes(eventType)) return '기타';
                       return eventType;
                     })()}
                   </Text>
                 </Flex>

                 {/* 일시 */}
                 <Box mt="-15px">
                 <Flex align="center" gap={2}>
                   <Box as="span" fontSize="md">🕐</Box>
                   <Text fontSize="sm" fontWeight="medium">
                     일시: {(() => {
                       if (thisWeekGame.date && thisWeekGame.time) {
                         const date = new Date(thisWeekGame.date);
                         const month = date.getMonth() + 1;
                         const day = date.getDate();
                         const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                         return `${month}월 ${day}일(${dayOfWeek}) ${thisWeekGame.time}`;
                       } else if (thisWeekGame.date) {
                         const date = new Date(thisWeekGame.date);
                         const month = date.getMonth() + 1;
                         const day = date.getDate();
                         const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                         return `${month}월 ${day}일(${dayOfWeek})`;
                       }
                       return '일시 미정';
                     })()}
                   </Text>
                 </Flex>
                 </Box>

                 {/* 장소 */}
                 <Box mt="-15px">
                 <Flex align="center" justify="space-between">
                   <Flex align="center" gap={2}>
                     <Box as="span" fontSize="md">📍</Box>
                     <Text fontSize="sm" fontWeight="medium">
                       장소: {thisWeekGame.location || '장소 미정'}
                     </Text>
                   </Flex>
                   {thisWeekGame.location && (
                     <Button
                       size="xs"
                       height="22px"
                       minW="22px"
                       fontSize="11px"
                       p={0}
                       bg="yellow.400"
                       color="blue.600"
                       onClick={() => {
                         // location에서 세부 장소 제거 (마지막 공백 이후 부분 제거)
                         const location = thisWeekGame.location || '';
                         const locationBase = location.includes(' ') ? location.substring(0, location.lastIndexOf(' ')) : location;
                         const searchQuery = encodeURIComponent(locationBase);
                         window.open(`https://map.kakao.com/link/search/${searchQuery}`, '_blank');
                       }}
                     >
                       K
                     </Button>
                   )}
                 </Flex>
                 </Box>

                 {/* 참석자 정보 */}
                 <Box mt="-15px">
                 <Flex align="center" gap={2}>
                   <Box as="span" fontSize="md">👥</Box>
                   <Text fontSize="sm" fontWeight="medium">
                     참석자 정보: {(() => {
                       const selectedMembers = Array.isArray(thisWeekGame.selectedMembers) ? 
                         thisWeekGame.selectedMembers : 
                         (typeof thisWeekGame.selectedMembers === 'string' ? 
                           JSON.parse(thisWeekGame.selectedMembers) : []);
                       const memberNames = Array.isArray(thisWeekGame.memberNames) ? 
                         thisWeekGame.memberNames : 
                         (typeof thisWeekGame.memberNames === 'string' ? 
                           JSON.parse(thisWeekGame.memberNames) : []);
                       const mercenaryCount = thisWeekGame.mercenaryCount || 0;
                       
                       const totalCount = selectedMembers.length + memberNames.length + mercenaryCount;
                       return totalCount;
                     })()}명
                   </Text>
                   <Text fontSize="xs" whiteSpace="nowrap">
                     ({(() => {
                       const selectedMembers = Array.isArray(thisWeekGame.selectedMembers) ? 
                         thisWeekGame.selectedMembers : 
                         (typeof thisWeekGame.selectedMembers === 'string' ? 
                           JSON.parse(thisWeekGame.selectedMembers) : []);
                       const memberNames = Array.isArray(thisWeekGame.memberNames) ? 
                         thisWeekGame.memberNames : 
                         (typeof thisWeekGame.memberNames === 'string' ? 
                           JSON.parse(thisWeekGame.memberNames) : []);
                       
                       const parts = [];
                       if (selectedMembers && selectedMembers.length > 0) {
                         parts.push({ text: `회원 ${selectedMembers.length}명`, color: '#004ea8' });
                       }
                       if (memberNames && memberNames.length > 0) {
                         parts.push({ text: `수기입력 ${memberNames.length}명`, color: '#ff6b35' });
                       }
                       if (thisWeekGame.mercenaryCount && thisWeekGame.mercenaryCount > 0) {
                         parts.push({ text: `용병 ${thisWeekGame.mercenaryCount}명`, color: '#000000' });
                       }
                       
                       return parts.length > 0 ? (
                         <span>
                           {parts.map((part, index) => (
                             <span
                               key={index}
                               style={{
                                 color: part.color,
                                 fontWeight: '500'
                               }}
                             >
                               {part.text}{index < parts.length - 1 ? ' + ' : ''}
                             </span>
                           ))}
                         </span>
                       ) : '참석자 없음';
                     })()})
                   </Text>
                 </Flex>
                 </Box>

                 {/* 참석자 목록 */}
                 {(() => {
                   const selectedMembers = Array.isArray(thisWeekGame.selectedMembers) ? 
                     thisWeekGame.selectedMembers : 
                     (typeof thisWeekGame.selectedMembers === 'string' ? 
                       JSON.parse(thisWeekGame.selectedMembers) : []);
                   const memberNames = Array.isArray(thisWeekGame.memberNames) ? 
                     thisWeekGame.memberNames : 
                     (typeof thisWeekGame.memberNames === 'string' ? 
                       JSON.parse(thisWeekGame.memberNames) : []);
                   const mercenaryCount = thisWeekGame.mercenaryCount || 0;
                   
                   const allParticipants: Array<{name: string, type: 'member' | 'mercenary' | 'other'}> = [];
                   
                   // 회원 추가
                   if (selectedMembers && selectedMembers.length > 0) {
                     selectedMembers.forEach((name: string) => {
                       allParticipants.push({ name, type: 'member' });
                     });
                   }
                   
                   // 수기입력 인원 추가
                   if (memberNames && memberNames.length > 0) {
                     memberNames.forEach((name: string) => {
                       allParticipants.push({ name, type: 'other' });
                     });
                   }
                   
                   // 용병 추가 (단일 뱃지로)
                   if (mercenaryCount > 0) {
                     allParticipants.push({ name: `용병 ${mercenaryCount}명`, type: 'mercenary' });
                   }
                   
                   
                   return allParticipants.length > 0 ? (
                     <Flex wrap="wrap" gap={1} justify="center">
                       {allParticipants.map((participant, index) => (
                         <Badge
                           key={index}
                           bg={
                             participant.type === 'member' ? '#004ea8' : 
                             participant.type === 'mercenary' ? '#000000' : 
                             '#ff6b35'
                           }
                           color="white"
                           variant="solid"
                           borderRadius="full"
                           px={2}
                           py={0.5}
                           fontSize="xs"
                         >
                           {participant.name}
                         </Badge>
                       ))}
                     </Flex>
                   ) : null;
                 })()}
               </VStack>
             ) : (
               <Text textAlign="center" color="gray.500">
                 이번주 경기가 없습니다.
               </Text>
            )}
          </Box>
        );
      case 2: {
        const games = [...homeGameSummary.completedGames].reverse();
        return (
          <VStack spacing={4} align="stretch">
            <Flex
              bg="#EFF6FF"
              border="1px solid"
              borderColor="#BFDBFE"
              borderRadius="xl"
              px={4}
              py={3}
              align="center"
              justify="space-between"
            >
              <Box>
                <Text color="#334155" fontSize="xs" fontWeight="700">
                  {homeGameSummary.sinceLabel}
                </Text>
                <Text color="#0F172A" fontWeight="800">
                  완료된 경기 기록
                </Text>
              </Box>
              <Text color="#0057B8" fontSize="2xl" fontWeight="900">
                {games.length}경기
              </Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} maxH="430px" overflowY="auto" pr={1}>
              {games.map((game: any) => {
                const participantNames = getGameParticipantNames(game);
                const guestNames = parseNameList(game.memberNames);
                const mercenaryCount = Number(game.mercenaryCount || 0);
                const tooltipContent = (
                  <VStack align="start" spacing={1.5} py={1}>
                    <Text fontWeight="900">
                      {getGameDateLabel(game.date)} {game.time || ''}
                    </Text>
                    <Text>📍 {game.location || '장소 미정'}</Text>
                    <Text>
                      👥 참석 {participantNames.length}명 ·{' '}
                      {participantNames.join(', ') || '기록 없음'}
                    </Text>
                    {(guestNames.length > 0 || mercenaryCount > 0) && (
                      <Text>
                        🟠 외부 인원{' '}
                        {[guestNames.join(', '), mercenaryCount > 0 ? `용병 ${mercenaryCount}명` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
                  </VStack>
                );

                return (
                  <Tooltip
                    key={game.id}
                    label={tooltipContent}
                    placement="top"
                    hasArrow
                    bg="#0F2A4A"
                    color="white"
                    borderRadius="lg"
                    px={3}
                    py={2}
                    maxW="340px"
                    fontSize="sm"
                    openDelay={180}
                  >
                    <Box
                      tabIndex={0}
                      bg="white"
                      border="1px solid"
                      borderColor="#E2E8F0"
                      borderRadius="xl"
                      px={3.5}
                      py={3}
                      cursor="help"
                      transition="all 0.18s ease"
                      _hover={{
                        transform: 'translateY(-2px)',
                        borderColor: '#60A5FA',
                        boxShadow: '0 8px 18px rgba(37,99,235,0.12)',
                      }}
                      _focusVisible={{
                        outline: '3px solid rgba(37,99,235,0.28)',
                        outlineOffset: '2px',
                      }}
                    >
                      <HStack justify="space-between" align="start">
                        <Box minW={0}>
                          <Text color="#0F172A" fontWeight="800" fontSize="sm">
                            {getGameDateLabel(game.date)}
                          </Text>
                          <Text color="#475569" fontSize="xs" mt={1} noOfLines={1}>
                            {game.location || '장소 미정'}
                          </Text>
                        </Box>
                        <Badge
                          bg={game.eventType === '매치' ? '#DBEAFE' : '#D1FAE5'}
                          color={game.eventType === '매치' ? '#1D4ED8' : '#047857'}
                          flexShrink={0}
                        >
                          {game.eventType || '자체'}
                        </Badge>
                      </HStack>
                      <Text color="#0057B8" fontSize="xs" fontWeight="800" mt={2}>
                        참석 {participantNames.length}명 · 마우스를 올려 상세 확인
                      </Text>
                    </Box>
                  </Tooltip>
                );
              })}
            </SimpleGrid>
          </VStack>
        );
      }
      case 4: {
        const now = new Date();
        const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
        const monthGames = [...homeGameSummary.thisMonthGames].sort(
          (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        return (
          <VStack spacing={4} align="stretch">
            <SimpleGrid columns={3} spacing={2}>
              {[
                { label: '전체', value: homeGameSummary.thisMonthCount, color: '#0057B8' },
                { label: '완료', value: homeGameSummary.thisMonthCompleted, color: '#047857' },
                { label: '예정', value: homeGameSummary.thisMonthUpcoming, color: '#7C3AED' },
              ].map((item) => (
                <Box
                  key={item.label}
                  bg="#F8FAFC"
                  border="1px solid"
                  borderColor="#E2E8F0"
                  borderRadius="xl"
                  py={3}
                  textAlign="center"
                >
                  <Text color="#64748B" fontSize="xs" fontWeight="700">
                    {item.label}
                  </Text>
                  <Text color={item.color} fontSize="2xl" fontWeight="900">
                    {item.value}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            <Text color="#334155" fontSize="sm" fontWeight="800">
              {monthLabel} 경기 요약
            </Text>
            {monthGames.length > 0 ? (
              <VStack spacing={2.5} align="stretch" maxH="380px" overflowY="auto" pr={1}>
                {monthGames.map((game: any) => {
                  const gameDate = new Date(game.date);
                  const isCompleted = gameDate.getTime() <= now.getTime();
                  const participantNames = getGameParticipantNames(game);
                  return (
                    <Box
                      key={game.id}
                      bg="white"
                      border="1px solid"
                      borderColor="#E2E8F0"
                      borderRadius="xl"
                      px={4}
                      py={3}
                    >
                      <HStack justify="space-between" align="start">
                        <Box minW={0}>
                          <HStack spacing={2}>
                            <Text color="#0F172A" fontWeight="900">
                              {getGameDateLabel(game.date)}
                            </Text>
                            <Text color="#475569" fontSize="sm">
                              {game.time || ''}
                            </Text>
                          </HStack>
                          <Text color="#475569" fontSize="sm" mt={1}>
                            {game.location || '장소 미정'}
                          </Text>
                          <Text color="#64748B" fontSize="xs" mt={2} noOfLines={2}>
                            {participantNames.length > 0
                              ? `참석 ${participantNames.length}명 · ${participantNames.join(', ')}`
                              : isCompleted
                                ? '참석 기록 없음'
                                : '참석자 확정 대기'}
                          </Text>
                        </Box>
                        <Badge
                          bg={isCompleted ? '#D1FAE5' : '#EDE9FE'}
                          color={isCompleted ? '#047857' : '#6D28D9'}
                          flexShrink={0}
                        >
                          {isCompleted ? '완료' : '예정'}
                        </Badge>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Box bg="#F8FAFC" borderRadius="xl" py={10} textAlign="center">
                <Text color="#64748B">이번 달 등록된 경기가 없습니다.</Text>
              </Box>
            )}
            <Button
              bg="#0057B8"
              color="white"
              _hover={{ bg: '#003F86' }}
              onClick={() => {
                onClose();
                navigate('/schedule-v2');
              }}
            >
              일정에서 자세히 보기
            </Button>
          </VStack>
        );
      }
      case 3:
        return (
          <Box>
            {normalizedVoteSession ? (
              <Box>
                {/* 투표 기간 */}
                <Box bg="blue.50" px={4} py={2.5} borderRadius="lg" mb={2.5} position="relative">
                  <Flex align="center" mb={3}>
                    <Text fontSize="lg" mr={2}>🗓️</Text>
                    <Text fontSize="lg" fontWeight="bold">투표 기간</Text>
                  </Flex>
              <Box textAlign="center" mt="-28px">
                    <Text fontSize="md" color="gray.700" fontWeight="medium">
                      {(() => {
                        const session = normalizedVoteSession;
                        const weekStartDate = new Date(session.weekStartDate);
                        const weekEndDate = new Date(weekStartDate.getTime() + 4 * 24 * 60 * 60 * 1000); // 금요일
                        
                        const formatDate = (date: Date) => {
                          const month = date.getMonth() + 1;
                          const day = date.getDate();
                          const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                          return `${month}월 ${day}일(${dayOfWeek})`;
                        };
                        
                        return `${formatDate(weekStartDate)} ~ ${formatDate(weekEndDate)}`;
                      })()}
                    </Text>
              </Box>
                  {/* 투표 상태 pill */}
                  <Box position="absolute" top={3} right={3}>
                    {(() => {
                      const session = normalizedVoteSession;
                      const isVoteClosed = !session.isActive;
                      return (
                        <Badge 
                          bg={isVoteClosed ? "red.500" : "purple.500"} 
                          color="white" 
                          fontSize="xs" 
                          px={2} 
                          py={1} 
                          borderRadius="full"
                        >
                          {isVoteClosed ? "투표종료" : "투표 중"}
                        </Badge>
                      );
                    })()}
                  </Box>
                </Box>
                
                {/* 투표 현황 요약 */}
                <Box bg="gray.50" px={3} py={2.5} borderRadius="lg" mb={2.5}>
                  <Flex align="center" mb={3}>
                    <Text fontSize="lg" mr={2}>📊</Text>
                    <Text fontSize="lg" fontWeight="bold">투표 현황 요약</Text>
                  </Flex>
                  <Flex direction={{ base: 'column', md: 'row' }} gap={3}>
                    <Box flex={0.4} bg="white" px={3} py={2} borderRadius="md">
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text fontSize="sm" color="gray.600">투표 참여</Text>
                        <Tooltip
                          label={(() => {
                            if (!normalizedVoteSession) return '투표 세션이 없습니다.';
                            
                            const session = normalizedVoteSession;
                            const participants = session.participants || [];
                            const allMembers = unifiedVoteData.allMembers || [];
                            
                            // 참여자 이름들(중복 제거)
                            const participantNames = Array.from(new Set(participants.map((p: any) => p.userName).filter(Boolean)));
                            
                            // 미참여자 이름들
                            const participantIds = Array.from(new Set(participants.map((p: any) => p.userId)));
                            const nonParticipantNames = allMembers
                              .filter((member: any) => !participantIds.includes(member.id))
                              .map((member: any) => member.name);
                            
                            return `참여자:\n${participantNames.join('\n') || '-'}\n\n미참여자:\n${nonParticipantNames.join('\n') || '-'}`;
                          })()}
                          placement="top"
                          hasArrow
                          bg="blue.600"
                          color="white"
                          fontSize="sm"
                          whiteSpace="pre-line"
                        >
                          <Text fontSize="sm" fontWeight="semibold" color="blue.600" cursor="pointer">
                            {(normalizedVoteSession?.totalParticipants || 0)}/{unifiedVoteData?.allMembers?.length || 0}
                          </Text>
                        </Tooltip>
                      </Flex>
                      {(() => {
                        const participants = normalizedVoteSession?.participants || [];
                        if (participants.length === 0) {
                          return (
                            <Text fontSize="xs" color="gray.400" textAlign="center" mt={2}>
                              아직 투표한 인원이 없습니다.
                            </Text>
                          );
                        }
                        return (
                          <Wrap mt={2} spacing={1}>
                            {participants.map((p: any) => (
                              <WrapItem key={`${p.userId}-${p.votedAt || ''}`}>
                                <Tag size="sm" variant="subtle" colorScheme="blue" borderRadius="full" px={2} whiteSpace="normal" wordBreak="keep-all" lineHeight="1.3">
                                  {p.userName || '이름없음'}
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        );
                      })()}
                    </Box>
                    <Box flex={0.6} bg="white" px={3} py={2} borderRadius="md">
                      <Text fontSize="sm" color="gray.600" mb={2}>최다투표일</Text>
                      {(() => {
                        if (!normalizedVoteSession?.results) {
                          return <Text fontSize="md" fontWeight="bold" color="green.600">투표 없음</Text>;
                        }
                        
                        const results = normalizedVoteSession.results;
                        const session = normalizedVoteSession;
                        const weekStartDate = new Date(session.weekStartDate);
                        
                        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
                        const dayNames = ['월', '화', '수', '목', '금'];
                        
                        // 최대 투표 수 찾기
                        let maxVotes = 0;
                        days.forEach(day => {
                          const dayResult = results[day];
                          const voteCount = dayResult ? dayResult.count || 0 : 0;
                          if (voteCount > maxVotes) {
                            maxVotes = voteCount;
                          }
                        });
                        
                        if (maxVotes === 0) {
                          return <Text fontSize="md" fontWeight="bold" color="green.600">투표 없음</Text>;
                        }
                        
                        // 최대 투표 수를 가진 모든 날짜 찾기
                        const maxVoteDays = [];
                        days.forEach(day => {
                          const dayResult = results[day];
                          const voteCount = dayResult ? dayResult.count || 0 : 0;
                          if (voteCount === maxVotes) {
                            const dayIndex = days.indexOf(day);
                            const dayName = dayNames[dayIndex];
                            
                            // 해당 요일의 실제 날짜 계산
                            const actualDate = new Date(weekStartDate);
                            actualDate.setDate(weekStartDate.getDate() + dayIndex);
                            
                            const month = actualDate.getMonth() + 1;
                            const dayNum = actualDate.getDate();
                            
                            maxVoteDays.push(`${month}월 ${dayNum}일(${dayName})`);
                          }
                        });
                        
                        return (
                          <Flex direction="row" gap={2} align="center">
                            <Box flex={0.7}>
                              <Text fontSize="md" fontWeight="bold" color="green.600" whiteSpace="pre-line">
                                {maxVoteDays.join('\n')}
                              </Text>
                            </Box>
                            <Box flex={0.3} textAlign="center">
                              <Badge bg="green.600" color="white" fontSize="xs" px={2} py={1} borderRadius="full">
                                {maxVotes}명
                              </Badge>
                            </Box>
                          </Flex>
                        );
                      })()}
                    </Box>
                  </Flex>
                </Box>

                <Flex justify="flex-end">
                  <Button
                    colorScheme="blue"
                    size="sm"
                    onClick={() => {
                      onClose();
                      // 일부 환경에서 라우터 navigate가 모달 닫힘과 경합되는 케이스가 있어 강제 이동 사용
                      if (typeof window !== 'undefined') {
                        window.location.href = '/schedule-v2';
                      } else {
                        navigate('/schedule-v2');
                      }
                    }}
                  >
                    투표하러 가기
                  </Button>
                </Flex>
              </Box>
            ) : (
              <Text textAlign="center" color="gray.500">
                다음주 투표 정보가 없습니다.
              </Text>
            )}
          </Box>
        );
      default:
        return null;
    }
  }

  const nextMatchDisplay = (() => {
    if (!matchdayGame) return null;
    const gameDate = new Date(matchdayGame.date);
    if (Number.isNaN(gameDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matchDateOnly = new Date(gameDate);
    matchDateOnly.setHours(0, 0, 0, 0);
    const diffDays = Math.max(
      0,
      Math.round((matchDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const dayName = ['일', '월', '화', '수', '목', '금', '토'][gameDate.getDay()];
    const eventType =
      ['풋살', 'FRIENDLY', 'FRIENDLY_MATCH'].includes(matchdayGame.eventType)
        ? '매치'
        : matchdayGame.eventType || '자체';
    const location = matchdayGame.location || '장소 확정 대기';
    const mapQuery = matchdayGame.locationAddress || location;

    return {
      badge: diffDays === 0 ? 'TODAY' : `D-${diffDays}`,
      dateLabel: `${gameDate.getMonth() + 1}월 ${gameDate.getDate()}일 ${dayName}요일`,
      timeLabel: matchdayGame.time || '시간 확정 대기',
      location,
      eventType,
      mapUrl: `https://map.kakao.com/?q=${encodeURIComponent(mapQuery)}`,
    };
  })();






  return (
    <Box
      minH="100vh"
      bg="#f7f9fb"
      w="100%"
      pt="21mm"
      overflowX="hidden"
      sx={{
        '@media (min-width: 1280px) and (min-height: 820px) and (max-resolution: 1.25dppx)': {
          height: '100vh',
          overflowY: 'hidden',
        },
      }}
    >
      {/* 음악 on/off 버튼 (드래그 가능한 플로팅 버튼) */}
      <IconButton
        ref={buttonRef}
        aria-label={isMusicEnabled ? '음악 끄기' : '음악 켜기'}
        icon={isMusicEnabled ? <MdMusicNote size={16} /> : <MdMusicOff size={16} />}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        position="fixed"
        left={`${buttonPosition.x}px`}
        top={`${buttonPosition.y}px`}
        zIndex={1000}
        bg={isMusicEnabled ? "#004ea8" : "gray.400"}
        color="white"
        borderRadius="full"
        boxShadow="lg"
        _hover={{ bg: isMusicEnabled ? "#00397a" : "gray.500", transform: 'scale(1.05)' }}
        transition={isDragging ? 'none' : 'all 0.2s'}
        size="sm"
        width="32px"
        height="32px"
        cursor={isDragging ? 'grabbing' : 'grab'}
      />
      
      <Flex
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 5, lg: 7 }}
        px={{ base: 4, md: 5, lg: 6 }}
        pt={{ base: 6, lg: 5 }}
        pb={{ base: 5, lg: 4 }}
        w="full"
        maxW="1400px"
        mx="auto"
        align="stretch"
        overflowX="hidden"
      >
        {/* 다음 경기 핵심 카드 */}
        <Box
          flex={{ base: '1', md: '0 0 32%' }}
          position="relative"
          overflow="hidden"
          p={{ base: 6, md: 7, lg: 8 }}
          borderRadius="2xl"
          boxShadow="none"
          minH={{ base: '330px', md: 'clamp(360px, 52vh, 520px)' }}
          maxW={{ base: '100%', md: '430px' }}
          color="white"
          bg="linear-gradient(145deg, #031B38 0%, #064A96 58%, #0B78D0 100%)"
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          _before={{
            content: '""',
            position: 'absolute',
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            pointerEvents: 'none',
          }}
        >
          <HStack w="full" justify="space-between" position="relative" zIndex={1}>
            <Text
              fontSize="xs"
              fontWeight="900"
              letterSpacing="0.22em"
              color="#7CEBFF"
            >
              NEXT MATCH
            </Text>
            <Badge
              bg="#FEE500"
              color="#172033"
              borderRadius="full"
              px={3}
              py={1}
              fontWeight="900"
            >
              {nextMatchDisplay?.badge || 'WAIT'}
            </Badge>
          </HStack>

          {nextMatchDisplay ? (
            <VStack align="start" spacing={3} position="relative" zIndex={1}>
              <Badge
                bg="rgba(255,255,255,0.14)"
                color="white"
                border="1px solid rgba(255,255,255,0.24)"
                borderRadius="full"
                px={3}
                py={1}
              >
                {nextMatchDisplay.eventType}
              </Badge>
              <Text
                fontSize={{ base: '3xl', lg: '4xl' }}
                fontWeight="900"
                letterSpacing="-0.045em"
                lineHeight="1.08"
              >
                {nextMatchDisplay.dateLabel}
              </Text>
              <Text fontSize={{ base: 'xl', lg: '2xl' }} fontWeight="800" color="#A7F3FF">
                {nextMatchDisplay.timeLabel}
              </Text>
              <Box pt={3}>
                <Text fontSize="xs" color="rgba(255,255,255,0.68)" fontWeight="700">
                  VENUE
                </Text>
                <Text mt={1} fontSize="lg" fontWeight="800" lineHeight="1.35">
                  {nextMatchDisplay.location}
                </Text>
              </Box>
            </VStack>
          ) : (
            <VStack align="start" spacing={3} position="relative" zIndex={1}>
              <Text fontSize={{ base: '3xl', lg: '4xl' }} fontWeight="900" lineHeight="1.15">
                다음 경기
                <br />
                일정 조율 중
              </Text>
              <Text color="rgba(255,255,255,0.78)" lineHeight="1.7">
                일정이 확정되면 날짜와 장소를 가장 먼저 알려드릴게요.
              </Text>
            </VStack>
          )}

          <HStack spacing={2} position="relative" zIndex={1}>
            {nextMatchDisplay && (
              <Button
                as="a"
                href={nextMatchDisplay.mapUrl}
                target="_blank"
                rel="noreferrer"
                size="sm"
                bg="white"
                color="#064A96"
                _hover={{ bg: '#E0F2FE' }}
              >
                지도 보기
              </Button>
            )}
            <Button
              size="sm"
              bg="#FEE500"
              color="#172033"
              border="1px solid"
              borderColor="#FEE500"
              fontWeight="900"
              boxShadow="0 6px 16px rgba(0,0,0,0.16)"
              _hover={{ bg: '#F7D600', borderColor: '#F7D600', transform: 'translateY(-1px)' }}
              _focusVisible={{ boxShadow: '0 0 0 3px rgba(254,229,0,0.38)' }}
              onClick={() => navigate('/schedule-v2')}
            >
              일정 상세
            </Button>
          </HStack>
        </Box>
        {/* 유튜브 슬라이드 */}
        <Box
          flex={2}
          bg="white"
          p={4}
          borderRadius="lg"
          boxShadow="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH={{ base: '180px', md: '300px', lg: '400px' }}
          position="relative"
          overflow="hidden"
        >
          <IconButton icon={<ChevronLeftIcon />} aria-label="이전" position="absolute" left={2} top="50%" transform="translateY(-50%)" onClick={handlePrev} zIndex={2} bg="white" color="#004ea8" boxShadow="md" _hover={{ bg: "gray.100" }}/>
          <Box
            key={currentVideo.id}
            w="100%"
            h="100%"
            position="relative"
            borderRadius="lg"
            overflow="hidden"
            boxShadow="sm"
            bg="black"
            aspectRatio={{ base: '16/9', md: '16/9' }}
            minH={{ base: '180px', md: '300px' }}
            maxW="100%"
            display="block"
            boxSizing="border-box"
            sx={{
              animation: 'fccg-yt-in 0.38s ease-out',
              '@keyframes fccg-yt-in': {
                from: { opacity: 0, transform: 'scale(0.97)' },
                to: { opacity: 1, transform: 'scale(1)' },
              },
            }}
          >
            {/* 영상 제목 왼쪽 위에 예쁘게 노출 */}
            <Box position="absolute" top={3} left={3} bg="rgba(0,0,0,0.55)" color="white" px={4} py={2} borderRadius="lg" fontWeight="bold" fontSize="md" zIndex={3} boxShadow="md" maxW="80%" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
              {currentVideo.title}
            </Box>
            <YouTube
              key={currentVideo.id}
              videoId={currentVideo.id}
              loading="eager"
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  // react-youtube가 플레이어 생성 전에 autoplay를 호출하는 경쟁 상태를 피하고,
                  // onReady에서 안전하게 자동 재생한다.
                  autoplay: 0,
                  mute: 1,
                  rel: 0,
                  modestbranding: 1,
                  playsinline: 1,
                  vq: 'hd1080',
                  ...(typeof window !== 'undefined' ? { origin: window.location.origin } : {}),
                },
              }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                borderRadius: 12,
                background: 'black',
              }}
              className="yt-iframe"
              onReady={(e: any) => {
                const player = e.target;
                window.setTimeout(() => {
                  try {
                    const muteResult = player?.mute?.();
                    muteResult?.catch?.(() => undefined);
                    const playResult = player?.playVideo?.();
                    playResult?.catch?.(() => undefined);
                  } catch {
                    /* 플레이어가 이미 교체된 경우 무시 */
                  }
                }, 100);
                applyYoutubeBestQuality(e.target);
                window.setTimeout(() => applyYoutubeBestQuality(e.target), 500);
                window.setTimeout(() => applyYoutubeBestQuality(e.target), 1500);
              }}
              onEnd={() => handleNext()}
              onError={handleVideoError}
              onStateChange={(event: any) => {
                // YouTube 플레이어 상태 변경 감지
                // -1: 비디오 시작 전, 0: 종료, 1: 재생 중, 2: 일시정지, 3: 버퍼링, 5: 큐에 추가됨
                if (event.data === 1) {
                  applyYoutubeBestQuality(event.target);
                }
                if (event.data === 5) {
                  // 큐에 추가됨 상태는 비디오를 찾을 수 없을 때 발생
                  console.log('비디오를 찾을 수 없음:', currentVideo.id);
                  setTimeout(() => handleVideoError(), 1000);
                }
              }}
            />
          </Box>
          <IconButton icon={<ChevronRightIcon />} aria-label="다음" position="absolute" right={2} top="50%" transform="translateY(-50%)" onClick={handleNext} zIndex={2} bg="white" color="#004ea8" boxShadow="md" _hover={{ bg: "gray.100" }}/>
        </Box>
      </Flex>

      {/* 에러 상태 */}
      {error && (
        <Alert status="error" mb={6} mx={{ base: 2, md: 8, lg: 24 }}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* 하단 통계 카드 */}
      <SimpleGrid
        columns={{ base: 1, sm: 2, lg: 4 }}
        spacing={4}
        mb={{ base: 6, lg: 4 }}
        px={{ base: 4, md: 5, lg: 6 }}
        w="full"
        maxW="1400px"
        mx="auto"
        overflowX="hidden"
      >
        {loading ? (
          <>
            {bottomInfoData.map((info, idx) => (
              <Box
                key={idx}
                bg="white"
                px={4}
                py={3}
                minH="119px"
                borderRadius="xl"
                boxShadow="md"
                textAlign="center"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                <Stack direction="row" align="center" justify="center" spacing={1.5} mb={0}>
                  <Text m={0} fontSize="2xl" lineHeight={1}>{info.icon}</Text>
                  <Text m={0} fontWeight="bold" fontSize="lg" lineHeight={1.2}>{info.title}</Text>
                </Stack>
                <Flex align="center" justify="center">
                  <Spinner size="md" color="blue.500" mr={2} />
                  <Text m={0} color="gray.500" lineHeight={1.2}>로딩 중...</Text>
                </Flex>
              </Box>
            ))}
          </>
        ) : stats && (
          <>
            {bottomInfoData.map((info, idx) => (
              <Box
                as="button"
                type="button"
                key={idx}
                aria-label={`${info.title} 상세 보기`}
                bg="white"
                px={4}
                py={3}
                minH="119px"
                borderRadius="xl"
                boxShadow="md"
                textAlign="center"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)', transition: 'all 0.15s' }}
                _focusVisible={{ outline: '3px solid', outlineColor: 'blue.300', outlineOffset: '2px' }}
                onClick={() => {
                  if (info.action === 'members') {
                    setModalIdx(0);
                    onOpen();
                  } else if (info.action === 'games') {
                    setModalIdx(2);
                    onOpen();
                  } else if (info.action === 'month') {
                    setModalIdx(4);
                    onOpen();
                  } else if (info.action === 'attendance') {
                    setModalIdx(2);
                    onOpen();
                  }
                }}
                position="relative"
              >
                {/* 투표 상태 뱃지 - 오른쪽 상단 (로그인 여부와 관계없이 표시) */}
                {info.title === '다음주 경기 투표하기' && (
                  <Box position="absolute" top={2} right={2}>
                    {(() => {
                      // 실제 투표 세션 데이터 사용
                      const hasActiveSession = !!normalizedVoteSession;
                      const hasClosedSession = !!unifiedVoteData?.lastWeekResults;
                      
                      if (!hasActiveSession) {
                        if (hasClosedSession) {
                          return (
                            <Badge
                              bg="red.500"
                              color="white"
                              px={1}
                              py={0}
                              borderRadius="sm"
                              fontSize="10px"
                              fontWeight="bold"
                              boxShadow="sm"
                            >
                              투표종료
                            </Badge>
                          );
                        }
                        return (
                          <Badge colorScheme="gray" variant="solid" fontSize="xs">
                            세션 없음
                          </Badge>
                        );
                      }
                      
                      const session = normalizedVoteSession;
                      const isVoteClosed = session.isCompleted || !session.isActive;
                      
                      if (isVoteClosed) {
                        return (
                          <Badge
                            bg="red.500"
                            color="white"
                            px={1}
                            py={0}
                            borderRadius="sm"
                            fontSize="10px"
                            fontWeight="bold"
                            boxShadow="sm"
                          >
                            투표종료
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge
                            bg="purple.500"
                            color="white"
                            px={1}
                            py={0}
                            borderRadius="sm"
                            fontSize="10px"
                            fontWeight="bold"
                            boxShadow="sm"
                          >
                            투표 중
                          </Badge>
                        );
                      }
                    })()}
                  </Box>
                )}
                {/* 이벤트 유형 뱃지 - 이번주 경기 카드 */}
                {info.title === '이번주 경기' && (info as any).eventType && (
                  <Box position="absolute" top={2} right={2}>
                    {(() => {
                      const eventType = (info as any).eventType;
                      let bgColor = 'gray.500';
                      let textColor = 'white';
                      
                      // 일정 페이지 달력 색상과 일치 (NewCalendarV2.tsx의 GameTypeBadge 색상)
                      switch (eventType) {
                        case '매치':
                          bgColor = '#2563eb'; // 일정 페이지 달력과 동일
                          textColor = 'white';
                          break;
                        case '자체':
                          bgColor = '#059669'; // 일정 페이지 달력과 동일
                          textColor = 'white';
                          break;
                        case '회식':
                          bgColor = '#dc2626'; // 일정 페이지 달력과 동일
                          textColor = 'white';
                          break;
                        case '기타':
                        default:
                          bgColor = '#6b7280'; // 일정 페이지 달력과 동일
                          textColor = 'white';
                          break;
                      }
                      
                      return (
                        <Badge
                          bg={bgColor}
                          color={textColor}
                          px={1}
                          py={0}
                          borderRadius="sm"
                          fontSize="10px"
                          fontWeight="bold"
                          boxShadow="sm"
                        >
                          {eventType}
                        </Badge>
                      );
                    })()}
                  </Box>
                )}
                <VStack spacing={0} align="center" justify="center">
                  <HStack align="center" justify="center" spacing={1.5}>
                    <Text m={0} fontSize="2xl" lineHeight={1}>{info.icon}</Text>
                    <Text m={0} fontWeight="bold" fontSize="lg" lineHeight={1.2}>{info.title}</Text>
                  </HStack>
                  <Text
                    m={0}
                    color="#64748B"
                    fontSize="xs"
                    fontWeight="600"
                    lineHeight={1.15}
                    mt="2mm"
                  >
                    {info.eyebrow}
                  </Text>
                  <Text
                    m={0}
                    color="#004ea8"
                    fontSize="xl"
                    fontWeight="800"
                    mt={4}
                    lineHeight={1.1}
                  >
                    {info.value}
                  </Text>
                </VStack>
              </Box>
            ))}
          </>
        )}
      </SimpleGrid>
      {/* 상세 모달 */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        isCentered
        size={modalIdx === 2 ? '2xl' : modalIdx === 4 ? 'xl' : 'sm'}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent maxW={modalIdx === 2 ? '760px' : modalIdx === 4 ? '620px' : '380px'}>
          <ModalCloseButton />
          <ModalBody px={modalIdx === 0 ? 7 : 6} pt={5} pb={6}>
            {typeof modalIdx === 'number' && [0, 2, 4].includes(modalIdx) && (
              <Flex align="center" justify="center" gap={2} mb={4}>
                <Text fontSize="2xl" lineHeight={1}>
                  {modalIdx === 0
                    ? bottomInfoData[0].icon
                    : modalIdx === 2
                      ? bottomInfoData[1].icon
                      : bottomInfoData[2].icon}
                </Text>
                <Text fontSize="lg" fontWeight="bold" lineHeight={1.2}>
                  {modalIdx === 0
                    ? bottomInfoData[0].title
                    : modalIdx === 2
                      ? bottomInfoData[1].title
                      : bottomInfoData[2].title}
                </Text>
              </Flex>
            )}
            {modalIdx === 0 && (
              <Box>
                {membersLoading ? (
                  <Text color="gray.500" textAlign="center">멤버 데이터를 불러오는 중...</Text>
                ) : realTimeMembers && realTimeMembers.length > 0 ? (
                  <Box maxH="220px" overflowY="auto" display="flex" flexWrap="wrap" gap={2} justifyContent="center">
                    {realTimeMembers
                      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
                      .map((m) => (
                        <Box 
                          key={m.id} 
                          px={3} 
                          py={1} 
                          borderRadius="full" 
                          bg="#004ea8" 
                          color="white" 
                          fontWeight="medium" 
                          fontSize="xs" 
                          display="inline-block"
                          boxShadow="0 1px 3px rgba(0,0,0,0.1)"
                          _hover={{ 
                            transform: 'translateY(-1px)', 
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {m.name}
                        </Box>
                      ))}
                  </Box>
                ) : (
                  <Text color="gray.500" textAlign="center">표시할 멤버 데이터가 없습니다.</Text>
                )}
              </Box>
            )}
            {modalIdx !== null && modalIdx !== 0 && getDetailContent(modalIdx)}
          </ModalBody>
        </ModalContent>
      </Modal>

    </Box>
  );
}
