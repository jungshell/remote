import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Center,
  Flex,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useToast,
  useDisclosure,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Divider,
  Switch,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Skeleton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerCloseButton,
  DrawerBody,
  useBreakpointValue
} from '@chakra-ui/react';
import { ViewIcon, SettingsIcon } from '@chakra-ui/icons';
import {
  MdOutlineDashboard,
  MdOutlineGroups,
  MdOutlineHowToVote,
  MdOutlineEventNote,
  MdOutlineSportsSoccer,
  MdOutlineNotifications,
  MdOutlineInsights,
  MdOutlineStadium,
  MdOutlineMenuBook,
  MdOutlineSend
} from 'react-icons/md';
import { GameCardSkeleton } from '../components/common/SkeletonLoader';
import {
  LuArrowRight, LuBan, LuBellRing, LuCalendarPlus, LuCircleCheck, LuCircleX, LuHistory, LuLogIn, LuLogOut,
  LuMapPin, LuMegaphone, LuPanelLeft, LuPencil, LuTriangleAlert, LuUserCheck, LuUserCog, LuUsers, LuVote
} from 'react-icons/lu';
import { AdminEmptyState, AdminPageHeader, AdminPanel, CggShieldTemp, DateBlock, EASE_EXPO_OUT, LiveDot, PanelHeader, PitchLines, StatBlock, StatStrip, StatusBadge, reveal } from '../components/admin/MatchDay';
import { ADMIN_SHELL, GRADIENTS } from '../constants/designTokens';
import { normalizeEventType } from '../utils/eventTypeNormalizer';
import { getValidToken, getMemberStats, getMemberInsights, verifyMailTransport, type Game, type MemberInsights } from '../api/auth';
import MemberManagement from '../components/MemberManagement';
import { API_ENDPOINTS, ensureApiBaseUrl } from '../constants';
import { getApiBaseUrl } from '../config/api';
import GameManagement from '../components/GameManagement';
import FootballFieldPage from './FootballFieldPage';
import VoteResultsPage from './VoteResultsPage';
import VoteSessionManagement from '../components/VoteSessionManagement';
import { useAuthStore } from '../store/auth';
import ManualModal from '../components/ManualModal';
import FloatingHelpButton from '../components/FloatingHelpButton';
import MailDiagnosticsPanel from '../components/MailDiagnosticsPanel';

// ===== 타입 정의 =====
interface ExtendedMember {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt?: string;
  statusChangedAt?: string | null;
  statusChangeReason?: string | null;
}

interface Player {
  id: string;
  name: string;
  position: string;
  jerseyNumber?: number;
  phone?: string;
  email?: string;
  joinDate: string;
  preferredPosition: string[];
  skillRating: number;
  attendanceRate: number;
  isActive: boolean;
  notes?: string;
}

// 알림 타입 정의
            interface Notification {
              id: string;
              type: 'GAME_REMINDER' | 'VOTE_REMINDER' | 'NEW_MEMBER' | 'GAME_RESULT' | 'VOTE_WARNING' | 'MEMBER_SUSPENDED' | 'GAME_DAY_BEFORE' | 'GAME_DAY_OF' | 'VOTE_START';
              title: string;
              message: string;
              recipients: number[]; // 사용자 ID 배열
              sentAt: string;
              status: 'PENDING' | 'SENT' | 'FAILED';
              deliveryMethods: ('email' | 'push' | 'inapp')[];
              metadata?: any;
              gameMailImage?: {
                nowLabel?: string;
                games: any[];
              };
            }


// 최근 활동 한 줄 요약 — 메일 provider 원문(긴 오류·URL)은 대시보드에 그대로 노출하지 않는다 (원문은 hover title로 확인)
const ACTIVITY_SUMMARY_MAX = 6;
const summarizeActivity = (description: string): { title: string; detail?: string } => {
  const text = String(description || '');
  const emailError = text.match(/^이메일 알림 발송 오류:\s*(.*)$/s) || text.match(/^알림 발송 실패:\s*(.*)$/s);
  if (emailError) {
    const raw = emailError[1];
    const reason =
      /535|Username and Password not accepted|Invalid login|BadCredentials/i.test(raw) ? 'SMTP 인증 오류 (앱 비밀번호 확인 필요)'
      : /invalid_grant|OAuth token check failed|unauthorized_client/i.test(raw) ? 'Gmail 인증 토큰 오류'
      : /timeout|timed out|ETIMEDOUT/i.test(raw) ? '연결 시간 초과'
      : /HTTP 503|Service Unavailable/i.test(raw) ? '메일 발송 서버 응답 실패 (503)'
      : /HTTP 5\d\d/i.test(raw) ? '서버 오류'
      : /Failed to fetch|NetworkError|network/i.test(raw) ? '네트워크 오류'
      : /환경변수|not configured/i.test(raw) ? '메일 설정 누락'
      : raw.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || '알 수 없는 오류';
    return { title: '이메일 발송 실패', detail: reason };
  }
  const emailOk = text.match(/^이메일 알림 발송 성공:\s*(.*?)\s*\(성공:\s*(\d+)건, 실패:\s*(\d+)건\)/);
  if (emailOk) return { title: '이메일 발송 완료', detail: `${emailOk[1]} · 성공 ${emailOk[2]}건${emailOk[3] !== '0' ? ` · 실패 ${emailOk[3]}건` : ''}` };
  const short = text.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  return { title: short.length > 80 ? `${short.slice(0, 80)}…` : short };
};

// 최근 활동 타입 정의
            interface ActivityLog {
              id: string;
              userId: number;
              userName: string;
              action: 'LOGIN' | 'LOGOUT' | 'GAME_JOIN' | 'GAME_CANCEL' | 'VOTE_PARTICIPATE' | 'VOTE_ABSENT' | 'ANNOUNCEMENT_CREATE' | 'ANNOUNCEMENT_EDIT' | 'MEMBER_STATUS_CHANGE' | 'VOTE_WARNING' | 'MEMBER_SUSPENDED' | 'GAME_DAY_BEFORE' | 'GAME_DAY_OF' | 'VOTE_START';
              description: string;
              timestamp: string;
              metadata?: any;
            }

// 투표 참여 기록 타입
interface VoteRecord {
  userId: number;
  userName: string;
  voteDate: string;
  participated: boolean;
  year: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'urgent' | 'normal' | 'info';
  startDate: string;
  endDate: string;
  isActive: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

interface NotificationSettings {
  gameReminder: {
    enabled: boolean;
    beforeHours: number;
    targets: string[];
  };
  voteReminder: {
    enabled: boolean;
    beforeHours: number;
    targets: string[];
  };
  newMemberNotification: {
    enabled: boolean;
    targets: string[];
  };
  gameResultNotification: {
    enabled: boolean;
    targets: string[];
  };
}

interface SiteSettings {
  teamName: string;
  teamDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  foundedYear: string;
  teamMotto: string;
}

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';

// 회원 등급별 권한 정의
const rolePermissions = {
  SUPER_ADMIN: {
    name: '슈퍼관리자',
    color: 'red',
    permissions: ['all']
  },
  ADMIN: {
    name: '관리자',
    color: 'blue',
    permissions: ['member_management', 'game_management', 'content_management', 'homepage_management']
  },
  MEMBER: {
    name: '회원',
    color: 'gray',
    permissions: ['vote', 'schedule_view', 'photo_upload', 'comment_write']
  }
};

export default function AdminPageNew() {
  const [userList, setUserList] = useState<ExtendedMember[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [memberStats, setMemberStats] = useState<{
    totalMembers?: number;
    thisWeekGame?: number;
    nextWeekVote?: number;
  }>({});
  const [loading, setLoading] = useState(true);
  
  // 통합 API 데이터 상태
  const [unifiedVoteData, setUnifiedVoteData] = useState<{
    activeSession: any;
    lastWeekResults: any;
    allSessions: any[];
  } | null>(null);

  // 활동 분석 데이터 상태
  const [activityAnalysisData, setActivityAnalysisData] = useState<{
    summary?: {
      participationRate: number;
      voteParticipationRate: number;
      activeUsers: number;
      thisMonthGames: number;
    };
    memberStats?: Array<{
      id: number;
      name: string;
      role: string;
      loginCount?: number;
      gameParticipation: number;
      voteParticipation: number;
      activityScore: number;
      gameParticipationCount: number;
      voteParticipationCount: number;
    }>;
    monthlyGameStats?: Array<{
      month: string;
      gameCount: number;
    }>;
    gameTypeDistribution?: {
      match: number;
      friendly: number;
    };
  } | null>(null);
  const [selectedMenu, setSelectedMenu] = useState(() => {
    // URL 파라미터에서 메뉴 상태 복원
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('menu') || 'dashboard';
  });

  // 메뉴 선택 시 URL 업데이트
  const handleMenuSelect = (menu: string) => {
    setSelectedMenu(menu);
    const url = new URL(window.location.href);
    url.searchParams.set('menu', menu);
    window.history.replaceState({}, '', url.toString());
  };
  const user = useAuthStore((s) => s.user);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('MEMBER');
  

  
  // 알림 설정 상태
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    gameReminder: {
      enabled: true,
      beforeHours: 24,
      targets: ['participating']
    },
    voteReminder: {
      enabled: true,
      beforeHours: 12,
      targets: ['all']
    },
    newMemberNotification: {
      enabled: true,
      targets: ['admin']
    },
    gameResultNotification: {
      enabled: true,
      targets: ['all']
    }
  });
  const [isNotificationChanged, setIsNotificationChanged] = useState(false);

  // 선수 관리 상태 - API에서 데이터를 가져옴
  const [players, setPlayers] = useState<Player[]>([]);
  const [isPlayerFormOpen, setIsPlayerFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({
    name: '',
    position: 'MF',
    preferredPosition: [],
    skillRating: 70,
    attendanceRate: 0,
    isActive: true,
    joinDate: new Date().toISOString().split('T')[0]
  });

  // 공지사항 관리 상태 - API에서 데이터를 가져옴
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    type: 'normal',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
    pinned: false
  });

  // 최근 활동 및 투표 관리 상태
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  // 대시보드 운영 상태 strip (읽기 전용: 회원 경고 계산 · 메일 transport 확인 — 실제 발송 없음)
  const [opsInsights, setOpsInsights] = useState<MemberInsights | null>(null);
  const [mailHealth, setMailHealth] = useState<{ ok: boolean; mode: string } | null>(null);
  useEffect(() => {
    if (selectedMenu !== 'dashboard') return;
    let alive = true;
    getMemberInsights().then((r) => { if (alive) setOpsInsights(r); }).catch(() => {});
    verifyMailTransport()
      .then((r) => { if (alive) setMailHealth({ ok: !!r?.success, mode: r?.mode || 'none' }); })
      .catch(() => { if (alive) setMailHealth({ ok: false, mode: 'none' }); });
    return () => { alive = false; };
  }, [selectedMenu]);
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [voteWarnings, setVoteWarnings] = useState<{userId: number, userName: string, warningCount: number, lastWarningDate: string}[]>([]);
  // 최근 발송 알림 상세 보기 모달 상태
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // 알림 시스템 상태
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastNotificationErrorRef = useRef<string>('');
  const [isNotificationSystemActive, setIsNotificationSystemActive] = useState(false);


  // 사용자 정보가 변경될 때마다 권한 업데이트
  useEffect(() => {
    if (user?.email === 'sti60val@gmail.com') {
      setCurrentUserRole('SUPER_ADMIN');
    } else if (user?.role === 'ADMIN') {
      setCurrentUserRole('ADMIN');
    } else {
      setCurrentUserRole('MEMBER');
    }
  }, [user]);
  
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const mobileSidebar = useDisclosure();
  const adminManual = useDisclosure();

  // 메뉴별 설명 반환 함수
  const getMenuDescription = (menu: string) => {
    const descriptions: { [key: string]: string } = {
      'dashboard': '전체 현황 및 통계 확인',
      'users': '회원 등록, 수정, 삭제 관리',
      'vote-results': '투표 결과 확인 및 관리',
      'vote-sessions': '투표 세션 생성 및 관리',
      'games': '경기 일정 생성 및 관리',
      'notifications': '알림 발송 및 관리',
      'analytics': '회원 활동 분석 및 통계',
      'football': '풋살 경기 현황판 관리'
    };
    return descriptions[menu] || '관리자 기능 가이드';
  };
  
  // 사용하지 않는 코드 제거
  // const { onOpen: onGameModalOpen } = useDisclosure();
  
  // 회원 통계 상태
  // const [memberStats, setMemberStats] = useState({
  //   totalMembers: 0,
  //   activeMembers: 0,
  //   recentMembers: 0,
  //   activeRate: 0,
  //   averageAttendanceRate: 0
  // });
  
  // 통합 투표 데이터 로드 함수
  const loadUnifiedVoteData = useCallback(async () => {
    try {
      const baseUrl4 = await ensureApiBaseUrl().catch(() => '/api/auth');
      const unifiedResponse = await fetch(`${baseUrl4}/unified-vote-data`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (unifiedResponse.ok) {
        const unifiedData = await unifiedResponse.json();
        const unifiedVoteDataToSet = {
          activeSession: unifiedData.activeSession || null,
          allMembers: unifiedData.allMembers || [],
          lastWeekResults: unifiedData.lastWeekResults || null,
          allSessions: unifiedData.allSessions || []
        };
        setUnifiedVoteData(unifiedVoteDataToSet);
        console.log('✅ 통합 투표 데이터 로드 성공');
        return unifiedVoteDataToSet;
      } else {
        console.log('❌ 통합 투표 데이터 로드 실패:', unifiedResponse.status);
        return null;
      }
    } catch (error) {
      console.error('통합 투표 데이터 로드 실패:', error);
      return null;
    }
  }, [setUnifiedVoteData]);
  
  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      console.log('데이터 로딩 시작...');
      
      // 각 API를 개별적으로 호출하여 일부가 실패해도 다른 데이터는 표시
      
      // 1. 회원 데이터 로드 - 단순화된 통합 API 사용
      try {
        console.log('🔄 회원 데이터 로드 시작 - 통합 API 사용');
        
        const baseUrl = await getApiBaseUrl();
        const token = await getValidToken();
        const response = await fetch(`${baseUrl}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ 통합 API 응답 성공:', responseData);
          
          if (responseData.members && Array.isArray(responseData.members)) {
            const convertedMembers: ExtendedMember[] = responseData.members.map((member: any) => ({
              id: member.id,
              name: member.name,
              email: member.email || '',
              role: member.role || 'MEMBER',
              status: member.status || 'ACTIVE',
              createdAt: member.createdAt,
              statusChangedAt: member.statusChangedAt ?? null,
              statusChangeReason: member.statusChangeReason ?? null
            }));
            
            console.log('📋 변환된 회원 데이터:', convertedMembers);
            setUserList(convertedMembers);
            
            // localStorage에 최신 데이터 저장 (캐시용)
            localStorage.setItem('adminUserList', JSON.stringify(convertedMembers));
          } else {
            console.log('⚠️ 회원 데이터가 비어있음');
            setUserList([]);
          }
        } else {
          console.log('❌ 통합 API 응답 실패:', response.status);
          setUserList([]);
        }
      } catch (error) {
        console.error('❌ 회원 데이터 로드 실패:', error);
        setUserList([]);
      }
      
      // 2. 경기 데이터 로드 - 관리자용 전체 경기 조회
      try {
        console.log('🔄 경기 데이터 로드 시작 - /api/auth/games?includeAutoGenerated=true');
        
        const baseUrl2 = await ensureApiBaseUrl().catch(() => '/api/auth');
        const response = await fetch(`${baseUrl2}/games?includeAutoGenerated=true`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const gamesData = await response.json();
          console.log('✅ 경기 데이터 응답 성공:', Array.isArray(gamesData) ? gamesData.length : 0, '경기');
          
          if (Array.isArray(gamesData)) {
            setGames(gamesData);
            console.log('📋 경기 데이터 설정 완료:', gamesData.length, '경기');
            console.log('📋 첫 번째 경기 데이터:', gamesData[0]);
        } else {
            console.log('⚠️ 경기 데이터가 배열이 아님');
            setGames([]);
          }
        } else {
          console.log('❌ 통합 데이터 API 응답 실패:', response.status);
          setGames([]);
        }
      } catch (error) {
        console.error('❌ 경기 데이터 로드 실패:', error);
        setGames([]);
      }
      
      // 3. 통계 데이터 로드
      try {
        const statsResponse = await getMemberStats();
        console.log('통계 데이터 응답:', statsResponse);
        
        if (statsResponse) {
          setMemberStats(statsResponse);
        } else {
          console.log('통계 데이터 응답이 올바르지 않음:', statsResponse);
          setMemberStats({});
        }
      } catch (error) {
        console.error('통계 데이터 로드 실패:', error);
        setMemberStats({});
      }

      // 4. 활동 분석 데이터 로드
      try {
        console.log('🔄 활동 분석 데이터 로드 시작');
        
        const baseUrl3 = await ensureApiBaseUrl().catch(() => '/api/auth');
        const response = await fetch(`${baseUrl3}/activity-analysis`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const analysisData = await response.json();
          console.log('✅ 활동 분석 데이터 응답 성공:', analysisData);
          
          // 응답 구조 확인: success와 data가 있거나, 직접 data 구조인 경우
          const data = analysisData.success ? analysisData.data : analysisData;
          
          console.log('📊 파싱된 데이터:', {
            hasSummary: !!data?.summary,
            hasMemberStats: !!data?.memberStats,
            memberStatsLength: data?.memberStats?.length || 0,
            summaryData: data?.summary,
            memberStatsSample: data?.memberStats?.[0] || null
          });
          
          if (data && (data.summary || data.memberStats)) {
            setActivityAnalysisData(data);
            console.log('📊 활동 분석 데이터 설정 완료:', {
              summary: data.summary,
              memberStatsCount: data.memberStats?.length || 0,
              monthlyGameStatsCount: data.monthlyGameStats?.length || 0
            });
          } else {
            console.warn('⚠️ 활동 분석 데이터가 올바르지 않음:', data);
            setActivityAnalysisData({ summary: {}, memberStats: [], monthlyGameStats: [], gameTypeDistribution: {} });
          }
        } else {
          const errorText = await response.text();
          console.error('❌ 활동 분석 API 응답 실패:', response.status, errorText);
          setActivityAnalysisData({ summary: {}, memberStats: [], monthlyGameStats: [], gameTypeDistribution: {} });
        }
      } catch (error) {
        console.error('❌ 활동 분석 데이터 로드 실패:', error);
        setActivityAnalysisData({ summary: {}, memberStats: [], monthlyGameStats: [], gameTypeDistribution: {} });
      }
      
      // 4. 통합 투표 데이터 로드
        console.log('🔄 통합 투표 데이터 로드 시작');
      const unifiedData = await loadUnifiedVoteData();
      if (unifiedData) {
          // 통합 API 데이터를 사용하여 경기 데이터 업데이트
          await updateGamesFromVoteData(unifiedData);
      }
      
    } catch (error) {
      console.error('전체 데이터 로드 오류:', error);
      
      toast({
        title: '일부 데이터 로드 실패',
        description: '일부 데이터를 불러오는데 실패했습니다.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [loadUnifiedVoteData]);

  // 투표 데이터 변경 시(마감/집계 후) 즉시 경기 목록 및 투표 데이터 새로고침
  useEffect(() => {
    const refreshData = async () => {
      try {
        // 경기 데이터 새로고침
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}/games?includeAutoGenerated=true`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const gamesData = await response.json();
          if (Array.isArray(gamesData)) {
            setGames(gamesData);
          }
        }
        
        // 통합 투표 데이터 새로고침
        await loadUnifiedVoteData();
          console.log('✅ 투표 데이터 변경 후 통합 데이터 새로고침 완료');
      } catch (e) {
        console.warn('데이터 새로고침 실패:', e);
      }
    };
    window.addEventListener('voteDataChanged', refreshData);
    return () => window.removeEventListener('voteDataChanged', refreshData);
  }, [loadUnifiedVoteData]);

  // 경기 관리 메뉴로 진입할 때도 즉시 새로고침
  useEffect(() => {
    if (selectedMenu === 'games') {
      (async () => {
        try {
          const response = await fetch(`${API_ENDPOINTS.BASE_URL}/games?includeAutoGenerated=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (response.ok) {
            const gamesData = await response.json();
            if (Array.isArray(gamesData)) {
              setGames(gamesData);
            }
          }
        } catch {}
      })();
    }
  }, [selectedMenu]);

  // 통합 API 데이터를 사용하여 경기 데이터 업데이트
  const updateGamesFromVoteData = useCallback(async (unifiedData: any) => {
    try {
      console.log('🔄 통합 API 데이터로 경기 데이터 업데이트 시작');
      
      const { activeSession, lastWeekResults } = unifiedData;
      
      // 항상 오래된 자동생성 게임들을 정리하고 데이터 동기화 실행
      console.log('🧹 오래된 자동생성 게임 정리 및 데이터 동기화 시작');
      
      // 조건 체크 로그
      console.log('🔍 현재 상태 체크:', {
        activeSession: !!activeSession,
        lastWeekResults: !!lastWeekResults,
        results: !!lastWeekResults?.results,
        isCompleted: lastWeekResults?.isCompleted,
        isActive: lastWeekResults?.isActive
      });
      
      // 자동생성 로직 완전 비활성화 (백엔드에서 처리)
      console.log('⚠️ 자동생성 로직 비활성화됨 - 백엔드에서 자동생성일정 처리');
      return;
      
      /*
      // 자동생성 조건: 마감된 투표 세션이 있을 때만 실행
      if (!lastWeekResults || !lastWeekResults.results) {
        console.log('⏭️ 자동생성 건너뜀 - 조건 미충족:', {
          hasLastWeekResults: !!lastWeekResults,
          hasResults: !!lastWeekResults?.results,
          isActive: lastWeekResults?.isActive,
          isCompleted: lastWeekResults?.isCompleted
        });
        return;
      }
      */
      
      // 활성 투표 세션이 있으면 자동생성하지 않음
      if (activeSession && activeSession.isActive) {
        console.log('⏭️ 자동생성 건너뜀 - 활성 투표 세션 존재:', {
          activeSessionId: activeSession.id,
          isActive: activeSession.isActive
        });
        return;
      }
      
      // 현재 주 이후의 일정만 자동생성하도록 체크
      const currentDate = new Date();
      const currentWeekStart = new Date(currentDate);
      currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // 이번 주 월요일
      
      const voteWeekStart = new Date(lastWeekResults.weekStartDate);
      
      // 투표 세션이 현재 주 이전이어도 자동생성 허용 (마감된 투표 결과 반영)
      console.log('📅 투표 세션 주간 정보:', {
        voteWeekStart: voteWeekStart.toLocaleDateString(),
        currentWeekStart: currentWeekStart.toLocaleDateString(),
        isPastWeek: voteWeekStart < currentWeekStart,
        willGenerate: true
      });
      
      console.log('🚀 자동생성 실행 시작 - 마감된 투표 세션 기준');
      // 마감된 투표 세션의 결과만 사용
        const results = lastWeekResults.results;
      
      // 마감된 투표 세션의 주 시작일 사용
        const weekStartDate = new Date(lastWeekResults.weekStartDate);
      
      console.log('📅 마감된 투표 세션 기준 자동생성:', {
        lastWeekResultsWeekStartDate: lastWeekResults.weekStartDate,
        weekStartDate: weekStartDate.toLocaleDateString(),
        weekStartDateISO: weekStartDate.toISOString(),
        투표결과: Object.keys(results || {}).map(day => `${day}: ${results[day]?.count || 0}표`).join(', ')
      });
      
        const dayMapping = {
          'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3, 'FRI': 4
        };
        
      // 먼저 백엔드의 모든 자동생성 게임들을 삭제 (특히 지난주 것들)
      try {
        const token = await getValidToken();
        console.log('🧹 백엔드 자동생성 게임들 삭제 시작');
        
        // 모든 게임 조회
        const baseUrl7 = await ensureApiBaseUrl().catch(() => '/api/auth');
        const allGamesResponse = await fetch(`${baseUrl7}/games`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (allGamesResponse.ok) {
          const allGames = await allGamesResponse.json();
          const autoGeneratedGames = allGames.filter((game: any) => {
            if (!game.autoGenerated) return false;
            
            // 게임 날짜가 현재 주 이전이면 삭제 대상
            const gameDate = new Date(game.date);
            const gameWeekStart = new Date(gameDate);
            gameWeekStart.setDate(gameDate.getDate() - gameDate.getDay() + 1); // 월요일로 설정
            
            return gameWeekStart < currentWeekStart;
          });
          
          console.log('🧹 삭제할 지난주 자동생성 게임들:', autoGeneratedGames.length, '개');
          
          // 자동생성 게임 삭제 로직 비활성화 (백엔드에서 필터링하므로 불필요)
          console.log('⚠️ 자동생성 게임 삭제 로직 비활성화됨 - 백엔드에서 필터링 처리');
          /*
          // 각 지난주 자동생성 게임 삭제
          for (const game of autoGeneratedGames) {
            try {
              const baseUrl8 = await ensureApiBaseUrl().catch(() => '/api/auth');
              const deleteResponse = await fetch(`${baseUrl8}/games/${game.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (deleteResponse.ok) {
                console.log(`✅ 지난주 자동생성 게임 삭제 완료: ID ${game.id}, 날짜 ${game.date}`);
              } else {
                console.error(`❌ 지난주 자동생성 게임 삭제 실패: ID ${game.id}`);
              }
            } catch (error) {
              console.error(`❌ 지난주 자동생성 게임 삭제 오류: ID ${game.id}`, error);
            }
          }
          */
        }
      } catch (error) {
        console.error('❌ 백엔드 자동생성 게임 삭제 중 오류:', error);
      }
      
      // 프론트엔드 게임 데이터를 백엔드에서 새로고침
      let currentGames: any[] = [];
      try {
        const token = await getValidToken();
        console.log('🔄 프론트엔드 게임 데이터 백엔드에서 새로고침');
        
        const baseUrl9 = await ensureApiBaseUrl().catch(() => '/api/auth');
        const gamesResponse = await fetch(`${baseUrl9}/games?includeAutoGenerated=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (gamesResponse.ok) {
          const backendGames = await gamesResponse.json();
          console.log('🔄 백엔드에서 가져온 게임 데이터:', backendGames.length, '개');
          
          // 백엔드 데이터를 현재 게임 목록으로 설정
          currentGames = backendGames;
          console.log('✅ 백엔드 게임 데이터 로드 완료');
        }
      } catch (error) {
        console.error('❌ 프론트엔드 게임 데이터 새로고침 오류:', error);
        // 오류 시 기존 games 상태 사용
        currentGames = games;
      }
      
      // 관리자 화면에서는 자동 생성 경기 포함 전체 목록 유지
      const visibleGames = currentGames;
      console.log('📋 관리자 경기 목록 동기화:', visibleGames.map(g => ({ id: g.id, date: g.date, autoGenerated: g.autoGenerated })));
      
      const newGames = [...visibleGames];
      
      // 마감된 투표 세션의 결과를 사용해서 자동생성일정 생성
      const hasLastWeekResults = !!unifiedData?.lastWeekResults;
      const hasConfirmedGames = visibleGames.length > 0;
      
      console.log('🔍 자동생성 조건 체크:', {
        hasLastWeekResults,
        hasConfirmedGames,
        shouldGenerateAuto: hasLastWeekResults && !hasConfirmedGames,
        lastWeekResults: unifiedData?.lastWeekResults ? '있음' : '없음'
      });

      // 마감된 투표 세션의 결과가 있고 확정일정이 없을 때만 자동생성
      if (hasLastWeekResults && !hasConfirmedGames) {
        for (const [dayKey, dayResult] of Object.entries(results || {})) {
          const voteCount = (dayResult && typeof (dayResult as any).count === 'number') ? (dayResult as any).count : 0;
          if (voteCount > 0) {
            const dayIndex = dayMapping[dayKey as keyof typeof dayMapping];
            
            if (dayIndex !== undefined) {
              const gameDate = new Date(weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
              const month = gameDate.getMonth() + 1;
              const day = gameDate.getDate();
              const dayNames = ['월', '화', '수', '목', '금'];
              const dayName = dayNames[dayIndex];
            
            // 중복 체크: 같은 날짜에 이미 경기가 있는지 확인 (확정일정 우선)
            const targetDateStr = `${gameDate.getFullYear()}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
            const existingGameOnDate = newGames.find(game => {
              const gameDateStr = game.date;
              return gameDateStr.includes(targetDateStr);
            });
            
            if (existingGameOnDate) {
              console.log(`⏭️ ${dayKey} 날짜에 이미 경기가 존재하여 자동생성 건너뜀:`, {
                existingGame: existingGameOnDate,
                targetDate: targetDateStr,
                isAutoGenerated: existingGameOnDate.autoGenerated
              });
              continue;
            }
              
                     // 투표한 참여자 목록 가져오기
            const participants = Array.isArray((dayResult as any).participants) ? (dayResult as any).participants : [];
                     const participantNames = participants.map((p: any) => p.userName);
                     
                     // 새로운 경기 데이터 생성
                     const newGame = {
              id: Math.floor(Math.random() * 1000000) + 100000, // 6자리 정수 ID
                       date: `${gameDate.getFullYear()}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}.(${dayName}) 19:00`,
                       time: '19:00',
                       location: '매치업풋살파크 천안아산점',
                       eventType: '매치' as const,
                       mercenaryCount: 0,
                       memberNames: [], // 빈 배열로 설정
                       selectedMembers: participantNames, // 참여자만 selectedMembers에 포함
                       createdById: user?.id || 1,
                       createdAt: new Date().toISOString(),
                       updatedAt: new Date().toISOString(),
                       createdBy: {
                         id: user?.id || 1,
                         name: user?.name || '시스템'
                       },
                       autoGenerated: true // 자동 생성된 데이터임을 표시
                     };
              
              console.log(`✅ ${dayKey} 경기 데이터 생성:`, newGame);
            newGames.push(newGame);
            
            // 자동생성된 게임은 프론트엔드에서만 관리 (일정확정 시에만 백엔드 저장)
            console.log(`📝 ${dayKey} 자동생성 게임 프론트엔드에서 관리:`, newGame.id);
          }
        }
      }
      } else {
        if (unifiedData?.activeSession?.isActive) {
          console.log('⏭️ 투표가 활성화된 상태이므로 자동생성일정 생성 건너뜀');
        } else if (hasConfirmedGames) {
          console.log('⏭️ 확정일정이 이미 존재하므로 자동생성일정 생성 건너뜀');
        }
      }
      
      // 최종적으로 게임 목록 업데이트
      setGames(newGames);
      
      console.log('🎉 오래된 데이터 정리 및 동기화 완료');
    } catch (error) {
      console.error('❌ 경기 데이터 업데이트 실패:', error);
    }
  }, [user]);

  // 스마트 새로고침 조건 체크 함수
  const shouldRefresh = useCallback(() => {
    // 1. 모달이 열려있으면 새로고침 안함
    if (isPlayerFormOpen || isAnnouncementFormOpen) {
      console.log('새로고침 건너뜀 - 모달 열림');
      return false;
    }
    
    // 2. 편집 중이면 새로고침 안함
    if (editingPlayer || editingAnnouncement) {
      console.log('새로고침 건너뜀 - 편집 중');
      return false;
    }
    
    // 3. 회원관리 모달이 열려있는지 확인
    const memberManagementModals = document.querySelectorAll('[role="dialog"]');
    if (memberManagementModals.length > 0) {
      console.log('새로고침 건너뜀 - 회원관리 모달 열림');
      return false;
    }
    
    // 4. 사용자가 입력 중이면 새로고침 안함
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'SELECT') {
      console.log('새로고침 건너뜀 - 사용자 입력 중');
      return false;
    }
    
    // 5. 모든 조건을 만족하면 새로고침 함
    return true;
  }, [isPlayerFormOpen, isAnnouncementFormOpen, editingPlayer, editingAnnouncement]);

  // 실시간 데이터 업데이트 (자동새로고침 비활성화 + 스크롤 위치 유지)
  useEffect(() => {
    // 스크롤 위치 저장
    const savedScrollPosition = window.scrollY;
    
    // 초기 데이터 로드만 수행
    loadData();
    
    // 투표마감 시 자동생성 일정 생성 이벤트 리스너
    const handleVoteSessionClosed = () => {
      console.log('🔄 투표마감 이벤트 수신 - 자동생성 일정 생성');
      // 통합 데이터를 다시 로드하여 자동생성 실행
      loadData();
    };

    // 투표재개 시 자동생성 일정 제거 이벤트 리스너
    const handleVoteSessionResumed = () => {
      console.log('🔄 투표재개 이벤트 수신 - 자동생성 일정 제거');
      // 통합 데이터를 다시 로드하여 자동생성 일정 제거
      loadData();
    };

    window.addEventListener('voteSessionClosed', handleVoteSessionClosed);
    window.addEventListener('voteSessionResumed', handleVoteSessionResumed);
    
    // 자동새로고침 비활성화 - 사용자가 수동으로 새로고침 버튼을 눌러야 함
    // const interval = setInterval(() => {
    //   if (shouldRefresh()) {
    //     console.log('실시간 데이터 업데이트 중...');
    //     loadData();
    //   } else {
    //     console.log('새로고침 건너뜀 - 사용자 활동 중');
    //   }
    // }, 30000);
    
    // return () => clearInterval(interval);
    
    // 스크롤 위치 복원
    setTimeout(() => {
      window.scrollTo(0, savedScrollPosition);
    }, 100);
    
    return () => {
      window.removeEventListener('voteSessionClosed', handleVoteSessionClosed);
      window.removeEventListener('voteSessionResumed', handleVoteSessionResumed);
    };
  }, [loadData]);

  // 실시간 업데이트 상태 표시
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  
  useEffect(() => {
    setLastUpdateTime(new Date());
  }, [userList, games, memberStats]);

  // userList 상태가 변경될 때 localStorage에 저장
  useEffect(() => {
    if (userList.length > 0) {
      try {
        localStorage.setItem('adminUserList', JSON.stringify(userList));
        console.log('회원 목록이 localStorage에 저장됨:', userList.length, '명');
      } catch (error) {
        console.error('회원 목록 localStorage 저장 실패:', error);
      }
    }
  }, [userList]);

  // games 상태가 변경될 때 localStorage에 저장
  // localStorage 캐시 제거 - 항상 서버에서 최신 데이터 사용
  // useEffect(() => {
  //   if (games.length > 0) {
  //     try {
  //       localStorage.setItem('adminGamesList', JSON.stringify(games));
  //       console.log('경기 목록이 localStorage에 저장됨:', games.length, '경기');
  //     } catch (error) {
  //       console.error('경기 목록 localStorage 저장 실패:', error);
  //     }
  //   }
  // }, [games]);

  // 활동 데이터 수집 함수
  // 백엔드에서 활동 분석 데이터를 가져오는 함수
  const fetchActivityAnalysisData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const baseUrl10 = await ensureApiBaseUrl().catch(() => '/api/auth');
      const response = await fetch(`${baseUrl10}/activity-analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        // 응답 구조 확인: success와 data가 있거나, 직접 data 구조인 경우
        const data = result.success ? result.data : result;
        console.log('✅ 활동 분석 데이터 로드 성공:', data);
        return data || { summary: {}, memberStats: [], monthlyGameStats: [], gameTypeDistribution: {} };
      } else {
        const errorText = await response.text();
        console.error('❌ 활동 분석 데이터 로드 실패:', response.status, errorText);
        return { summary: {}, memberStats: [], monthlyGameStats: [], gameTypeDistribution: {} };
      }
    } catch (error) {
      console.error('❌ 활동 분석 데이터 로드 오류:', error);
      return { summary: {}, memberStats: [], monthlyGameStats: [], gameTypeDistribution: {} };
    }
  }, []);

  // 권한 체크 함수
  const hasPermission = (permission: string) => {
    const userPermissions = rolePermissions[currentUserRole].permissions;
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };





  // 알림 설정 변경 핸들러
  const handleNotificationChange = (category: string, field: string, value: any) => {
    setNotificationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value
      }
    }));
    setIsNotificationChanged(true);
  };

  // 알림 설정 저장
  const handleSaveNotifications = async () => {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      
      toast({
        title: '알림 설정이 저장되었습니다',
        description: '알림 설정이 성공적으로 업데이트되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setIsNotificationChanged(false);
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
      toast({
        title: '알림 설정 저장 실패',
        description: '알림 설정을 저장하는 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // 알림 설정 로드
  const loadNotificationSettings = () => {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        setNotificationSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
    }
  };

  // 알림 발송 엔진
  const sendNotification = async (notification: Omit<Notification, 'id' | 'sentAt' | 'status'>): Promise<boolean> => {
    lastNotificationErrorRef.current = '';
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      sentAt: new Date().toISOString(),
      status: 'PENDING'
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    try {
      // 1. 이메일 알림 발송
      if (notification.deliveryMethods.includes('email')) {
        const emailOk = await sendEmailNotification(newNotification);
        if (!emailOk) {
          throw new Error(lastNotificationErrorRef.current || '이메일 알림 발송 실패');
        }
      }

      // 2. 푸시 알림 발송
      if (notification.deliveryMethods.includes('push')) {
        await sendPushNotification(newNotification);
      }

      // 3. 인앱 알림 발송
      if (notification.deliveryMethods.includes('inapp')) {
        await sendInAppNotification(newNotification);
      }

      // 알림 상태를 성공으로 업데이트
      setNotifications(prev => 
        prev.map(n => n.id === newNotification.id ? { ...n, status: 'SENT' } : n)
      );

      // 활동 로그에 알림 발송 기록
      addActivityLog(0, 'System', 'ANNOUNCEMENT_CREATE', `알림 발송: ${notification.title}`);
      return true;

    } catch (error) {
      console.error('알림 발송 실패:', error);
      if (error instanceof Error && error.message) {
        lastNotificationErrorRef.current = error.message;
      }
      
      // 알림 상태를 실패로 업데이트
      setNotifications(prev => 
        prev.map(n => n.id === newNotification.id ? { ...n, status: 'FAILED' } : n)
      );
      return false;
    }
  };


  // 이메일 알림 발송
  const sendEmailNotification = async (notification: Notification): Promise<boolean> => {
    try {
      console.log('📧 이메일 알림 발송 시작:', notification);
      console.log('📧 발송 대상자 ID 목록:', notification.recipients);
      console.log('📧 발송 대상자 수:', notification.recipients.length);
      
      // 발송 대상자 상세 정보 확인
      const recipientDetails = notification.recipients.map(id => {
        const user = userList.find(u => u.id === id);
        return {
          id,
          name: user?.name || '알 수 없음',
          email: user?.email || '이메일 없음',
          role: user?.role || '알 수 없음',
          status: user?.status || '알 수 없음'
        };
      });
      console.log('📧 발송 대상자 상세 정보:', recipientDetails);
      console.log('📧 이메일이 있는 대상자:', recipientDetails.filter(r => r.email && r.email !== '이메일 없음').map(r => `${r.name}(${r.email})`));
      console.log('📧 이메일이 없는 대상자:', recipientDetails.filter(r => !r.email || r.email === '이메일 없음').map(r => `${r.name}(${r.id})`));
      
      // 공통 요청 함수 (재사용)
      const requestOnce = async () => {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token_backup');
        console.log('📧 사용할 토큰:', token ? `있음 (길이: ${token.length})` : '없음');
        const baseUrl = await ensureApiBaseUrl().catch(() => '/api/auth');
        
        const res = await fetch(`${baseUrl}/send-test-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            recipients: notification.recipients,
            title: notification.title,
            message: notification.message,
            html: notification.message,
            useRaw: true,
            ...(notification.type === 'GAME_REMINDER' && notification.gameMailImage
              ? { gameMailImage: notification.gameMailImage }
              : {})
          })
        });
        
        console.log('📧 API 응답 상태:', res.status, res.statusText);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('📧 API 오류 응답:', errorText);
          let parsedReason = '';
          try {
            const parsed = JSON.parse(errorText);
            parsedReason = parsed?.reason || parsed?.error || parsed?.message || '';
          } catch {
            parsedReason = '';
          }
          throw new Error(parsedReason || `HTTP ${res.status}: ${errorText}`);
        }
        return res.json();
      };

      // 1회 재시도 로직
      let result: any;
      try {
        result = await requestOnce();
      } catch (e) {
        console.warn('📧 1차 발송 실패, 1초 후 재시도합니다...', e);
        await new Promise(r => setTimeout(r, 1000));
        result = await requestOnce();
      }

      console.log('📧 이메일 발송 결과:', result);
      console.log('📧 발송 성공 건수:', result.result?.successCount || 0);
      console.log('📧 발송 실패 건수:', result.result?.failCount || 0);
      console.log('📧 총 발송 대상자:', result.result?.total || 0);
      
      if (result.result?.successCount > 0) {
        console.log('✅ 이메일 발송 성공!');
      }
      if (result.result?.failCount > 0) {
        console.warn('⚠️ 일부 이메일 발송 실패:', result.result.failCount, '건');
      }

      if (!result?.result?.successCount || result.result.successCount <= 0) {
        throw new Error(result?.result?.reason || result?.reason || '이메일 발송 성공 건수가 0입니다.');
      }

        // 발송 성공 로그
        addActivityLog(0, 'System', 'ANNOUNCEMENT_CREATE', 
          `이메일 알림 발송 성공: ${notification.title} (성공: ${result.result.successCount}건, 실패: ${result.result.failCount}건)`);
      // 로컬 발송 이력 저장(최근 20건 유지)
      try {
        const key = 'email_send_history';
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        history.unshift({
          at: new Date().toISOString(),
          title: notification.title,
          recipients: notification.recipients,
          success: result.result?.successCount ?? 0,
          fail: result.result?.failCount ?? 0
        });
        localStorage.setItem(key, JSON.stringify(history.slice(0, 20)));
      } catch {}
      return true;

    } catch (error) {
      console.error('❌ 이메일 발송 오류:', error);
      const message = error instanceof Error ? error.message : '이메일 발송 오류';
      lastNotificationErrorRef.current = message;
      addActivityLog(0, 'System', 'ANNOUNCEMENT_CREATE', 
        `이메일 알림 발송 오류: ${message}`);
      // 실패 이력 저장
      try {
        const key = 'email_send_history';
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        history.unshift({
          at: new Date().toISOString(),
          title: notification.title,
          recipients: notification.recipients,
          error: message
        });
        localStorage.setItem(key, JSON.stringify(history.slice(0, 20)));
      } catch {}
      return false;
    }
  };

  const parseStringArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
      } catch {
        return [];
      }
    }
    return [];
  };

  const getGameParticipantSummary = (game: any) => {
    const allNames = parseStringArray(game?.allParticipantNames);
    const selectedNames = parseStringArray(game?.selectedMembers);
    const manualNames = parseStringArray(game?.memberNames).filter((n) => !n.startsWith('용병'));
    const mergedNames = Array.from(new Set([...allNames, ...selectedNames, ...manualNames]));
    const mercenaryCount = Number(game?.mercenaryCount || 0);
    const totalParticipantCount =
      Number(game?.totalParticipantCount || 0) ||
      Number(game?.count || 0) ||
      mergedNames.length + mercenaryCount;

    return {
      names: mergedNames,
      mercenaryCount,
      totalParticipantCount,
    };
  };

  // 경기 알림 이메일용 이미지 카드 데이터(백엔드 SVG→PNG 렌더링 입력)
  const buildGameMailImagePayload = (futureGames: any[]) => {
    const nowLabel = new Date().toLocaleString('ko-KR');
    const games = (futureGames || []).slice(0, 3).map((game: any) => ({
      date: game?.date,
      time: game?.time,
      eventType: game?.eventType,
      location: game?.location,
      locationAddress: game?.locationAddress,
      memberNames: game?.memberNames,
      selectedMembers: game?.selectedMembers,
      allParticipantNames: game?.allParticipantNames,
      mercenaryCount: game?.mercenaryCount,
      totalParticipantCount: game?.totalParticipantCount,
      count: game?.count,
    }));

    return { nowLabel, games };
  };

  const loadGameMailPreviewImage = useCallback(async () => {
    const now = new Date();
    const futureGames = (games || []).filter((g: any) => new Date(g.date).getTime() >= now.getTime());
    if (futureGames.length === 0) {
      return { objectUrl: '', error: '발송할 미래 경기가 없습니다.' };
    }

    const token = localStorage.getItem('token') || localStorage.getItem('auth_token_backup');
    if (!token) {
      return { objectUrl: '', error: '로그인 토큰이 없습니다. 다시 로그인해주세요.' };
    }

    const baseUrl = await ensureApiBaseUrl().catch(() => '/api/auth');
    const gameMailImage = buildGameMailImagePayload(futureGames);

    const res = await fetch(`${baseUrl}/render-game-mail-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gameMailImage }),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        msg = parsed?.error || parsed?.message || msg;
      } catch {
        if (text) msg = text;
      }
      return { objectUrl: '', error: msg };
    }

    const blob = await res.blob();
    return { objectUrl: URL.createObjectURL(blob), error: '' };
  }, [games]);

  // 경기 알림용 HTML 생성 (프리뷰와 동일 템플릿, 미래 경기만)
  const buildGameNotificationHtml = () => {
    const now = new Date();
    const futureGames = (games || []).filter((g: any) => new Date(g.date).getTime() >= now.getTime());
    const formatEventType = (eventType?: string) => {
      const normalized = eventType || '자체';
      if (['풋살', 'FRIENDLY', 'FRIENDLY_MATCH'].includes(normalized)) return '매치';
      if (!['매치', '자체', '회식', '기타'].includes(normalized)) return '기타';
      return normalized;
    };
    const nowLabel = new Date().toLocaleString('ko-KR');

    if (futureGames.length === 0) {
      return `
        <div style="margin:0;padding:16px;background:#f3f4f6;font-family:Arial,'Noto Sans KR','Malgun Gothic',sans-serif;color:#111827;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#4f46e5;color:#ffffff;padding:16px 20px;font-size:20px;font-weight:700;">⚽ 경기 알림</td>
            </tr>
            <tr>
              <td style="padding:16px 20px;font-size:14px;line-height:1.6;">확정된 경기 일정을 회원들에게 알립니다.</td>
            </tr>
            <tr>
              <td style="padding:0 20px 16px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                  <tr>
                    <td style="padding:14px;font-size:14px;line-height:1.6;">현재 확정된 경기가 없습니다.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 16px 20px;font-size:12px;color:#6b7280;">발송 시간: ${nowLabel}</td>
            </tr>
            <tr>
              <td style="padding:0 20px 20px 20px;font-size:12px;color:#9ca3af;">이 이메일은 자동으로 발송되었습니다. FC CHAL GGYEO 관리 시스템</td>
            </tr>
          </table>
        </div>`;
    }

    const items = futureGames.slice(0, 3).map((game: any, idx: number) => {
      const { names, mercenaryCount, totalParticipantCount } = getGameParticipantSummary(game);
      const dateStr = new Date(game.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
      const location = game.location || '장소 미정';
      const address = game.locationAddress ? `(${game.locationAddress})` : '';
      const locationBase =
        typeof location === 'string' && location.includes(' ')
          ? location.substring(0, location.lastIndexOf(' '))
          : location;
      const mapLink = location
        ? `<a href="https://map.kakao.com/link/search/${encodeURIComponent(String(locationBase))}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:#FEE500;border:1px solid #e5e7eb;border-radius:6px;color:#1d4ed8;text-decoration:none;font-weight:700;font-size:10px;line-height:1;">MAP</a>`
        : '';
      const participantDetailLine = (() => {
        const memberLine = names.length > 0 ? `- 회원: ${names.join(', ')}` : '';
        const mercenaryLine = mercenaryCount > 0 ? `- 용병: ${mercenaryCount}명` : '';
        if (!memberLine && !mercenaryLine) return '';
        return `<tr>
          <td colspan="4" style="padding:4px 0 0 2ch;text-align:left;color:#374151;font-size:13px;line-height:1.45;">
            ${memberLine ? `${memberLine}<br />` : ''}
            ${mercenaryLine}
          </td>
        </tr>`;
      })();
      return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:${idx === 0 ? '0' : '10px'};background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
          <tr>
            <td style="padding:12px 14px;font-size:14px;line-height:1.55;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="top" align="center" style="width:28px;padding:0 0 4px 0;">🏆</td>
                  <td valign="top" align="center" style="width:62px;font-weight:700;padding:0 0 4px 0;">유형</td>
                  <td valign="top" align="left" style="width:16px;font-weight:700;padding:0 0 4px 0;">:</td>
                  <td valign="top" style="padding:0 0 4px 0;text-align:left;">${formatEventType(game.eventType)}</td>
                </tr>
                <tr>
                  <td valign="top" align="center" style="width:28px;padding:0 0 4px 0;">📅</td>
                  <td valign="top" align="center" style="width:62px;font-weight:700;padding:0 0 4px 0;">일시</td>
                  <td valign="top" align="left" style="width:16px;font-weight:700;padding:0 0 4px 0;">:</td>
                  <td valign="top" style="padding:0 0 4px 0;text-align:left;">${dateStr}${game.time ? ` ⏰ ${game.time}` : ''}</td>
                </tr>
                <tr>
                  <td valign="top" align="center" style="width:28px;padding:0 0 4px 0;">📍</td>
                  <td valign="top" align="center" style="width:62px;font-weight:700;padding:0 0 4px 0;">장소</td>
                  <td valign="top" align="left" style="width:16px;font-weight:700;padding:0 0 4px 0;">:</td>
                  <td valign="top" style="padding:0 0 4px 0;">
                    <div style="text-align:left;line-height:1.25;">${location}</div>
                    ${address ? `
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:0;">
                      <tr>
                        <td valign="middle" style="color:#4b5563;text-align:left;line-height:1.2;">${address}</td>
                        <td valign="middle" align="right" style="width:42px;padding-left:8px;">${mapLink}</td>
                      </tr>
                    </table>` : ''}
                  </td>
                </tr>
                <tr>
                  <td valign="top" align="center" style="width:28px;padding:0;">👥</td>
                  <td valign="top" align="center" style="width:62px;font-weight:700;padding:0;">참가자</td>
                  <td valign="top" align="left" style="width:16px;font-weight:700;padding:0;">:</td>
                  <td valign="top" style="padding:0;text-align:left;">${totalParticipantCount}명</td>
                </tr>
                ${participantDetailLine}
              </table>
            </td>
          </tr>
        </table>`;
    }).join('');

    return `
      <div style="margin:0;padding:16px;background:#f3f4f6;font-family:Arial,'Noto Sans KR','Malgun Gothic',sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#4f46e5;color:#ffffff;padding:16px 20px;font-size:20px;font-weight:700;">⚽ 경기 알림</td>
          </tr>
          <tr>
            <td style="padding:16px 20px;font-size:14px;line-height:1.6;">확정된 경기 일정을 회원들에게 알립니다.</td>
          </tr>
          <tr>
            <td style="padding:0 20px 16px 20px;">
              <div style="font-size:14px;font-weight:700;margin-bottom:8px;">다음 경기 일정</div>
              ${items}
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 16px 20px;font-size:12px;color:#6b7280;">발송 시간: ${nowLabel}</td>
          </tr>
          <tr>
            <td style="padding:0 20px 20px 20px;font-size:12px;color:#9ca3af;">이 이메일은 자동으로 발송되었습니다. FC CHAL GGYEO 관리 시스템</td>
          </tr>
        </table>
      </div>`;
  };

  // 실제 경기 알림 발송 (프리뷰 HTML 그대로, 실제 수신자 대상으로)
  const sendGameNotification = async () => {
    console.log('📧 경기 알림 발송 시작 - 현재 상태:', {
      userListCount: userList.length,
      gamesCount: games.length,
      notificationSettings: notificationSettings.gameReminder
    });
    
    const now = new Date();
    const futureGames = (games || []).filter((g: any) => new Date(g.date).getTime() >= now.getTime());
    console.log('📧 미래 경기 수:', futureGames.length);
    
    if (futureGames.length === 0) {
      toast({ title: '경기 알림 발송 불가', description: '발송할 미래 경기가 없습니다.', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    
    // 대상자 결정
    const target = notificationSettings.gameReminder.targets[0] || 'all';
    console.log('📧 선택된 발송 대상:', target);
    
    let recipients: number[] = [];
    if (target === 'all') {
      if (!userList || userList.length === 0) {
        console.error('❌ userList가 비어있습니다!');
        toast({ 
          title: '경기 알림 발송 실패', 
          description: '회원 목록을 불러올 수 없습니다. 페이지를 새로고침해주세요.', 
          status: 'error', 
          duration: 5000, 
          isClosable: true 
        });
        return;
      }
      recipients = userList.map((u: any) => u.id);
      console.log('📧 경기 알림 발송 - 전체 회원 대상:', {
        userListCount: userList.length,
        recipientsCount: recipients.length,
        userList: userList.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
      });
    } else if (target === 'participating') {
      const ids = new Set<number>();
      console.log('📧 미래 경기별 참가자 확인:', futureGames.map((g: any) => ({
        gameId: g.id,
        date: g.date,
        attendancesCount: (g.attendances || []).length,
        attendances: (g.attendances || []).map((a: any) => ({ userId: a.userId, status: a.status }))
      })));
      
      futureGames.forEach((g: any) => {
        if (g.attendances && Array.isArray(g.attendances)) {
          g.attendances.forEach((a: any) => {
            if (a?.userId) {
              ids.add(a.userId);
            }
          });
        }
        // attendances가 비어있는 데이터셋 대비: selected/member 이름으로 사용자 ID 매핑
        if ((!g.attendances || g.attendances.length === 0) && userList && userList.length > 0) {
          const { names } = getGameParticipantSummary(g);
          names.forEach((name) => {
            const hit = userList.find((u: any) => u.name === name);
            if (hit?.id) ids.add(hit.id);
          });
        }
      });
      recipients = Array.from(ids);
      console.log('📧 경기 알림 발송 - 참가 예정 회원 대상:', {
        recipientsCount: recipients.length,
        recipients: recipients,
        futureGamesCount: futureGames.length
      });
      
      if (recipients.length === 0) {
        toast({ 
          title: '경기 알림 발송 불가', 
          description: '참가 예정 회원이 없습니다. 전체 회원 대상으로 발송해주세요.', 
          status: 'warning', 
          duration: 5000, 
          isClosable: true 
        });
        return;
      }
    } else if (target === 'admin') {
      if (!userList || userList.length === 0) {
        console.error('❌ userList가 비어있습니다!');
        toast({ 
          title: '경기 알림 발송 실패', 
          description: '회원 목록을 불러올 수 없습니다. 페이지를 새로고침해주세요.', 
          status: 'error', 
          duration: 5000, 
          isClosable: true 
        });
        return;
      }
      recipients = userList.filter((u: any) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').map((u: any) => u.id);
      console.log('📧 경기 알림 발송 - 관리자 대상:', {
        recipientsCount: recipients.length,
        recipients: recipients
      });
    }
    
    if (recipients.length === 0) {
      console.error('❌ 발송 대상자가 0명입니다!');
      toast({ 
        title: '경기 알림 발송 실패', 
        description: '발송 대상자가 없습니다. 알림 대상을 확인해주세요.', 
        status: 'error', 
        duration: 5000, 
        isClosable: true 
      });
      return;
    }

    const htmlContent = buildGameNotificationHtml();
    const gameMailImage = buildGameMailImagePayload(futureGames);
    const ok = await sendNotification({
      type: 'GAME_REMINDER',
      title: '⚽ 경기 알림',
      message: htmlContent,
      recipients,
      deliveryMethods: ['email'],
      metadata: { isGameNotification: true },
      gameMailImage
    });

    if (ok) {
      toast({ title: '경기 알림 발송 완료', description: `${recipients.length}명에게 경기 알림이 발송되었습니다.`, status: 'success', duration: 3000, isClosable: true });
    } else {
      toast({ title: '경기 알림 발송 실패', description: lastNotificationErrorRef.current || '이메일 서버 또는 수신자 정보를 확인해주세요.', status: 'error', duration: 5000, isClosable: true });
    }
  };

  // 푸시 알림 발송
  const sendPushNotification = async (notification: Notification) => {
    // 실제 구현에서는 Firebase Cloud Messaging 사용
    console.log('📱 푸시 알림 발송:', notification);
    
  };

  // 인앱 알림 발송
  const sendInAppNotification = async (notification: Notification) => {
    // WebSocket을 통한 실시간 인앱 알림
    console.log('🔔 인앱 알림 발송:', notification);
    
    // 전역 이벤트 발생 (인앱 알림용)
    const event = new CustomEvent('notification-received', {
      detail: { notification }
    });
    window.dispatchEvent(event);
    
  };

  // 선수 관련 함수들
  const handleAddPlayer = () => {
    if (!newPlayer.name) {
      toast({
        title: '선수명을 입력해주세요',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const player: Player = {
      id: Date.now().toString(),
      name: newPlayer.name!,
      position: newPlayer.position || 'MF',
      jerseyNumber: newPlayer.jerseyNumber,
      phone: newPlayer.phone,
      email: newPlayer.email,
      joinDate: newPlayer.joinDate || new Date().toISOString().split('T')[0],
      preferredPosition: newPlayer.preferredPosition || [],
      skillRating: newPlayer.skillRating || 70,
      attendanceRate: newPlayer.attendanceRate || 0,
      isActive: newPlayer.isActive !== false,
      notes: newPlayer.notes
    };

    setPlayers(prev => [...prev, player]);
    localStorage.setItem('players', JSON.stringify([...players, player]));
    
    setNewPlayer({
      name: '',
      position: 'MF',
      preferredPosition: [],
      skillRating: 70,
      attendanceRate: 0,
      isActive: true,
      joinDate: new Date().toISOString().split('T')[0]
    });
    setIsPlayerFormOpen(false);

    toast({
      title: '선수가 추가되었습니다',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setNewPlayer(player);
    setIsPlayerFormOpen(true);
  };

  const handleUpdatePlayer = () => {
    if (!editingPlayer || !newPlayer.name) return;

    const updatedPlayer: Player = {
      ...editingPlayer,
      ...newPlayer,
      name: newPlayer.name!,
    };

    const updatedPlayers = players.map(p => 
      p.id === editingPlayer.id ? updatedPlayer : p
    );
    
    setPlayers(updatedPlayers);
    localStorage.setItem('players', JSON.stringify(updatedPlayers));
    
    setEditingPlayer(null);
    setNewPlayer({
      name: '',
      position: 'MF',
      preferredPosition: [],
      skillRating: 70,
      attendanceRate: 0,
      isActive: true,
      joinDate: new Date().toISOString().split('T')[0]
    });
    setIsPlayerFormOpen(false);

    toast({
      title: '선수 정보가 수정되었습니다',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDeletePlayer = (playerId: string) => {
    const updatedPlayers = players.filter(p => p.id !== playerId);
    setPlayers(updatedPlayers);
    localStorage.setItem('players', JSON.stringify(updatedPlayers));

    toast({
      title: '선수가 삭제되었습니다',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // 선수 데이터 로드
  const loadPlayers = () => {
    try {
      const saved = localStorage.getItem('players');
      if (saved) {
        setPlayers(JSON.parse(saved));
      }
    } catch (error) {
      console.error('선수 데이터 로드 실패:', error);
    }
  };

  // 공지사항 관련 함수들
  const handleAddAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: '제목과 내용을 모두 입력해주세요',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const announcement: Announcement = {
      id: Date.now().toString(),
      title: newAnnouncement.title!,
      content: newAnnouncement.content!,
      type: newAnnouncement.type || 'normal',
      startDate: newAnnouncement.startDate || new Date().toISOString().split('T')[0],
      endDate: newAnnouncement.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: newAnnouncement.isActive !== false,
      author: user?.name || '관리자',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: newAnnouncement.pinned || false
    };

    setAnnouncements(prev => [...prev, announcement]);
    localStorage.setItem('announcements', JSON.stringify([...announcements, announcement]));
    
    setNewAnnouncement({
      title: '',
      content: '',
      type: 'normal',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      pinned: false
    });
    setIsAnnouncementFormOpen(false);

    toast({
      title: '공지사항이 등록되었습니다',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setNewAnnouncement(announcement);
    setIsAnnouncementFormOpen(true);
  };

  const handleUpdateAnnouncement = () => {
    if (!editingAnnouncement || !newAnnouncement.title || !newAnnouncement.content) return;

    const updatedAnnouncement: Announcement = {
      ...editingAnnouncement,
      ...newAnnouncement,
      title: newAnnouncement.title!,
      content: newAnnouncement.content!,
      updatedAt: new Date().toISOString()
    };

    const updatedAnnouncements = announcements.map(a => 
      a.id === editingAnnouncement.id ? updatedAnnouncement : a
    );
    
    setAnnouncements(updatedAnnouncements);
    localStorage.setItem('announcements', JSON.stringify(updatedAnnouncements));
    
    setEditingAnnouncement(null);
    setNewAnnouncement({
      title: '',
      content: '',
      type: 'normal',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      pinned: false
    });
    setIsAnnouncementFormOpen(false);

    toast({
      title: '공지사항이 수정되었습니다',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    const updatedAnnouncements = announcements.filter(a => a.id !== announcementId);
    setAnnouncements(updatedAnnouncements);
    localStorage.setItem('announcements', JSON.stringify(updatedAnnouncements));

    toast({
      title: '공지사항이 삭제되었습니다',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleToggleAnnouncementStatus = (announcementId: string) => {
    const updatedAnnouncements = announcements.map(a => 
      a.id === announcementId ? { ...a, isActive: !a.isActive } : a
    );
    setAnnouncements(updatedAnnouncements);
    localStorage.setItem('announcements', JSON.stringify(updatedAnnouncements));
  };

  // 공지사항 데이터 로드
  const loadAnnouncements = () => {
    try {
      const saved = localStorage.getItem('announcements');
      if (saved) {
        setAnnouncements(JSON.parse(saved));
      }
    } catch (error) {
      console.error('공지사항 데이터 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadNotificationSettings();
    loadPlayers();
    loadAnnouncements();
    loadActivityLogs();
    
    // 활동 분석 데이터 로드
    const loadActivityData = async () => {
      const data = await fetchActivityAnalysisData();
      if (data) {
        setActivityAnalysisData(data);
      }
    };
    loadActivityData();
    loadVoteRecords();
    loadSuspensionRequests();
    checkVoteParticipation();
    
    // 알림 시스템 활성화
    setIsNotificationSystemActive(true);
    
  }, [loadData]);

  // 자동 알림 체크 시스템
  const checkAndSendNotifications = useCallback(() => {
    if (!isNotificationSystemActive) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
    const currentMinute = now.getMinutes();
    
    // 정확한 시간 체크 (15분 이내에만 실행)
    if (currentMinute > 15) return;
    
    // 1. 경기 전 알림 체크 (전날 15시, 당일 10시에 발송)
    if (notificationSettings.gameReminder.enabled && (currentHour === 15 || currentHour === 10)) {
      checkGameReminders(now);
    }

    // 2. 투표 마감 알림 체크
    if (notificationSettings.voteReminder.enabled) {
      checkVoteReminders(now, currentDay, currentHour);
    }

    // 3. 신규 회원 알림 체크
    if (notificationSettings.newMemberNotification.enabled) {
      checkNewMemberNotifications(now);
    }

    // 4. 경기 결과 알림 체크
    if (notificationSettings.gameResultNotification.enabled) {
      checkGameResultNotifications(now);
    }
  }, [isNotificationSystemActive, notificationSettings, games, notifications, userList]);

  // 경기 전 알림 체크 함수
  const checkGameReminders = (now: Date) => {
    games.forEach(game => {
      const gameDate = new Date(game.date);
      const gameDay = gameDate.getDate();
      const gameMonth = gameDate.getMonth();
      const gameYear = gameDate.getFullYear();
      
      // 경기 전날 15시 알림
      const dayBeforeGame = new Date(gameYear, gameMonth, gameDay - 1, 15, 0, 0);
      const isDayBefore = now.getDate() === dayBeforeGame.getDate() && 
                         now.getMonth() === dayBeforeGame.getMonth() && 
                         now.getFullYear() === dayBeforeGame.getFullYear() &&
                         now.getHours() === 15;
      
      // 경기 당일 10시 알림
      const dayOfGame = new Date(gameYear, gameMonth, gameDay, 10, 0, 0);
      const isDayOfGame = now.getDate() === dayOfGame.getDate() && 
                         now.getMonth() === dayOfGame.getMonth() && 
                         now.getFullYear() === dayOfGame.getFullYear() &&
                         now.getHours() === 10;
      
      if (isDayBefore || isDayOfGame) {
        // 이미 발송된 알림인지 체크
        const notificationType = isDayBefore ? 'GAME_DAY_BEFORE' : 'GAME_DAY_OF';
        const existingNotification = notifications.find(n => 
          n.type === notificationType && 
          n.metadata?.gameId === game.id &&
          n.metadata?.notificationDate === now.toDateString()
        );
        
        if (!existingNotification) {
          // 경기 참석자 목록 가져오기 (임시로 전체 회원으로 설정)
          const recipients = userList.filter(user => user.status === 'ACTIVE').map(user => user.id);
          const isTomorrow = isDayBefore;
          
          sendNotification({
            type: notificationType,
            title: isTomorrow ? '⚽ 내일 경기 알림' : '⚽ 오늘 경기 알림',
            message: createGameReminderEmail(game, isTomorrow),
            recipients,
            deliveryMethods: ['email'],
            metadata: {
              gameId: game.id,
              gameDate: game.date,
              notificationDate: now.toDateString(),
              isTomorrow
            }
          });
        }
      }
    });
  };

  // 투표 마감 알림 체크 함수
  const checkVoteReminders = (now: Date, currentDay: number, currentHour: number) => {
    // 매주 월요일 10시: 투표 시작 알림
    if (currentDay === 1 && currentHour === 10) {
      const existingNotification = notifications.find(n => 
        n.type === 'VOTE_START' && 
        n.metadata?.weekStart === getWeekStart(now).toDateString()
      );
      
      if (!existingNotification) {
        sendNotification({
          type: 'VOTE_START',
          title: '🗳️ 다음주 일정 투표 시작',
          message: createVoteStartEmail(),
          recipients: userList.map(user => user.id),
          deliveryMethods: ['email'],
          metadata: {
            weekStart: getWeekStart(now).toDateString()
          }
        });
      }
    }
    
    // 매주 목요일 10시: 투표하지 않은 회원에게 투표 독려
    if (currentDay === 4 && currentHour === 10) {
      const voteDeadline = getVoteDeadline();
      const nonVoters = getNonVoters();
      
      if (nonVoters.length > 0) {
        const existingNotification = notifications.find(n => 
          n.type === 'VOTE_REMINDER' && 
          n.metadata?.reminderTime === `${currentDay}-${currentHour}` &&
          n.metadata?.weekStart === getWeekStart(now).toDateString()
        );
        
        if (!existingNotification) {
          sendNotification({
            type: 'VOTE_REMINDER',
            title: '🗳️ 투표 독려 알림',
            message: createVoteReminderEmail(voteDeadline, nonVoters),
            recipients: nonVoters.map(user => user.id),
            deliveryMethods: ['email'],
            metadata: {
              reminderTime: `${currentDay}-${currentHour}`,
              weekStart: getWeekStart(now).toDateString(),
              nonVoterCount: nonVoters.length
            }
          });
        }
      }
    }
  };

  // 투표하지 않은 회원 목록 가져오기 (unifiedVoteData 기반으로 정확화)
  const getNonVoters = () => {
    if (!unifiedVoteData) {
      return [];
    }

    const allMembers = unifiedVoteData.allMembers || userList;
    
    // 가장 최근 세션에서 투표한 사용자 ID 추출
    const votedUserIds = new Set();
    
    // 활성 세션이 있으면 활성 세션 사용, 없으면 가장 최근 완료된 세션 사용
    const targetSession = unifiedVoteData.activeSession?.isActive 
      ? unifiedVoteData.activeSession 
      : (unifiedVoteData.lastWeekResults || unifiedVoteData.activeSession);
    
    if (targetSession?.participants && Array.isArray(targetSession.participants)) {
      targetSession.participants.forEach((participant: any) => {
        votedUserIds.add(participant.userId);
      });
    } else if (targetSession?.results) {
      Object.values(targetSession.results).forEach((dayResult: any) => {
        if (dayResult.participants && Array.isArray(dayResult.participants)) {
          dayResult.participants.forEach((participant: any) => {
            votedUserIds.add(participant.userId);
          });
        }
      });
    }
    
    // 투표하지 않은 회원들
    return allMembers.filter((member: any) => 
      member.status === 'ACTIVE' && !votedUserIds.has(member.id)
    );
  };

  // 주의 시작일 (월요일) 가져오기
  const getWeekStart = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일이 1, 일요일이 0
    return new Date(date.setDate(diff));
  };

  // 신규 회원 알림 체크 함수
  const checkNewMemberNotifications = (now: Date) => {
    // 구현 예정
  };

  // 경기 결과 알림 체크 함수
  const checkGameResultNotifications = (now: Date) => {
    // 구현 예정
  };

  // 경기 알림 이메일 생성 함수
  const createGameReminderEmail = (game: any, isTomorrow: boolean) => {
    const gameDate = new Date(game.date);
    const formattedDate = gameDate.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    });
    
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; border-radius: 15px; color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">⚽ FC CHAL GGYEO</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">축구팀 관리 시스템</p>
        </div>
        
        <!-- 축구 경기 이미지 -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 15px; border: 3px solid #ffd700;">
            <div style="width: 120px; height: 120px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
              <span style="font-size: 60px;">⚽</span>
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #ffd700;">
              ${isTomorrow ? '내일 경기!' : '오늘 경기!'}
            </div>
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">
            ${isTomorrow ? '📅 내일 경기 알림' : '⚽ 오늘 경기 알림'}
          </h2>
          
          <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; font-size: 20px; text-align: center;">경기 정보</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
              <div>
                <strong style="color: #ffd700;">날짜</strong><br>
                <span>${formattedDate}</span>
              </div>
              <div>
                <strong style="color: #ffd700;">시간</strong><br>
                <span>${gameDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            ${game.location ? `
              <div style="text-align: center; margin-top: 15px;">
                <strong style="color: #ffd700;">장소</strong><br>
                <span>${game.location}</span>
              </div>
            ` : ''}
            ${game.opponent ? `
              <div style="text-align: center; margin-top: 15px;">
                <strong style="color: #ffd700;">상대팀</strong><br>
                <span>${game.opponent}</span>
              </div>
            ` : ''}
          </div>
          
          <p style="margin: 0; font-size: 18px; line-height: 1.6; text-align: center;">
            ${isTomorrow ? '내일 경기가 있습니다!' : '오늘 경기가 있습니다!'}<br>
            준비물을 챙기고 시간에 맞춰 참석해주세요.
          </p>
        </div>
        
        <div style="text-align: center; font-size: 14px; opacity: 0.7;">
          <p style="margin: 0;">이 이메일은 자동으로 발송되었습니다.</p>
          <p style="margin: 5px 0 0 0;">FC CHAL GGYEO 관리 시스템</p>
        </div>
      </div>
    `;
  };

  // 투표 시작 이메일 생성 함수
  const createVoteStartEmail = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const weekStart = getWeekStart(nextWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const formattedWeekStart = weekStart.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const formattedWeekEnd = weekEnd.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 15px; color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">⚽ FC CHAL GGYEO</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">축구팀 관리 시스템</p>
        </div>
        
        <!-- 투표 이미지 -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 15px; border: 3px solid #ffd700;">
            <div style="width: 120px; height: 120px; background: linear-gradient(45deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
              <span style="font-size: 60px;">🗳️</span>
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #ffd700;">
              투표 시작!
            </div>
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">🗳️ 다음주 일정 투표 시작</h2>
          
          <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; font-size: 20px; text-align: center;">투표 기간</h3>
            <div style="text-align: center; font-size: 18px;">
              <strong style="color: #ffd700;">${formattedWeekStart} ~ ${formattedWeekEnd}</strong>
            </div>
            <p style="margin: 15px 0 0 0; text-align: center; font-size: 16px; opacity: 0.9;">
              다음주 수요일 17시까지 투표해주세요!
            </p>
          </div>
          
          <p style="margin: 0; font-size: 18px; line-height: 1.6; text-align: center;">
            다음주 일정에 대한 투표가 시작되었습니다.<br>
            가능한 날짜를 선택하여 빠른 시일 내에 투표해주세요.
          </p>
        </div>
        
        <div style="text-align: center; font-size: 14px; opacity: 0.7;">
          <p style="margin: 0;">이 이메일은 자동으로 발송되었습니다.</p>
          <p style="margin: 5px 0 0 0;">FC CHAL GGYEO 관리 시스템</p>
        </div>
      </div>
    `;
  };

    // 투표 독려 이메일 생성 함수
  const createVoteReminderEmail = (voteDeadline: any, nonVoters: any[]) => {
    const now = new Date();
    const deadline = new Date(voteDeadline.deadline);
    
    // 정확한 시간 계산
    const timeLeft = deadline.getTime() - now.getTime();
    const remainingDays = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    // 음수 값 방지
    const days = Math.max(0, remainingDays);
    const hours = Math.max(0, remainingHours);
    const minutes = Math.max(0, remainingMinutes);
    const seconds = Math.max(0, remainingSeconds);
    
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px; border-radius: 15px; color: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">⚽ FC CHAL GGYEO</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">축구팀 관리 시스템</p>
        </div>
        
        <!-- 투표 독려 이미지 -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 15px; border: 3px solid #ffd700;">
            <div style="width: 120px; height: 120px; background: linear-gradient(45deg, #ff6b6b, #ee5a24); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
              <span style="font-size: 60px;">🗳️</span>
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #ffd700;">
              투표 독려!
            </div>
          </div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">🗳️ 투표 독려 알림</h2>
          
          <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; font-size: 20px; text-align: center;">투표 마감까지 남은 시간</h3>
            
            <!-- 실시간 카운트다운 애니메이션 -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 400px; margin: 0 auto;">
                <div style="background: linear-gradient(145deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2)); padding: 15px; border-radius: 8px; border: 3px solid #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); position: relative; overflow: hidden;">
                  <div style="font-size: 32px; font-weight: bold; color: #ffd700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);" id="countdown-days">${days.toString().padStart(2, '0')}</div>
                  <div style="font-size: 14px; opacity: 0.9; font-weight: bold;">일</div>
                  <!-- 애니메이션 효과 -->
                  <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent); animation: shimmer 2s infinite; transform: translateX(-100%);"></div>
                </div>
                <div style="background: linear-gradient(145deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2)); padding: 15px; border-radius: 8px; border: 3px solid #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); position: relative; overflow: hidden;">
                  <div style="font-size: 32px; font-weight: bold; color: #ffd700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);" id="countdown-hours">${hours.toString().padStart(2, '0')}</div>
                  <div style="font-size: 14px; opacity: 0.9; font-weight: bold;">시</div>
                  <!-- 애니메이션 효과 -->
                  <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent); animation: shimmer 2s infinite 0.5s; transform: translateX(-100%);"></div>
                </div>
                <div style="background: linear-gradient(145deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2)); padding: 15px; border-radius: 8px; border: 3px solid #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); position: relative; overflow: hidden;">
                  <div style="font-size: 32px; font-weight: bold; color: #ffd700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);" id="countdown-minutes">${minutes.toString().padStart(2, '0')}</div>
                  <div style="font-size: 14px; opacity: 0.9; font-weight: bold;">분</div>
                  <!-- 애니메이션 효과 -->
                  <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 3), transparent); animation: shimmer 2s infinite 1s; transform: translateX(-100%);"></div>
                </div>
                <div style="background: linear-gradient(145deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2)); padding: 15px; border-radius: 8px; border: 3px solid #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); position: relative; overflow: hidden;">
                  <div style="font-size: 32px; font-weight: bold; color: #ffd700; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);" id="countdown-seconds">${seconds.toString().padStart(2, '0')}</div>
                  <div style="font-size: 14px; opacity: 0.9; font-weight: bold;">초</div>
                  <!-- 애니메이션 효과 -->
                  <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent); animation: shimmer 2s infinite 1.5s; transform: translateX(-100%);"></div>
                </div>
              </div>
            </div>
            
            <!-- 실시간 카운트다운 JavaScript -->
            <script>
              (function() {
                const deadline = new Date('${deadline.toISOString()}');
                
                function updateCountdown() {
                  const now = new Date();
                  const timeLeft = deadline.getTime() - now.getTime();
                  
                  if (timeLeft <= 0) {
                    // 마감 시간이 지났을 때
                    document.getElementById('countdown-days').textContent = '00';
                    document.getElementById('countdown-hours').textContent = '00';
                    document.getElementById('countdown-minutes').textContent = '00';
                    document.getElementById('countdown-seconds').textContent = '00';
                    return;
                  }
                  
                  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                  
                  document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
                  document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
                  document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
                  document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');
                }
                
                // 1초마다 업데이트
                updateCountdown();
                setInterval(updateCountdown, 1000);
              })();
            </script>
            
            <!-- CSS 애니메이션 -->
            <style>
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.02); opacity: 0.8; }
              }
              
              @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-5px); }
                60% { transform: translateY(-3px); }
              }
              
              #countdown-days, #countdown-hours, #countdown-minutes, #countdown-seconds {
                animation: pulse 2s infinite;
              }
              
              #countdown-days { animation-delay: 0s; }
              #countdown-hours { animation-delay: 0.5s; }
              #countdown-minutes { animation-delay: 1s; }
              #countdown-seconds { animation-delay: 1.5s; }
            </style>
            
            <p style="margin: 0; text-align: center; font-size: 16px; opacity: 0.9;">
              마감: ${deadline.toLocaleString('ko-KR')}
            </p>
          </div>
          
          <p style="margin: 0; font-size: 18px; line-height: 1.6; text-align: center;">
            아직 투표하지 않으셨습니다!<br>
            빠른 시일 내에 투표해주세요.
          </p>
          
          <div style="text-align: center; margin-top: 20px;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.3); padding: 15px 25px; border-radius: 25px;">
              <span style="font-size: 16px; font-weight: bold;">투표하지 않은 회원: ${nonVoters.length}명</span>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; font-size: 14px; opacity: 0.7;">
          <p style="margin: 0;">이 이메일은 자동으로 발송되었습니다.</p>
          <p style="margin: 5px 0 0 0;">FC CHAL GGYEO 관리 시스템</p>
        </div>
      </div>
    `;
  };

  // 자동 알림 체크 (1분마다)
  useEffect(() => {
    // 자동 메일은 백엔드 cron이 담당한다. 브라우저 타이머를 함께 실행하면
    // 관리자 페이지가 열린 동안 동일 메일이 중복 발송될 수 있다.
    const browserAutoNotificationsEnabled = false;
    if (!isNotificationSystemActive || !browserAutoNotificationsEnabled) return;

    const interval = setInterval(() => {
      checkAndSendNotifications();
    }, 60000); // 1분마다 체크

    return () => clearInterval(interval);
  }, [isNotificationSystemActive, checkAndSendNotifications]);

  // 활동 로그 로드
  const loadActivityLogs = () => {
    try {
      const saved = localStorage.getItem('activityLogs');
      if (saved) {
        setActivityLogs(JSON.parse(saved));
      }
    } catch (error) {
      console.error('활동 로그 데이터 로드 실패:', error);
    }
  };

  // 투표 기록 로드
  const loadVoteRecords = () => {
    try {
      const saved = localStorage.getItem('voteRecords');
      if (saved) {
        setVoteRecords(JSON.parse(saved));
      }
    } catch (error) {
      console.error('투표 기록 데이터 로드 실패:', error);
    }
  };

  // 정지 해제 요청 로드
  const loadSuspensionRequests = () => {
    try {
      const saved = localStorage.getItem('suspensionRequests');
      if (saved) {
        setSuspensionRequests(JSON.parse(saved));
      }
    } catch (error) {
      console.error('정지 해제 요청 데이터 로드 실패:', error);
    }
  };

  // 투표 참여도 체크 및 회원 상태 관리
  const checkVoteParticipation = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    userList.forEach(user => {
      if (user.role === 'MEMBER') {
        const userVotes = voteRecords.filter(v => v.userId === user.id && v.year === currentYear);
        const participatedVotes = userVotes.filter(v => v.participated);
        const totalVotes = userVotes.length;
        const consecutiveMissed = getConsecutiveMissedVotes(user.id, currentYear);
        
        // 연속 3회 또는 총 6회 미참여 시 경고
        if (consecutiveMissed >= 3 || (totalVotes > 0 && participatedVotes.length < totalVotes - 5)) {
          if (!voteWarnings.find(w => w.userId === user.id)) {
            addVoteWarning(user.id, user.name);
          }
        }
        
        // 연속 3회 미참여 시 정지
        if (consecutiveMissed >= 3) {
          suspendMember(user.id, user.name);
        }
      }
    });
  };

  // 알림 수신자 결정
  const getNotificationRecipients = (notificationType: string, game?: any): number[] => {
    const settings = notificationSettings[notificationType as keyof typeof notificationSettings];
    
    if (!settings || !settings.enabled) return [];
    
    switch (settings.targets[0]) {
      case 'all':
        return userList.map(user => user.id);
      case 'participating':
        if (game && (game as any).participants) {
          return (game as any).participants.map((p: any) => p.userId);
        }
        return userList.map(user => user.id);
      case 'admin':
        return userList.filter(user => user.role === 'ADMIN' || user.role === 'SUPER_ADMIN').map(user => user.id);
      default:
        return userList.map(user => user.id);
    }
  };

  // 투표 마감일 계산 (매주 목요일 17시)
  const getVoteDeadline = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0: 일요일, 1: 월요일, ..., 4: 목요일

    let daysUntilThursday;
    if (currentDay <= 4) { // Sun~Thu
      daysUntilThursday = 4 - currentDay;
    } else { // Fri, Sat → 다음주 목요일
      daysUntilThursday = 11 - currentDay;
    }

    const nextThursday = new Date(now);
    nextThursday.setDate(now.getDate() + daysUntilThursday);
    nextThursday.setHours(17, 0, 0, 0);

    return {
      text: `${nextThursday.getMonth() + 1}월 ${nextThursday.getDate()}일(목) 17시까지`,
      deadline: nextThursday,
      remainingHours: Math.max(0, (nextThursday.getTime() - now.getTime()) / (1000 * 60 * 60))
    };
  };

  // 프리뷰 모달 상태들
  const { isOpen: isGamePreviewOpen, onOpen: onGamePreviewOpen, onClose: onGamePreviewClose } = useDisclosure();
  const { isOpen: isVotePreviewOpen, onOpen: onVotePreviewOpen, onClose: onVotePreviewClose } = useDisclosure();

  const [gamePreviewObjectUrl, setGamePreviewObjectUrl] = useState<string>('');
  const [gamePreviewLoading, setGamePreviewLoading] = useState(false);
  const [gamePreviewError, setGamePreviewError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isGamePreviewOpen) return;

      setGamePreviewLoading(true);
      setGamePreviewError('');

      if (gamePreviewObjectUrl) {
        URL.revokeObjectURL(gamePreviewObjectUrl);
        setGamePreviewObjectUrl('');
      }

      try {
        const { objectUrl, error } = await loadGameMailPreviewImage();
        if (cancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return;
        }
        if (error) {
          setGamePreviewError(error);
          setGamePreviewObjectUrl('');
        } else {
          setGamePreviewObjectUrl(objectUrl);
        }
      } catch (e: any) {
        if (!cancelled) {
          setGamePreviewError(e?.message || '이미지 프리뷰를 불러오지 못했습니다.');
          setGamePreviewObjectUrl('');
        }
      } finally {
        if (!cancelled) setGamePreviewLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isGamePreviewOpen, loadGameMailPreviewImage]);

  const handleGamePreviewClose = () => {
    if (gamePreviewObjectUrl) {
      URL.revokeObjectURL(gamePreviewObjectUrl);
      setGamePreviewObjectUrl('');
    }
    setGamePreviewError('');
    setGamePreviewLoading(false);
    onGamePreviewClose();
  };

  // 수동 알림 발송 함수들
  const sendTestNotification = () => {
    sendNotification({
      type: 'GAME_REMINDER',
      title: '🧪 테스트 알림',
      message: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 15px; color: white;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 300;">⚽ FC CHAL GGYEO</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">축구팀 관리 시스템</p>
          </div>
          
          <div style="background: rgba(255, 255, 255, 0.1); padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">🧪 테스트 알림</h2>
            <p style="margin: 0; font-size: 18px; line-height: 1.6; text-align: center;">
              이것은 테스트 알림입니다.<br>
              알림 시스템이 정상적으로 작동하고 있습니다.
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 15px 25px; border-radius: 25px;">
              <span style="font-size: 14px; opacity: 0.9;">발송 시간: ${new Date().toLocaleString('ko-KR')}</span>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 14px; opacity: 0.7;">
            <p style="margin: 0;">이 이메일은 자동으로 발송되었습니다.</p>
            <p style="margin: 5px 0 0 0;">FC CHAL GGYEO 관리 시스템</p>
          </div>
        </div>
      `,
      recipients: userList.map(user => user.id),
      deliveryMethods: ['email', 'push', 'inapp'],
      metadata: { isTest: true }
    });

    toast({
      title: '테스트 알림 발송',
      description: '테스트 알림이 발송되었습니다.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // 경기 알림 프리뷰 보기
  const showGamePreview = () => {
    onGamePreviewOpen();
  };

  // 투표 알림 프리뷰 보기
  const showVotePreview = () => {
    onVotePreviewOpen();
  };

  const sendVoteReminder = async () => {
    const voteDeadline = getVoteDeadline();
    
    // 투표하지 않은 회원 목록 가져오기 (getNonVoters 함수 사용)
    const nonVoters = getNonVoters();
    const voteTarget = notificationSettings.voteReminder.targets[0] || 'nonVoters';
    const recipients = voteTarget === 'all' ? userList : nonVoters;

    if (recipients.length === 0) {
      toast({
        title: '투표 알림 발송 불가',
        description: voteTarget === 'all' ? '발송 대상 회원이 없습니다.' : '현재 투표 미참여 회원이 없습니다.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // 투표 독려 이메일 생성 (카운트다운 포함)
    const emailMessage = createVoteReminderEmail(voteDeadline, nonVoters);
    
    const ok = await sendNotification({
      type: 'VOTE_REMINDER',
      title: '🗳️ 투표 독려 알림',
      message: emailMessage,
      recipients: recipients.map(user => user.id),
      deliveryMethods: ['email'],
      metadata: { 
        deadline: voteDeadline.deadline.toISOString(),
        isManual: true,
        nonVoterCount: nonVoters.length,
        target: voteTarget
      }
    });

    if (ok) {
      toast({
        title: '투표 독려 알림 발송',
        description: voteTarget === 'all'
          ? `전체 ${recipients.length}명의 회원에게 투표 알림이 발송되었습니다.`
          : `투표하지 않은 ${recipients.length}명의 회원에게 투표 독려 알림이 발송되었습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: '투표 알림 발송 실패',
        description: lastNotificationErrorRef.current || '이메일 서버 또는 수신자 정보를 확인해주세요.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // 연속 미참여 투표 수 계산
  const getConsecutiveMissedVotes = (userId: number, year: number): number => {
    const userVotes = voteRecords.filter(v => v.userId === userId && v.year === year);
    let consecutiveMissed = 0;
    
    for (let i = userVotes.length - 1; i >= 0; i--) {
      if (!userVotes[i].participated) {
        consecutiveMissed++;
      } else {
        break;
      }
    }
    
    return consecutiveMissed;
  };

  // 투표 경고 추가
  const addVoteWarning = (userId: number, userName: string) => {
    const newWarning = {
      userId,
      userName,
      warningCount: 1,
      lastWarningDate: new Date().toISOString()
    };
    
    setVoteWarnings(prev => [...prev, newWarning]);
    localStorage.setItem('voteWarnings', JSON.stringify([...voteWarnings, newWarning]));
    
    // 활동 로그에 경고 기록
    addActivityLog(userId, userName, 'VOTE_WARNING', `${userName}님에게 투표 참여 경고가 발송되었습니다.`);
    
    // 토스트 알림
    toast({
      title: '투표 참여 경고',
      description: `${userName}님에게 투표 참여 경고가 발송되었습니다.`,
      status: 'warning',
      duration: 5000,
      isClosable: true,
    });
  };

  // 회원 정지
  const suspendMember = (userId: number, userName: string) => {
    const updatedUserList = userList.map(user => 
      user.id === userId ? { ...user, status: 'SUSPENDED' as const } : user
    );
    
    setUserList(updatedUserList);
    localStorage.setItem('userList', JSON.stringify(updatedUserList));
    
    // 활동 로그에 정지 기록
    addActivityLog(userId, userName, 'MEMBER_SUSPENDED', `${userName}님이 투표 참여 부족으로 정지되었습니다.`);
    
    // 토스트 알림
    toast({
      title: '회원 정지',
      description: `${userName}님이 투표 참여 부족으로 정지되었습니다.`,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  // 활동 로그 추가
  const addActivityLog = (userId: number, userName: string, action: ActivityLog['action'], description: string, metadata?: any) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      userId,
      userName,
      action,
      description,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    setActivityLogs(prev => [newLog, ...prev.slice(0, 99)]); // 최근 100개만 유지
    localStorage.setItem('activityLogs', JSON.stringify([newLog, ...activityLogs.slice(0, 99)]));
  };

  // 투표 기록 추가
  const addVoteRecord = (userId: number, userName: string, voteDate: string, participated: boolean) => {
    const year = new Date(voteDate).getFullYear();
    const newRecord: VoteRecord = {
      userId,
      userName,
      voteDate,
      participated,
      year
    };
    
    // 기존 기록이 있으면 업데이트, 없으면 추가
    setVoteRecords(prev => {
      const filtered = prev.filter(r => !(r.userId === userId && r.voteDate === voteDate));
      return [newRecord, ...filtered];
    });
    
    // localStorage 업데이트
    const updatedRecords = voteRecords.filter(r => !(r.userId === userId && r.voteDate === voteDate));
    localStorage.setItem('voteRecords', JSON.stringify([newRecord, ...updatedRecords]));
    
    // 활동 로그 추가
    const action = participated ? 'VOTE_PARTICIPATE' : 'VOTE_ABSENT';
    const description = participated ? 
      `${userName}님이 ${voteDate} 투표에 참여했습니다.` : 
      `${userName}님이 ${voteDate} 투표에 불참했습니다.`;
    
    addActivityLog(userId, userName, action, description, { voteDate, participated });
  };

  // 투표 기록 가져오기 (외부에서 호출 가능)
  const getVoteRecords = () => voteRecords;
  
  // 투표 경고 가져오기 (외부에서 호출 가능)
  const getVoteWarnings = () => voteWarnings;

  // 정지 해제 요청 상태
  const [suspensionRequests, setSuspensionRequests] = useState<{
    id: string;
    userId: number;
    userName: string;
    requestDate: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  }[]>([]);

  // 정지 해제 요청 추가
  const addSuspensionRequest = (userId: number, userName: string, reason: string) => {
    const newRequest = {
      id: Date.now().toString(),
      userId,
      userName,
      requestDate: new Date().toISOString(),
      reason,
      status: 'PENDING' as const
    };
    
    setSuspensionRequests(prev => [...prev, newRequest]);
    localStorage.setItem('suspensionRequests', JSON.stringify([...suspensionRequests, newRequest]));
    
    // 활동 로그에 요청 기록
    addActivityLog(userId, userName, 'MEMBER_STATUS_CHANGE', `${userName}님이 정지 해제를 요청했습니다.`);
    
    toast({
      title: '정지 해제 요청',
      description: `${userName}님이 정지 해제를 요청했습니다.`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  // 정지 해제 요청 승인
  const approveSuspensionRequest = (requestId: string) => {
    const request = suspensionRequests.find(r => r.id === requestId);
    if (!request) return;

    // 회원 상태를 ACTIVE로 변경
    const updatedUserList = userList.map(user => 
      user.id === request.userId ? { ...user, status: 'ACTIVE' as const } : user
    );
    
    setUserList(updatedUserList);
    localStorage.setItem('userList', JSON.stringify(updatedUserList));
    
    // 요청 상태를 승인으로 변경
    const updatedRequests = suspensionRequests.map(r => 
      r.id === requestId ? { ...r, status: 'APPROVED' as const } : r
    );
    setSuspensionRequests(updatedRequests);
    localStorage.setItem('suspensionRequests', JSON.stringify(updatedRequests));
    
    // 활동 로그에 승인 기록
    addActivityLog(request.userId, request.userName, 'MEMBER_STATUS_CHANGE', `${request.userName}님의 정지가 해제되었습니다.`);
    
    toast({
      title: '정지 해제 승인',
      description: `${request.userName}님의 정지가 해제되었습니다.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  // 정지 해제 요청 거절
  const rejectSuspensionRequest = (requestId: string) => {
    const request = suspensionRequests.find(r => r.id === requestId);
    if (!request) return;

    // 요청 상태를 거절로 변경
    const updatedRequests = suspensionRequests.map(r => 
      r.id === requestId ? { ...r, status: 'REJECTED' as const } : r
    );
    setSuspensionRequests(updatedRequests);
    localStorage.setItem('suspensionRequests', JSON.stringify(updatedRequests));
    
    // 활동 로그에 거절 기록
    addActivityLog(request.userId, request.userName, 'MEMBER_STATUS_CHANGE', `${request.userName}님의 정지 해제 요청이 거절되었습니다.`);
    
    toast({
      title: '정지 해제 거절',
      description: `${request.userName}님의 정지 해제 요청이 거절되었습니다.`,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  // 전역 함수 등록 (SchedulePageV2에서 사용)
    useEffect(() => {
    (window as any).addVoteRecord = addVoteRecord;
    (window as any).getVoteRecords = getVoteRecords;
    (window as any).getVoteWarnings = getVoteWarnings;
    (window as any).addSuspensionRequest = addSuspensionRequest;
    (window as any).sendNotification = sendNotification;

    return () => {
      delete (window as any).addVoteRecord;
      delete (window as any).getVoteRecords;
      delete (window as any).getVoteWarnings;
      delete (window as any).addSuspensionRequest;
      delete (window as any).sendNotification;
    };
  }, []);

  // 불필요한 코드 제거

  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [selectedVoteSession, setSelectedVoteSession] = useState<any>(null);
  const [isAdminGuideModalOpen, setIsAdminGuideModalOpen] = useState(false);

  const renderStatRows = useCallback((rows: Array<{ label: React.ReactNode; value: React.ReactNode; valueColor?: string }>) => (
    <VStack spacing={-3} align="stretch">
      {rows.map((row, idx) => (
        <Box key={idx} px={4} mb={idx < rows.length - 1 ? -1.5 : 0} minH="24px">
          <Flex align="center" gap={2}>
            <Text flex="1" color="gray.600" fontSize="sm" lineHeight={1} noOfLines={1}>
              {row.label}
            </Text>
            <Text
              w="48px"
              textAlign="right"
              fontSize="sm"
              fontWeight="bold"
              lineHeight={1}
              color={row.valueColor || 'gray.800'}
              whiteSpace="nowrap"
            >
              {row.value}
            </Text>
          </Flex>
        </Box>
      ))}
    </VStack>
  ), []);

  const commonMenuButtonProps = (menu: string) => ({
    w: '100%',
    h: '44px',
    px: 3,
    iconSpacing: 3,
    justifyContent: 'flex-start' as const,
    variant: 'ghost' as const,
    fontSize: 'sm',
    fontWeight: selectedMenu === menu ? '800' : '600',
    bg: selectedMenu === menu ? 'brand.50' : 'transparent',
    color: selectedMenu === menu ? 'brand.700' : 'gray.600',
    borderRadius: 'md',
    boxShadow: selectedMenu === menu ? 'inset 3px 0 0 var(--chakra-colors-brand-500)' : 'none',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    _hover: {
      bg: selectedMenu === menu ? 'brand.50' : 'gray.50',
      color: selectedMenu === menu ? 'brand.700' : 'matchday.navy'
    }
  });

  // 로그인 활동은 백엔드에서 항상 0으로 고정되어(loginCount 미추적) 표시하지 않는다 — Analytics는 투표/경기 참여만 다룬다.
  const activityMetrics = useMemo(() => {
    const members = activityAnalysisData?.memberStats ?? [];

    const maxVote = Math.max(0, ...members.map(m => m.voteParticipationCount));
    const maxGame = Math.max(0, ...members.map(m => m.gameParticipationCount));

    const sortedByTotal = [...members].sort((a, b) => {
      const aTotal = a.voteParticipationCount + a.gameParticipationCount;
      const bTotal = b.voteParticipationCount + b.gameParticipationCount;
      return bTotal - aTotal;
    });

    const topVote = [...members].sort((a, b) => b.voteParticipationCount - a.voteParticipationCount).slice(0, 3);
    const topGame = [...members].sort((a, b) => b.gameParticipationCount - a.gameParticipationCount).slice(0, 3);

    return {
      members: sortedByTotal,
      maxVote,
      maxGame,
      topVote,
      topGame
    };
  }, [activityAnalysisData]);

  // 알림 발송 예상 수신 인원 (sendGameNotification / sendVoteReminder와 동일한 대상 규칙을 read-only로 재사용)
  const gameNotificationTarget = notificationSettings.gameReminder.targets[0] || 'all';
  const expectedGameRecipientCount = useMemo(() => {
    // sendGameNotification은 대상(target)과 무관하게 미래 경기가 없으면 즉시 발송을 중단한다 — 동일 gate를 preview에도 적용
    const now = new Date();
    const futureGames = (games || []).filter((g: any) => new Date(g.date).getTime() >= now.getTime());
    if (futureGames.length === 0) return 0;

    if (gameNotificationTarget === 'admin') {
      return userList.filter((u: any) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
    }
    if (gameNotificationTarget === 'participating') {
      const ids = new Set<number>();
      futureGames.forEach((g: any) => {
        if (g.attendances && Array.isArray(g.attendances)) {
          g.attendances.forEach((a: any) => { if (a?.userId) ids.add(a.userId); });
        }
        if ((!g.attendances || g.attendances.length === 0) && userList.length > 0) {
          const { names } = getGameParticipantSummary(g);
          names.forEach((name) => {
            const hit = userList.find((u: any) => u.name === name);
            if (hit?.id) ids.add(hit.id);
          });
        }
      });
      return ids.size;
    }
    return userList.length;
  }, [gameNotificationTarget, games, userList]);

  const voteNotificationTarget = notificationSettings.voteReminder.targets[0] || 'nonVoters';
  const expectedVoteRecipientCount = useMemo(() => {
    if (voteNotificationTarget === 'all') return userList.length;
    return getNonVoters().length;
  }, [voteNotificationTarget, userList, unifiedVoteData]);

  const gameTargetLabel = gameNotificationTarget === 'participating' ? '참가 예정 회원' : gameNotificationTarget === 'admin' ? '관리자' : '전체 회원';
  const voteTargetLabel = voteNotificationTarget === 'all' ? '전체 회원' : '투표 미참여 회원';

  // 발송 확인 모달 상태 (game/vote 공용)
  const [sendConfirmTarget, setSendConfirmTarget] = useState<null | 'game' | 'vote'>(null);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const handleConfirmSend = async () => {
    if (!sendConfirmTarget || isSendingNotification) return;
    setIsSendingNotification(true);
    try {
      if (sendConfirmTarget === 'game') {
        await sendGameNotification();
      } else {
        await sendVoteReminder();
      }
    } finally {
      setIsSendingNotification(false);
      setSendConfirmTarget(null);
    }
  };

  const renderSidebarContent = (onNavigate?: () => void) => {
    const handleClick = (menu: string) => {
      handleMenuSelect(menu);
      onNavigate?.();
    };

    return (
      <VStack spacing={0} align="stretch">
        {!onNavigate && (
          <Box px={6} pt={6} pb={5} borderBottom="1px" borderColor="gray.200" sx={{ '@media (max-height: 700px)': { paddingTop: '16px', paddingBottom: '12px' } }}>
            <Flex align="center" gap={2}>
              <Box w="16px" h="3px" bg="brand.500" borderRadius="full" />
              <Text textStyle="scoreLabel" color="brand.500">ADMIN CONSOLE</Text>
            </Flex>
            <Text fontSize="xl" fontWeight="800" color="matchday.navy" letterSpacing="-0.01em" mt={1.5}>
              관리자 페이지
            </Text>
          </Box>
        )}
        <VStack spacing={1} p={3} flex={1} align="stretch">
          <Button {...commonMenuButtonProps('dashboard')} onClick={() => handleClick('dashboard')} leftIcon={<Icon as={MdOutlineDashboard} boxSize={5} />}>
            대시보드
          </Button>
          {hasPermission('member_management') && (
            <Button {...commonMenuButtonProps('users')} onClick={() => handleClick('users')} leftIcon={<Icon as={MdOutlineGroups} boxSize={5} />}>
              회원 관리
            </Button>
          )}
          <Button {...commonMenuButtonProps('vote-results')} onClick={() => handleClick('vote-results')} leftIcon={<Icon as={MdOutlineHowToVote} boxSize={5} />}>
            투표 결과
          </Button>
          <Button {...commonMenuButtonProps('vote-sessions')} onClick={() => handleClick('vote-sessions')} leftIcon={<Icon as={MdOutlineEventNote} boxSize={5} />}>
            투표 세션 관리
          </Button>
          {hasPermission('game_management') && (
            <Button {...commonMenuButtonProps('games')} onClick={() => handleClick('games')} leftIcon={<Icon as={MdOutlineSportsSoccer} boxSize={5} />}>
              경기 관리
            </Button>
          )}
          {/* 메뉴 노출 조건은 아래 selectedMenu content guard와 동일하게 유지한다 */}
          {hasPermission('all') && (
            <>
              <Button {...commonMenuButtonProps('notifications')} onClick={() => handleClick('notifications')} leftIcon={<Icon as={MdOutlineNotifications} boxSize={5} />}>
                알림 관리
              </Button>
              <Button {...commonMenuButtonProps('analytics')} onClick={() => handleClick('analytics')} leftIcon={<Icon as={MdOutlineInsights} boxSize={5} />}>
                활동 분석
              </Button>
              <Button {...commonMenuButtonProps('football')} onClick={() => handleClick('football')} leftIcon={<Icon as={MdOutlineStadium} boxSize={5} />}>
                풋살 현황판
              </Button>
            </>
          )}
        </VStack>
        <Box px={3} py={3} borderTop="1px" borderColor="gray.200">
          <Box
            as="button"
            type="button"
            w="100%"
            textAlign="left"
            bg="white"
            px={3}
            py={2.5}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            cursor="pointer"
            onClick={() => {
              onNavigate?.();
              adminManual.onOpen();
            }}
            _hover={{ borderColor: 'brand.300', bg: 'brand.50' }}
            transition="background-color 0.15s ease, border-color 0.15s ease"
          >
            <HStack spacing={3} align="center">
              <Flex align="center" justify="center" w={8} h={8} borderRadius="md" bg="matchday.navy" flexShrink={0}>
                <Icon as={MdOutlineMenuBook} boxSize={4} color="white" />
              </Flex>
              <VStack align="start" spacing={0} flex={1} minW={0}>
                <Text fontSize="xs" fontWeight="800" color="matchday.navy" lineHeight="1.3">
                  관리자 가이드
                </Text>
                <Text fontSize="11px" color="gray.500" lineHeight="1.3" noOfLines={1}>
                  {getMenuDescription(selectedMenu)}
                </Text>
              </VStack>
              <Text fontSize="sm" color="gray.400" aria-hidden="true">›</Text>
            </HStack>
          </Box>
        </Box>
      </VStack>
    );
  };

  return (
    <Box minH="100vh" bg="gray.50" pt={`${ADMIN_SHELL.HEADER_H + (isMobile ? ADMIN_SHELL.MOBILE_BAR_H : 0)}px`}>
      {isMobile && (
        <>
          {/* 모바일 title bar: 앱 래퍼의 overflow-x: hidden 때문에 sticky가 동작하지 않아 fixed + 상단 여백으로 고정한다. */}
          <Flex
            className="fccg-matchday fccg-admin"
            position="fixed"
            top={`${ADMIN_SHELL.HEADER_H}px`}
            left={0}
            right={0}
            zIndex={20}
            h={`${ADMIN_SHELL.MOBILE_BAR_H}px`}
            bg="white"
            pl={{ base: 4, md: 6 }}
            pr={{ base: 4, md: 6 }}
            borderBottom="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            align="center"
            justify="space-between"
            gap={3}
          >
            <Box minW={0}>
              <Text textStyle="scoreLabel" fontSize="10px" color="brand.500">ADMIN CONSOLE</Text>
              <Text fontSize="md" fontWeight="800" color="matchday.navy" lineHeight="1.2" noOfLines={1}>
                관리자 페이지
              </Text>
            </Box>
            {/* 전역 헤더의 햄버거(사이트 메뉴)와 구분되도록 panel 아이콘 사용. 390: 아이콘만 / md 이상: 라벨 포함 */}
            <Button
              aria-label="관리자 메뉴 열기"
              leftIcon={<Icon as={LuPanelLeft} boxSize={5} />}
              iconSpacing={{ base: 0, md: 2 }}
              variant="outline"
              size="md"
              minW="40px"
              px={{ base: 0, md: 3 }}
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              color="matchday.navy"
              fontSize="sm"
              fontWeight="700"
              flexShrink={0}
              _hover={{ bg: 'brand.50', borderColor: 'brand.300', color: 'brand.700' }}
              onClick={mobileSidebar.onOpen}
            >
              <Box as="span" display={{ base: 'none', md: 'inline' }}>관리자 메뉴</Box>
            </Button>
          </Flex>
          <Drawer placement="left" onClose={mobileSidebar.onClose} isOpen={mobileSidebar.isOpen} size="xs">
            <DrawerOverlay />
            <DrawerContent bg="white" className="fccg-matchday fccg-admin">
              <DrawerCloseButton />
              <DrawerHeader borderBottom="1px solid" borderColor="gray.200">
                <Flex align="center" gap={2}>
                  <Box w="16px" h="3px" bg="brand.500" borderRadius="full" />
                  <Text textStyle="scoreLabel" color="brand.500">ADMIN CONSOLE</Text>
                </Flex>
                <Text fontSize="lg" fontWeight="800" color="matchday.navy" mt={1}>관리자 메뉴</Text>
              </DrawerHeader>
              <DrawerBody p={0}>{renderSidebarContent(mobileSidebar.onClose)}</DrawerBody>
            </DrawerContent>
          </Drawer>
        </>
      )}
      <Flex minH={`calc(100vh - ${ADMIN_SHELL.HEADER_H}px)`}>
        {!isMobile && (
          <Flex
            className="fccg-matchday fccg-admin"
            direction="column"
            w={`${ADMIN_SHELL.SIDEBAR_W}px`}
            bg="white"
            borderRight="1px"
            borderColor="gray.200"
            position="fixed"
            top={`${ADMIN_SHELL.HEADER_H}px`}
            left={0}
            h={`calc(100vh - ${ADMIN_SHELL.HEADER_H}px)`}
            zIndex={10}
          >
            <Box flex={1} minH={0} overflowY="auto">
              {renderSidebarContent()}
            </Box>
          </Flex>
        )}

        {/* 메인 콘텐츠 — 모든 관리자 화면 공통 여백·최대 폭 */}
        <Box
          flex={1}
          ml={isMobile ? 0 : `${ADMIN_SHELL.SIDEBAR_W}px`}
          px={{ base: 4, md: 6, lg: 8 }}
          pt={{ base: 5, md: 6, lg: 8 }}
          pb={{ base: 10, lg: 12 }}
          w={isMobile ? '100%' : `calc(100vw - ${ADMIN_SHELL.SIDEBAR_W}px)`}
          minW="0"
          maxW={isMobile ? '100%' : `calc(100vw - ${ADMIN_SHELL.SIDEBAR_W}px)`}
          sx={{ '& > *': { maxW: '1280px', mx: 'auto' } }}
        >
          {loading ? (
            <VStack spacing={4} align="stretch" w="100%">
              {/* 대시보드 스켈레톤 */}
              <Box>
                <Skeleton height="32px" width="220px" mb={4} borderRadius="md" />
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} borderRadius="lg" border="1px solid" borderColor="gray.200" boxShadow="sm">
                      <CardBody>
                        <Skeleton height="16px" width="60%" mb={3} borderRadius="md" />
                        <Skeleton height="28px" mb={3} borderRadius="md" />
                        <Skeleton height="12px" width="40%" borderRadius="md" />
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>

              {/* 메뉴별 스켈레톤 */}
              {selectedMenu === 'games' && (
                <VStack spacing={3} align="stretch">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <GameCardSkeleton key={i} />
                  ))}
                </VStack>
              )}
            </VStack>
          ) : (
            <>
              {/* 대시보드: 팀 운영 현황 콘솔 */}
              {selectedMenu === 'dashboard' && (() => {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const activeMembers = userList.filter(u => u.status === 'ACTIVE');
                const recentSignups = userList.filter(u => {
                  if (!u.createdAt) return false;
                  const created = new Date(u.createdAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return created >= weekAgo;
                });
                const upcomingGames = games
                  .filter(g => {
                    const gd = new Date(g.date);
                    return new Date(gd.getFullYear(), gd.getMonth(), gd.getDate()) >= today;
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const nextGame = upcomingGames[0] || null;
                const nextGameDDay = nextGame
                  ? Math.ceil((new Date(nextGame.date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
                  : null;
                const pendingSuspensions = suspensionRequests.filter(r => r.status === 'PENDING');
                const resolvedSuspensions = suspensionRequests.filter(r => r.status !== 'PENDING');
                const actionRequiredCount = pendingSuspensions.length + voteWarnings.length;
                const voteDays: { key: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'; label: string }[] = [
                  { key: 'MON', label: '월' },
                  { key: 'TUE', label: '화' },
                  { key: 'WED', label: '수' },
                  { key: 'THU', label: '목' },
                  { key: 'FRI', label: '금' }
                ];
                const voteResults = unifiedVoteData?.lastWeekResults?.results || null;
                const isVoteActive = !!unifiedVoteData?.activeSession?.isActive;

                // Match Day 표시용 파생 값 (표시 전용 — 기존 데이터만 사용)
                const parseList = (v: unknown): unknown[] => {
                  if (Array.isArray(v)) return v;
                  if (typeof v === 'string') {
                    try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
                  }
                  return [];
                };
                // GameManagement의 참가 인원 계산 규칙과 동일: 선택 회원 + (용병·중복 제외) 수기 이름 + 용병 수
                const nextGameRaw = nextGame as (Game & { eventType?: string; selectedMembers?: unknown; mercenaryCount?: number }) | null;
                const nextGameParticipants = (() => {
                  if (!nextGameRaw) return 0;
                  const selected = new Set(parseList(nextGameRaw.selectedMembers).filter((n): n is string => typeof n === 'string' && !!n.trim()));
                  const others = parseList(nextGameRaw.memberNames).filter((n): n is string => {
                    if (typeof n !== 'string') return false;
                    const t = n.trim();
                    return !!t && !t.startsWith('용병') && !selected.has(t);
                  }).length;
                  return (Number(nextGameRaw.mercenaryCount) || 0) + selected.size + others;
                })();
                const nextGameDate = nextGame ? new Date(nextGame.date) : null;
                const isoWeek = (() => {
                  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
                  const day = d.getUTCDay() || 7;
                  d.setUTCDate(d.getUTCDate() + 4 - day);
                  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
                })();
                const daysAgo = (iso: string) => {
                  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
                  return days <= 0 ? '오늘' : `${days}일 전`;
                };
                const voteCounts = voteDays.map(({ key }) => Number(voteResults?.[key]?.count ?? 0));
                const voteMax = Math.max(0, ...voteCounts);
                const ACTIVITY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
                  LOGIN: { label: '로그인', icon: LuLogIn, color: 'green.500' },
                  LOGOUT: { label: '로그아웃', icon: LuLogOut, color: 'gray.400' },
                  GAME_JOIN: { label: '경기참여', icon: MdOutlineSportsSoccer, color: 'brand.500' },
                  GAME_CANCEL: { label: '경기취소', icon: LuCircleX, color: 'red.500' },
                  VOTE_PARTICIPATE: { label: '투표참여', icon: LuVote, color: 'brand.500' },
                  VOTE_ABSENT: { label: '투표불참', icon: LuCircleX, color: 'gray.400' },
                  ANNOUNCEMENT_CREATE: { label: '공지작성', icon: LuMegaphone, color: 'brand.500' },
                  ANNOUNCEMENT_EDIT: { label: '공지수정', icon: LuPencil, color: 'brand.500' },
                  MEMBER_STATUS_CHANGE: { label: '상태변경', icon: LuUserCog, color: 'gray.500' },
                  VOTE_WARNING: { label: '투표경고', icon: LuTriangleAlert, color: 'orange.500' },
                  MEMBER_SUSPENDED: { label: '회원정지', icon: LuBan, color: 'red.500' },
                };

                return (
                <VStack className="fccg-matchday" spacing={5} align="stretch" w="100%">
                  {/* HERO: Match Day Command Center + 스코어보드 */}
                  <Box position="relative" overflow="hidden" bg="matchday.navy" borderRadius="xl" color="white">
                    <PitchLines />
                    <Box position="relative" overflow="hidden">
                      {/* 유니폼 사선 띠 + Volt 줄: 상단 영역 안에만 (스코어보드를 가로지르지 않음) */}
                      <Box
                        position="absolute"
                        top="-60%"
                        right={{ base: '-34%', md: '-4%' }}
                        w={{ base: '72%', md: '40%' }}
                        h="220%"
                        transform="rotate(18deg)"
                        bgGradient="linear(to-r, rgba(0,78,168,0), rgba(0,78,168,.5) 30%, rgba(0,78,168,.8) 60%, rgba(0,78,168,0))"
                        pointerEvents="none"
                      />
                      <Box position="absolute" top={{ base: '-30%', md: '-60%' }} right={{ base: '6%', md: '33%' }} w={{ base: '4px', md: '6px' }} h={{ base: '95%', md: '220%' }} transform="rotate(18deg)" bg="matchday.volt" opacity={0.85} pointerEvents="none" />

                      <Flex position="relative" direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={{ base: 5, md: 8 }} px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={{ base: 5, md: 6 }} sx={{ '@media (min-width: 48em) and (max-height: 820px)': { paddingTop: '16px', paddingBottom: '16px' } }}>
                        <Flex align="center" gap={{ base: 3.5, md: 5 }}>
                          <Box display={{ base: 'block', md: 'none' }}><CggShieldTemp size={48} /></Box>
                          <Box display={{ base: 'none', md: 'block' }}><CggShieldTemp size={68} /></Box>
                          <Box>
                            <Text textStyle="scoreLabel" color="whiteAlpha.700">FC CGG ADMIN</Text>
                            <Text fontFamily="display" fontWeight="700" fontSize={{ base: '27px', md: '38px', xl: '44px' }} lineHeight={{ base: '1.02', md: '0.95' }} letterSpacing="-0.005em" mt={{ base: 1, md: 2 }} textTransform="uppercase" sx={{ '@media (min-width: 48em) and (max-height: 820px)': { fontSize: '32px' } }}>
                              Match Day<br />Command Center
                            </Text>
                          </Box>
                        </Flex>

                        {/* 시즌·날짜·업데이트: 모바일은 구분선 아래 좌우 배치, 데스크톱은 우측 정보 패널 */}
                        <Flex
                          direction={{ base: 'row', md: 'column' }}
                          justify="space-between"
                          align="flex-end"
                          gap={{ base: 3, md: 1.5 }}
                          pt={{ base: 4, md: 1 }}
                          pb={{ md: 1 }}
                          pl={{ md: 6 }}
                          borderTop={{ base: '1px solid', md: 'none' }}
                          borderLeft={{ base: 'none', md: '1px solid' }}
                          borderColor="whiteAlpha.300"
                          textAlign={{ base: 'left', md: 'right' }}
                          minW={{ md: '220px' }}
                        >
                          <Box>
                            <Text textStyle="scoreLabel" color="whiteAlpha.600">SEASON {now.getFullYear()} · WEEK {isoWeek}</Text>
                            <Text fontFamily="display" fontWeight="700" fontSize={{ base: '22px', md: '30px' }} lineHeight="1.1" mt={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                            </Text>
                          </Box>
                          <Text fontSize="11px" color="whiteAlpha.600" textAlign="right" whiteSpace="nowrap">
                            마지막 업데이트 {lastUpdateTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Flex>
                      </Flex>
                    </Box>

                    {/* 스코어보드 스트립 */}
                    <SimpleGrid
                      position="relative"
                      columns={{ base: 2, lg: 4 }}
                      bg="rgba(15,39,71,.92)"
                      borderTop="1px solid"
                      borderColor="whiteAlpha.200"
                      sx={{
                        '& > *': { borderColor: 'whiteAlpha.200' },
                        '& > *:nth-of-type(odd)': { borderRightWidth: '1px' },
                        '& > *:nth-of-type(-n+2)': { borderBottomWidth: { base: '1px', lg: 0 } },
                        '@media (min-width: 62em)': { '& > *:not(:last-of-type)': { borderRightWidth: '1px' } },
                      }}
                    >
                      <StatBlock label="TOTAL" caption="전체 회원" value={userList.length} unit="명" />
                      <StatBlock label="ACTIVE" caption="활성 회원" value={activeMembers.length} unit="명" />
                      <StatBlock label="MATCH" caption="예정 경기" value={upcomingGames.length} unit="경기" />
                      <StatBlock label="ACTION" caption="처리 필요" value={actionRequiredCount} unit="건" highlight={actionRequiredCount > 0} />
                    </SimpleGrid>
                  </Box>

                  {/* 운영 상태 strip — 한 줄 요약 (회원 상태 · 주의 회원 · 메일) */}
                  <Flex w="100%" wrap="wrap" align="center" gap={{ base: 2, md: 4 }} px={{ base: 4, md: 5 }} py={2.5} bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" fontSize="sm">
                    <Text textStyle="scoreLabel" fontSize="10px" color="gray.500">SYSTEM</Text>
                    <Text color="gray.700">회원 <Text as="b" color="matchday.navy">정상 {userList.filter(u => u.status === 'ACTIVE').length}</Text> · 비활성 {userList.filter(u => u.status === 'INACTIVE').length} · 정지 {userList.filter(u => u.status === 'SUSPENDED').length}</Text>
                    <Text color="gray.300">|</Text>
                    <Button variant="link" size="sm" fontWeight="600" color={opsInsights?.warningCount ? 'orange.600' : 'gray.600'} onClick={() => setSelectedMenu('users')}>
                      주의 {opsInsights ? opsInsights.warningCount : '–'}명{opsInsights?.preDeactivationCount ? ` (비활성 예정 ${opsInsights.preDeactivationCount})` : ''}
                    </Button>
                    <Text color="gray.300">|</Text>
                    <HStack spacing={1.5}>
                      <Box w="7px" h="7px" borderRadius="full" bg={!mailHealth ? 'gray.300' : mailHealth.ok ? 'green.500' : 'red.500'} />
                      <Text color="gray.700">메일 {!mailHealth ? '확인 중' : mailHealth.ok ? `${mailHealth.mode === 'gmail-api' ? 'Gmail API' : mailHealth.mode === 'smtp-fallback' ? 'SMTP(대체)' : mailHealth.mode} 정상` : '오류 — 알림 관리에서 확인'}</Text>
                    </HStack>
                  </Flex>

                  {/* NEXT MATCH + VOTE STATUS */}
                  <SimpleGrid columns={{ base: 1, xl: 5 }} spacing={4} w="100%">
                    {/* Match Day Card */}
                    <Box
                      gridColumn={{ xl: 'span 3' }}
                      position="relative"
                      overflow="hidden"
                      borderRadius="xl"
                      bgGradient={nextGameDDay === 0 ? GRADIENTS.NEXT_MATCH_MATCHDAY : GRADIENTS.NEXT_MATCH_DEFAULT}
                      color="white"
                      p={{ base: 5, md: 6 }}
                      boxShadow={nextGameDDay === 0 ? '0 0 0 2px #D7FF3A' : 'none'}
                    >
                      <PitchLines opacity={0.08} />
                      <Flex position="relative" justify="space-between" align="center" mb={5}>
                        <HStack spacing={2}>
                          <Icon as={MdOutlineSportsSoccer} boxSize={4} color="whiteAlpha.800" />
                          <Text textStyle="scoreLabel" color="whiteAlpha.800">{nextGameDDay === 0 ? 'MATCH DAY' : 'NEXT MATCH'}</Text>
                        </HStack>
                        {nextGameDDay !== null && (
                          nextGameDDay === 0 ? (
                            <HStack spacing={1.5} bg="matchday.volt" px={2.5} py={1} borderRadius="sm">
                              <LiveDot color="matchday.navy" />
                              <Text textStyle="scoreLabel" color="matchday.navy">TODAY</Text>
                            </HStack>
                          ) : (
                            <Box border="1px solid" borderColor="whiteAlpha.500" px={2.5} py={1} borderRadius="sm">
                              <Text textStyle="scoreLabel" color="white">D-{nextGameDDay}</Text>
                            </Box>
                          )
                        )}
                      </Flex>

                      {nextGame && nextGameDate ? (
                        <Flex position="relative" direction={{ base: 'column', sm: 'row' }} gap={{ base: 4, md: 6 }} align={{ base: 'stretch', sm: 'center' }} sx={reveal(80)}>
                          <DateBlock date={nextGameDate} alignSelf={{ base: 'flex-start', sm: 'center' }} />
                          <Box flex={1} minW={0}>
                            <Text textStyle="scoreLabel" color="whiteAlpha.700">KICK OFF</Text>
                            <Text textStyle="statNumber" fontSize={{ base: '52px', md: '68px' }} mt={1}>
                              {nextGame.time && nextGame.time !== '미정' ? nextGame.time : 'TBD'}
                            </Text>
                            <HStack spacing={2} mt={3} flexWrap="wrap">
                              <Badge bg="whiteAlpha.200" color="white" px={2} py={0.5} borderRadius="sm" fontSize="xs">
                                {normalizeEventType(nextGameRaw?.eventType)}
                              </Badge>
                              {nextGame.gameType && (
                                <Badge bg="whiteAlpha.200" color="white" px={2} py={0.5} borderRadius="sm" fontSize="xs">{nextGame.gameType}</Badge>
                              )}
                              <Badge bg={nextGame.confirmed ? 'white' : 'transparent'} color={nextGame.confirmed ? 'brand.600' : 'whiteAlpha.800'} border="1px solid" borderColor={nextGame.confirmed ? 'white' : 'whiteAlpha.500'} px={2} py={0.5} borderRadius="sm" fontSize="xs">
                                {nextGame.confirmed ? '확정' : '미확정'}
                              </Badge>
                            </HStack>
                            <VStack align="stretch" spacing={1.5} mt={4} fontSize="sm" color="whiteAlpha.900">
                              <HStack spacing={2}>
                                <Icon as={LuMapPin} boxSize={4} color="whiteAlpha.700" flexShrink={0} />
                                <Text noOfLines={1}>{nextGame.location || '장소 미정'}</Text>
                              </HStack>
                              <HStack spacing={2}>
                                <Icon as={LuUsers} boxSize={4} color="whiteAlpha.700" flexShrink={0} />
                                <Text><Text as="span" fontFamily="display" fontWeight="700" fontSize="lg" sx={{ fontVariantNumeric: 'tabular-nums' }}>{nextGameParticipants}</Text>명 참가</Text>
                              </HStack>
                            </VStack>
                          </Box>
                          <VStack align="stretch" spacing={2} minW={{ sm: '140px' }}>
                            <Button size="sm" bg="white" color="brand.600" _hover={{ bg: 'whiteAlpha.900' }} rightIcon={<Icon as={LuArrowRight} />} onClick={() => handleMenuSelect('games')}>
                              경기 관리
                            </Button>
                            <Button size="sm" variant="outline" bg="transparent" color="white" borderColor="whiteAlpha.600" _hover={{ bg: 'whiteAlpha.200' }} leftIcon={<Icon as={MdOutlineStadium} />} onClick={() => handleMenuSelect('football')}>
                              전술판
                            </Button>
                          </VStack>
                        </Flex>
                      ) : (
                        <Flex position="relative" direction={{ base: 'column', sm: 'row' }} align={{ base: 'flex-start', sm: 'center' }} justify="space-between" gap={4} py={{ base: 2, md: 6 }}>
                          <Box>
                            <Text fontFamily="display" fontWeight="700" fontSize={{ base: '30px', md: '40px' }} lineHeight="1" textTransform="uppercase">No match scheduled</Text>
                            <Text fontSize="sm" color="whiteAlpha.800" mt={2}>다음 경기를 등록하면 이곳에 Match Day 카드가 표시돼요.</Text>
                          </Box>
                          <Button size="md" bg="matchday.volt" color="matchday.navy" _hover={{ opacity: 0.9 }} leftIcon={<Icon as={LuCalendarPlus} />} onClick={() => handleMenuSelect('games')}>
                            경기 등록하기
                          </Button>
                        </Flex>
                      )}
                    </Box>

                    {/* Vote Status: 요일별 스탯 트랙 */}
                    <Box
                      gridColumn={{ xl: 'span 2' }}
                      bg="white"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="gray.200"
                      p={{ base: 5, md: 6 }}
                      cursor="pointer"
                      onClick={() => handleMenuSelect('vote-sessions')}
                      _hover={{ borderColor: 'brand.500' }}
                      transition={`border-color .2s ${EASE_EXPO_OUT}`}
                    >
                      <PanelHeader
                        label="VOTE STATUS"
                        title="요일별 투표"
                        right={isVoteActive ? (
                          <HStack spacing={1.5} bg="matchday.navy" px={2.5} py={1} borderRadius="sm">
                            <LiveDot />
                            <Text textStyle="scoreLabel" fontFamily="body" letterSpacing="0.06em" color="matchday.volt">LIVE 진행중</Text>
                          </HStack>
                        ) : (
                          <Box bg="gray.100" px={2.5} py={1} borderRadius="sm">
                            <Text textStyle="scoreLabel" fontFamily="body" letterSpacing="0.06em" color="gray.500">CLOSED 마감</Text>
                          </Box>
                        )}
                      />
                      {voteResults ? (
                        <Flex justify="space-between" align="flex-end" gap={{ base: 2, md: 3 }} h="200px">
                          {voteDays.map(({ key, label }, i) => {
                            const count = voteCounts[i];
                            const isBest = voteMax > 0 && count === voteMax;
                            return (
                              <Flex key={key} direction="column" align="center" justify="flex-end" flex={1} h="100%">
                                {isBest && (
                                  <Text textStyle="scoreLabel" fontSize="9px" letterSpacing="0.08em" bg="matchday.volt" color="matchday.navy" px={1.5} py={0.5} borderRadius="sm" mb={1.5} whiteSpace="nowrap">
                                    BEST DAY
                                  </Text>
                                )}
                                <Text textStyle="statNumber" fontSize="28px" color={isBest ? 'matchday.navy' : 'gray.700'}>{count}</Text>
                                <Box w="100%" maxW="44px" mt={1.5} h="100px" flexShrink={0} bg="gray.100" borderRadius="sm" display="flex" alignItems="flex-end" overflow="hidden">
                                  <Box
                                    w="100%"
                                    h={voteMax > 0 ? `${Math.max(4, (count / voteMax) * 100)}%` : '4%'}
                                    bg={isBest ? 'brand.500' : 'brand.200'}
                                    transition={`height .6s ${EASE_EXPO_OUT}`}
                                  />
                                </Box>
                                <Text textStyle="scoreLabel" fontFamily="body" letterSpacing="0" color={isBest ? 'brand.500' : 'gray.500'} mt={2}>{label}</Text>
                              </Flex>
                            );
                          })}
                        </Flex>
                      ) : (
                        <Flex h="200px" align="center" justify="center" direction="column" gap={2} bg="gray.50" borderRadius="md">
                          <Icon as={LuVote} boxSize={6} color="gray.300" />
                          <Text fontSize="sm" color="gray.500">투표 데이터가 없습니다.</Text>
                        </Flex>
                      )}
                    </Box>
                  </SimpleGrid>

                  {/* ACTION CENTER: 운영 작업 대기열 */}
                  <Box w="100%" bg="white" borderRadius="xl" border="1px solid" borderColor={actionRequiredCount > 0 ? 'matchday.navy' : 'gray.200'} overflow="hidden">
                    <Flex justify="space-between" align="center" px={{ base: 5, md: 6 }} py={actionRequiredCount > 0 ? 4 : 3} bg={actionRequiredCount > 0 ? 'matchday.navy' : 'white'} color={actionRequiredCount > 0 ? 'white' : 'matchday.navy'}>
                      <Box>
                        <Text fontSize="lg" fontWeight="800">지금 처리할 것</Text>
                        <Text textStyle="scoreLabel" fontSize="10px" color={actionRequiredCount > 0 ? 'whiteAlpha.600' : 'brand.500'} mt={1}>ACTION CENTER</Text>
                      </Box>
                      <HStack spacing={2} align="baseline">
                        <Text textStyle="statNumber" fontSize="44px" color={actionRequiredCount > 0 ? 'matchday.volt' : 'gray.300'}>{actionRequiredCount}</Text>
                        <Text fontSize="sm" fontWeight="semibold" color={actionRequiredCount > 0 ? 'whiteAlpha.700' : 'gray.400'}>건</Text>
                      </HStack>
                    </Flex>

                    <Box px={{ base: 5, md: 6 }} pt={actionRequiredCount > 0 ? 4 : 0} pb={actionRequiredCount > 0 ? 4 : 3}>
                      {actionRequiredCount === 0 ? (
                        <HStack spacing={3} py={0}>
                          <Icon as={LuCircleCheck} boxSize={5} color="green.500" />
                          <Text color="gray.600" fontSize="sm">모든 요청을 처리했어요 🎉</Text>
                        </HStack>
                      ) : (
                        <VStack align="stretch" spacing={2}>
                          {pendingSuspensions.map((request) => (
                            <Flex key={request.id} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} pl={4} pr={3} py={3} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="brand.500">
                              <Box flex={1} minW={0}>
                                <HStack spacing={2} align="baseline">
                                  <Text fontSize="md" fontWeight="bold" color="matchday.navy">{request.userName}</Text>
                                  <Text fontSize="xs" fontWeight="semibold" color="brand.500">정지 해제 요청</Text>
                                  <Text fontSize="xs" color="gray.400" ml="auto" flexShrink={0}>{daysAgo(request.requestDate)}</Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.600" noOfLines={2} mt={1}>{request.reason}</Text>
                              </Box>
                              <HStack spacing={2} justify="flex-end">
                                <Button size="sm" bg="matchday.navy" color="white" _hover={{ bg: 'matchday.pitch' }} leftIcon={<Icon as={LuUserCheck} />} onClick={() => approveSuspensionRequest(request.id)}>
                                  승인
                                </Button>
                                <Button size="sm" variant="outline" colorScheme="red" onClick={() => rejectSuspensionRequest(request.id)}>
                                  거절
                                </Button>
                              </HStack>
                            </Flex>
                          ))}
                          {voteWarnings.map((warning) => (
                            <Flex key={warning.userId} align="center" gap={3} pl={4} pr={3} py={3} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="orange.400">
                              <Box flex={1} minW={0}>
                                <HStack spacing={2} align="baseline">
                                  <Text fontSize="md" fontWeight="bold" color="matchday.navy">{warning.userName}</Text>
                                  <Text fontSize="xs" fontWeight="semibold" color="orange.500">투표 경고</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.400" mt={0.5}>{daysAgo(warning.lastWarningDate)}</Text>
                              </Box>
                              <HStack spacing={1} align="baseline">
                                <Text textStyle="statNumber" fontSize="28px" color="orange.500">{warning.warningCount}</Text>
                                <Text fontSize="xs" color="gray.500">회</Text>
                              </HStack>
                            </Flex>
                          ))}
                        </VStack>
                      )}

                      {resolvedSuspensions.length > 0 && (
                        <Box mt={4}>
                          <Divider mb={3} />
                          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2}>처리 완료</Text>
                          <VStack spacing={1.5} align="stretch" maxH="200px" overflowY="auto">
                            {resolvedSuspensions.map((request) => (
                              <HStack key={request.id} justify="space-between" px={3} py={2} borderRadius="md" bg="gray.50">
                                <HStack spacing={2} minW={0}>
                                  <Icon as={request.status === 'APPROVED' ? LuCircleCheck : LuCircleX} color={request.status === 'APPROVED' ? 'green.500' : 'red.500'} boxSize={4} />
                                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{request.userName}</Text>
                                  <Text fontSize="xs" color={request.status === 'APPROVED' ? 'green.600' : 'red.600'}>{request.status === 'APPROVED' ? '승인됨' : '거절됨'}</Text>
                                </HStack>
                                <Text display={{ base: 'none', md: 'block' }} fontSize="xs" color="gray.500" flexShrink={0}>{new Date(request.requestDate).toLocaleDateString('ko-KR')}</Text>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* 최근 발송 알림 상세 보기 모달 */}
                  {isNotificationModalOpen ? (
                    <Modal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} size="xl">
                      <ModalOverlay />
                      <ModalContent>
                        <ModalHeader>최근 발송 알림 상세</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                          {(() => {
                            // 표시 대상 준비: 우선 알림 상태(notifications), 없으면 최근 활동 로그에서 유사 항목 추출
                            const ACTIONS = ['ANNOUNCEMENT_CREATE', 'VOTE_WARNING', 'GAME_DAY_BEFORE', 'GAME_DAY_OF', 'VOTE_START'] as const;
                            const displayList = (notifications && notifications.length > 0)
                              ? notifications
                              : (activityLogs || [])
                                  .filter(l => (ACTIONS as readonly string[]).includes(l.action))
                                  .slice(0, 50)
                                  .map((l) => ({
                                    id: l.id,
                                    title: l.description || '알림',
                                    message: l.metadata?.message || l.description || '',
                                    recipients: [],
                                    sentAt: l.timestamp,
                                    status: 'SENT' as const,
                                    deliveryMethods: ['inapp'] as const
                                  }));

                            if (!displayList || displayList.length === 0) {
                              return <Text color="gray.600">최근 발송된 알림이 없습니다.</Text>;
                            }

                            return (
                              <VStack align="stretch" spacing={3} maxH="60vh" overflowY="auto">
                                {displayList.map((n) => (
                                <Box key={n.id} p={3} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
                                  <VStack align="stretch" spacing={2}>
                                    <HStack justify="space-between">
                                      <Badge colorScheme={n.status === 'SENT' ? 'green' : n.status === 'FAILED' ? 'red' : 'blue'}>{n.status}</Badge>
                                      <Text fontSize="xs" color="gray.500">{new Date(n.sentAt).toLocaleString('ko-KR')}</Text>
                                    </HStack>
                                    <Text fontSize="md" fontWeight="bold">{n.title}</Text>
                                    <Text fontSize="sm" whiteSpace="pre-wrap" color="gray.700">{n.message}</Text>
                                    <HStack spacing={2} flexWrap="wrap">
                                      {(n.deliveryMethods || []).map((m) => (
                                        <Badge key={m} colorScheme={m === 'email' ? 'purple' : m === 'push' ? 'orange' : 'blue'}>{m}</Badge>
                                      ))}
                                    </HStack>
                                    <Box>
                                        <Text fontSize="xs" color="gray.500">수신자(ID): {(n.recipients || []).join(', ') || '없음'}</Text>
                                    </Box>
                                  </VStack>
                                </Box>
                                ))}
                              </VStack>
                            );
                          })()}
                        </ModalBody>
                        <ModalFooter>
                          <Button onClick={() => setIsNotificationModalOpen(false)}>닫기</Button>
                        </ModalFooter>
                      </ModalContent>
                    </Modal>
                  ) : null}

                  {/* RECENT ACTIVITY: 매치 피드 타임라인 */}
                  <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4} w="100%">
                    <Box gridColumn={{ xl: 'span 2' }} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={{ base: 5, md: 6 }}>
                      <PanelHeader
                        label="MATCH FEED"
                        title="최근 활동"
                        right={
                          <HStack spacing={2}>
                            <Button size="xs" variant="outline" leftIcon={<Icon as={LuBellRing} />} onClick={() => setIsNotificationModalOpen(true)}>
                              <Box as="span" display={{ base: 'none', sm: 'inline' }}>최근 발송 알림</Box>
                              <Box as="span" display={{ base: 'inline', sm: 'none' }}>알림</Box>
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => setActivityLogs([])}>
                              로그 초기화
                            </Button>
                          </HStack>
                        }
                      />
                      {activityLogs.length === 0 ? (
                        <Flex align="center" gap={3} py={6} px={4} bg="gray.50" borderRadius="md">
                          <Icon as={LuHistory} boxSize={5} color="gray.300" />
                          <Text color="gray.500" fontSize="sm">아직 활동 내역이 없습니다.</Text>
                        </Flex>
                      ) : (
                        <Box>
                          {activityLogs.slice(0, showAllActivity ? 30 : ACTIVITY_SUMMARY_MAX).map((log, i, arr) => {
                            const meta = ACTIVITY_META[log.action] || { label: '기타', icon: LuHistory, color: 'gray.400' };
                            const summary = summarizeActivity(log.description);
                            const isMailFail = summary.title === '이메일 발송 실패';
                            const tagLabel = isMailFail ? '메일 오류' : summary.title === '이메일 발송 완료' ? '메일' : meta.label;
                            const tagColor = isMailFail ? 'red.500' : meta.color;
                            const ts = new Date(log.timestamp);
                            return (
                              <Flex key={log.id} gap={3} align="stretch">
                                <Box w="52px" flexShrink={0} textAlign="right" pt={0.5}>
                                  <Text fontFamily="display" fontWeight="700" fontSize="15px" color="matchday.navy" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                    {ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </Text>
                                  {ts.toDateString() !== now.toDateString() && (
                                    <Text fontSize="10px" color="gray.400">{ts.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</Text>
                                  )}
                                </Box>
                                <Flex direction="column" align="center" flexShrink={0}>
                                  <Flex w="26px" h="26px" borderRadius="full" bg="white" border="2px solid" borderColor={meta.color} align="center" justify="center">
                                    <Icon as={meta.icon} boxSize={3.5} color={meta.color} />
                                  </Flex>
                                  {i < arr.length - 1 && <Box w="2px" flex={1} bg="gray.100" my={1} />}
                                </Flex>
                                <Box flex={1} minW={0} pb={3} title={log.description}>
                                  <Text fontSize="sm" color="gray.800" lineHeight={1.4} noOfLines={1}>
                                    <Text as="span" fontWeight="bold" color="matchday.navy">{log.userName}</Text>
                                    <Text as="span" color="gray.400"> · </Text>
                                    {summary.title}
                                  </Text>
                                  {summary.detail && (
                                    <Text fontSize="xs" color="gray.500" lineHeight={1.4} mt={0.5} noOfLines={1}>{summary.detail}</Text>
                                  )}
                                  <Text display={{ base: 'none', md: 'block' }} textStyle="scoreLabel" fontSize="10px" fontFamily="body" letterSpacing="0.02em" color={tagColor} mt={1}>{tagLabel}</Text>
                                </Box>
                              </Flex>
                            );
                          })}
                          {activityLogs.length > ACTIVITY_SUMMARY_MAX && (
                            <Button size="xs" variant="ghost" color="brand.600" ml="64px" onClick={() => setShowAllActivity((v) => !v)}>
                              {showAllActivity ? '최근 활동만 보기' : `전체 로그 보기 (${Math.min(activityLogs.length, 30)}건)`}
                            </Button>
                          )}
                        </Box>
                      )}
                    </Box>

                    <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" p={{ base: 5, md: 6 }}>
                      <PanelHeader label="SQUAD" title="회원 세부" />
                      {renderStatRows([
                        { label: '활성 회원', value: `${activeMembers.length}명` },
                        { label: '비활성 회원', value: `${userList.filter(u => u.status === 'INACTIVE').length}명` },
                        { label: '정지된 회원', value: `${userList.filter(u => u.status === 'SUSPENDED').length}명` },
                        { label: '신규 가입 (7일)', value: `${recentSignups.length}명` }
                      ])}
                    </Box>
                  </SimpleGrid>
                </VStack>
                );
              })()}

              {/* 회원 관리 */}
              {selectedMenu === 'users' && hasPermission('member_management') && (
                <Box w="100%">
                          <MemberManagement 
          userList={userList} 
          onUserListChange={(users: ExtendedMember[]) => setUserList(users)} 
        />
                </Box>
              )}
              
              {/* 경기 관리 */}
              {selectedMenu === 'games' && hasPermission('game_management') && (
                <Box w="100%">
                          <GameManagement 
          games={games} 
          onGamesChange={setGames}
          userList={userList}
          onGameUpdate={(updatedGame) => {
            // 게임 업데이트 시 목록 갱신
            setGames(prevGames => 
              prevGames.map(game => 
                game.id === updatedGame.id ? updatedGame : game
              )
            );
          }}
          onGameDataChanged={() => {
            // SchedulePageV2에 경기 데이터 변경 알림
            // 페이지 새로고침이나 이벤트를 통해 동기화
            window.dispatchEvent(new CustomEvent('gameDataChanged'));
          }}
        />
                </Box>
              )}

              {/* 투표결과 */}
              {selectedMenu === 'vote-results' && (
                <Box w="100%">
                  <VoteResultsPage />
                </Box>
              )}

              {/* 투표 세션 관리 */}
              {selectedMenu === 'vote-sessions' && (
                <VoteSessionManagement 
                  unifiedVoteData={unifiedVoteData}
                  onRefresh={loadUnifiedVoteData}
                />
              )}
              


              {/* 알림 관리 */}
              {selectedMenu === 'notifications' && hasPermission('all') && (
                <VStack className="fccg-matchday fccg-admin" spacing={5} align="stretch" w="100%">
                  <AdminPageHeader
                    eyebrow="COMMUNICATION CENTER"
                    title="알림 관리"
                    description="경기·투표 알림 설정과 수동 발송을 관리합니다."
                    right={
                      <Button colorScheme="brand" size="sm" onClick={handleSaveNotifications} isDisabled={!isNotificationChanged}>
                        알림 설정 저장
                      </Button>
                    }
                  />

                  {/* ZONE A: 알림 설정 */}
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3} w="100%">
                    {([
                      { key: 'gameReminder', title: '경기 알림', icon: MdOutlineSportsSoccer, max: 168, targetLabel: gameTargetLabel, options: [['participating', '참가 예정 회원'], ['all', '전체 회원']] },
                      { key: 'voteReminder', title: '투표 알림', icon: MdOutlineHowToVote, max: 72, targetLabel: voteTargetLabel, options: [['all', '전체 회원'], ['nonVoters', '투표 미참여 회원']] },
                    ] as const).map(({ key, title, icon, max, targetLabel, options }) => {
                      const setting = notificationSettings[key];
                      return (
                        <AdminPanel key={key}>
                          <Flex justify="space-between" align="flex-start" gap={3}>
                            <HStack spacing={3} align="flex-start" minW={0}>
                              <Flex align="center" justify="center" w={9} h={9} borderRadius="md" bg="matchday.navy" flexShrink={0}>
                                <Icon as={icon} boxSize={4} color="white" />
                              </Flex>
                              <Box minW={0}>
                                <Text fontSize="lg" fontWeight="800" color="matchday.navy" letterSpacing="-0.01em">{title}</Text>
                                <Text textStyle="scoreLabel" fontSize="10px" color="brand.500" mt={0.5}>NOTIFY</Text>
                              </Box>
                            </HStack>
                            <StatusBadge kind="toggle" value={setting.enabled ? 'ON' : 'OFF'} />
                          </Flex>
                          <Text fontSize="sm" fontWeight="600" color={setting.enabled ? 'matchday.navy' : 'gray.400'} mt={3}>
                            {setting.enabled ? `${setting.beforeHours}시간 전 발송 · ${targetLabel}` : '자동 알림 꺼짐'}
                          </Text>
                          <Divider my={4} />

                          <FormControl display="flex" alignItems="center" justifyContent="space-between">
                            <FormLabel mb="0" fontSize="sm" color="gray.700">{title} 활성화</FormLabel>
                            <Switch
                              isChecked={setting.enabled}
                              onChange={(e) => handleNotificationChange(key, 'enabled', e.target.checked)}
                              colorScheme="brand"
                            />
                          </FormControl>

                          {setting.enabled && (
                            <Flex direction={{ base: 'column', sm: 'row' }} gap={4} align="flex-start" mt={4}>
                              <FormControl flex={1}>
                                <FormLabel fontSize="sm" color="gray.700">알림 전송 시간</FormLabel>
                                <HStack>
                                  <NumberInput
                                    value={setting.beforeHours}
                                    onChange={(_, value) => handleNotificationChange(key, 'beforeHours', value)}
                                    min={1}
                                    max={max}
                                    w="120px"
                                    size="sm"
                                  >
                                    <NumberInputField />
                                    <NumberInputStepper>
                                      <NumberIncrementStepper />
                                      <NumberDecrementStepper />
                                    </NumberInputStepper>
                                  </NumberInput>
                                  <Text fontSize="sm" color="gray.600">시간 전</Text>
                                </HStack>
                              </FormControl>

                              <FormControl flex={1} w={{ base: '100%', sm: 'auto' }}>
                                <FormLabel fontSize="sm" color="gray.700">알림 대상</FormLabel>
                                <Select
                                  value={setting.targets[0]}
                                  onChange={(e) => handleNotificationChange(key, 'targets', [e.target.value])}
                                  focusBorderColor="brand.500"
                                  size="sm"
                                >
                                  {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </Select>
                              </FormControl>
                            </Flex>
                          )}
                        </AdminPanel>
                      );
                    })}
                  </SimpleGrid>

                  {/* ZONE B: 수동 발송 — 대상 그룹 → 예상 수신자 → 프리뷰 → 발송 */}
                  <AdminPanel label="DISPATCH" title="수동 발송">
                    <VStack align="stretch" spacing={3}>
                      {([
                        { key: 'game', title: '경기 알림', icon: MdOutlineSportsSoccer, targetLabel: gameTargetLabel, count: expectedGameRecipientCount, onPreview: showGamePreview },
                        { key: 'vote', title: '투표 알림', icon: MdOutlineHowToVote, targetLabel: voteTargetLabel, count: expectedVoteRecipientCount, onPreview: showVotePreview },
                      ] as const).map(({ key, title, icon, targetLabel, count, onPreview }) => {
                        const sendDisabled = !isNotificationSystemActive || count === 0;
                        return (
                          <Flex
                            key={key}
                            direction={{ base: 'column', md: 'row' }}
                            align={{ base: 'stretch', md: 'center' }}
                            gap={{ base: 3, md: 6 }}
                            px={{ base: 4, md: 5 }}
                            py={4}
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="md"
                          >
                            <HStack spacing={3} align="center" flex={1} minW={0}>
                              <Icon as={icon} boxSize={5} color="brand.500" />
                              <Box minW={0}>
                                <Text fontSize="sm" fontWeight="800" color="matchday.navy">{title}</Text>
                                <Text fontSize="xs" color="gray.500">대상 · {targetLabel}</Text>
                              </Box>
                            </HStack>
                            <Flex align="center" justify="space-between" gap={{ base: 3, md: 6 }} wrap="wrap">
                              <Box>
                                <HStack spacing={2}>
                                  <Text fontSize="11px" fontWeight="700" color="gray.500">예상 수신</Text>
                                  {!sendDisabled && (
                                    <Box as="span" px={1.5} borderRadius="sm" bg="matchday.volt" color="matchday.navy" fontSize="9px" fontWeight="800" letterSpacing="0.08em" lineHeight="1.6">READY</Box>
                                  )}
                                </HStack>
                                <Flex align="baseline" gap={1}>
                                  <Text textStyle="statNumber" fontSize="40px" color={count > 0 ? 'matchday.navy' : 'gray.300'}>{count}</Text>
                                  <Text fontSize="sm" fontWeight="700" color="gray.500">명</Text>
                                </Flex>
                              </Box>
                              <HStack spacing={2}>
                                <Button variant="outline" colorScheme="gray" size="sm" onClick={onPreview} leftIcon={<Icon as={ViewIcon} />}>
                                  프리뷰
                                </Button>
                                <Button
                                  colorScheme="brand"
                                  size="sm"
                                  onClick={() => setSendConfirmTarget(key)}
                                  isDisabled={sendDisabled}
                                  leftIcon={<Icon as={MdOutlineSend} />}
                                >
                                  발송
                                </Button>
                              </HStack>
                            </Flex>
                          </Flex>
                        );
                      })}
                    </VStack>
                  </AdminPanel>

                  {/* 발송 확인 모달 */}
                  <Modal isOpen={sendConfirmTarget !== null} onClose={() => !isSendingNotification && setSendConfirmTarget(null)}>
                    <ModalOverlay />
                    <ModalContent>
                      <ModalHeader>
                        {sendConfirmTarget === 'game' ? '경기 알림을 발송하시겠습니까?' : '투표 알림을 발송하시겠습니까?'}
                      </ModalHeader>
                      {!isSendingNotification && <ModalCloseButton />}
                      <ModalBody>
                        <Box position="relative" overflow="hidden" bg="matchday.navy" color="white" borderRadius="lg" px={5} py={4}>
                          <PitchLines opacity={0.07} />
                          <Box position="relative">
                            <Text textStyle="scoreLabel" color="matchday.volt">
                              {sendConfirmTarget === 'game' ? 'GAME NOTICE' : 'VOTE REMINDER'}
                            </Text>
                            <Flex align="baseline" gap={1.5} mt={2}>
                              <Text textStyle="statNumber" fontSize="56px">
                                {sendConfirmTarget === 'game' ? expectedGameRecipientCount : expectedVoteRecipientCount}
                              </Text>
                              <Text fontSize="sm" fontWeight="700" color="whiteAlpha.700">명 예상 수신</Text>
                            </Flex>
                          </Box>
                        </Box>
                        <VStack align="stretch" spacing={2} mt={4}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">발송 종류</Text>
                            <Text fontSize="sm" fontWeight="bold" color="matchday.navy">{sendConfirmTarget === 'game' ? '경기 알림' : '투표 알림'}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">대상</Text>
                            <Text fontSize="sm" fontWeight="bold" color="matchday.navy">
                              {sendConfirmTarget === 'game' ? gameTargetLabel : voteTargetLabel}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500" pt={2}>
                            실제로 이메일이 발송됩니다. 발송 후에는 취소할 수 없습니다.
                          </Text>
                        </VStack>
                      </ModalBody>
                      <ModalFooter>
                        <Button variant="ghost" mr={2} onClick={() => setSendConfirmTarget(null)} isDisabled={isSendingNotification}>
                          취소
                        </Button>
                        <Button
                          colorScheme="brand"
                          onClick={handleConfirmSend}
                          isLoading={isSendingNotification}
                        >
                          발송
                        </Button>
                      </ModalFooter>
                    </ModalContent>
                  </Modal>

                  {/* ZONE C: 이번 세션 발송 내역 (브라우저 메모리 임시 기록 — 서버 감사 로그 아님) */}
                  <AdminPanel>
                    <PanelHeader label="LOG" title="이번 세션 발송 내역" right={<StatusBadge kind="delivery" value="임시 기록" />} />
                    <Text fontSize="xs" color="gray.500" mt={-2} mb={4}>
                      이 브라우저 탭에서 직접 발송한 내역만 보입니다. 새로고침하면 사라지며, 서버 발송 기록이 아닙니다.
                    </Text>
                    {notifications.length === 0 ? (
                      <Text color="gray.400" fontSize="sm">이번 세션에서 발송한 알림이 없습니다.</Text>
                    ) : (
                      <VStack spacing={0} align="stretch" maxH="280px" overflowY="auto">
                        {notifications.map((n, idx) => (
                          <Flex key={n.id} gap={3} align="stretch">
                            <Flex direction="column" align="center" pt={1.5}>
                              <Box w="8px" h="8px" borderRadius="full" bg={n.status === 'FAILED' ? 'red.500' : n.status === 'SENT' ? 'brand.500' : 'gray.300'} flexShrink={0} />
                              {idx < notifications.length - 1 && <Box w="1px" flex={1} bg="gray.200" mt={1} />}
                            </Flex>
                            <Flex flex={1} minW={0} justify="space-between" align="flex-start" gap={3} pb={4}>
                              <Box minW={0}>
                                <Text fontSize="sm" fontWeight="700" color="matchday.navy">{n.title}</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(n.sentAt).toLocaleString('ko-KR')} · 수신 대상 {n.recipients.length}명
                                </Text>
                              </Box>
                              <StatusBadge kind="delivery" value={n.status} />
                            </Flex>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </AdminPanel>

                  {/* 진단 / 보조 정보 */}
                  <VStack align="stretch" spacing={2}>
                    <MailDiagnosticsPanel />
                    <Text fontSize="xs" color="gray.400">
                      서버가 경기 알림과 투표 독려 메일을 자동으로 처리합니다. 관리자 페이지를 닫아도 발송은 계속됩니다.
                    </Text>
                  </VStack>
                </VStack>
              )}










              {/* 활동 분석 */}
              {selectedMenu === 'analytics' && hasPermission('all') && (() => {
                const analyticsHeader = (
                  <AdminPageHeader eyebrow="SPORTS ANALYTICS" title="활동 분석" description="회원 참여와 경기 활동 지표를 확인합니다." />
                );

                if (!activityAnalysisData) {
                  return (
                    <VStack className="fccg-matchday fccg-admin" spacing={5} align="stretch" w="100%">
                      {analyticsHeader}
                      <Skeleton height="141px" borderRadius="xl" />
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        <Skeleton height="200px" borderRadius="xl" />
                        <Skeleton height="200px" borderRadius="xl" />
                      </SimpleGrid>
                      <Skeleton height="240px" borderRadius="xl" />
                    </VStack>
                  );
                }

                const monthlyStats = activityAnalysisData.monthlyGameStats || [];
                const maxMonthlyGames = Math.max(1, ...monthlyStats.map(m => m.gameCount));
                const topVote = activityMetrics.topVote.filter(m => m.voteParticipationCount > 0);
                const topGame = activityMetrics.topGame.filter(m => m.gameParticipationCount > 0);
                const matchCount = activityAnalysisData.gameTypeDistribution?.match ?? 0;
                const friendlyCount = activityAnalysisData.gameTypeDistribution?.friendly ?? 0;
                const typeTotal = matchCount + friendlyCount;

                // 리더보드: 1위 행만 남색 + Volt 순위, 나머지는 흰 행
                const renderLeaderboard = (rows: typeof topVote, getCount: (m: (typeof topVote)[number]) => number, emptyText: string) => (
                  rows.length > 0 ? (
                    <VStack spacing={2} align="stretch">
                      {rows.map((member, idx) => {
                        const isFirst = idx === 0;
                        return (
                          <Flex
                            key={member.id}
                            align="center"
                            gap={4}
                            px={4}
                            py={2.5}
                            borderRadius="md"
                            border="1px solid"
                            borderColor={isFirst ? 'matchday.navy' : 'gray.200'}
                            bg={isFirst ? 'matchday.navy' : 'white'}
                          >
                            <Text textStyle="statNumber" fontSize="32px" color={isFirst ? 'matchday.volt' : 'gray.300'} w="44px">
                              {String(idx + 1).padStart(2, '0')}
                            </Text>
                            <Text flex={1} minW={0} fontSize="sm" fontWeight="800" color={isFirst ? 'white' : 'matchday.navy'} noOfLines={1}>{member.name}</Text>
                            <Flex align="baseline" gap={1}>
                              <Text textStyle="statNumber" fontSize="28px" color={isFirst ? 'white' : 'matchday.navy'}>{getCount(member)}</Text>
                              <Text fontSize="xs" fontWeight="700" color={isFirst ? 'whiteAlpha.700' : 'gray.500'}>회</Text>
                            </Flex>
                          </Flex>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.400">{emptyText}</Text>
                  )
                );

                return (
                <VStack className="fccg-matchday fccg-admin" spacing={5} align="stretch" w="100%">
                  {analyticsHeader}

                  {/* ZONE A: 운영 현황 KPI */}
                  <Box>
                    <StatStrip columns={4}>
                      <StatBlock label="GAME RATE" value={activityAnalysisData.summary?.participationRate ?? 0} unit="%" caption="이번 달 경기 참가율" />
                      <StatBlock label="VOTE RATE" value={activityAnalysisData.summary?.voteParticipationRate ?? 0} unit="%" caption="누적 투표 참여율" />
                      <StatBlock label="PLAYERS" value={activityAnalysisData.summary?.activeUsers ?? 0} unit="명" caption="참여 회원" />
                      <StatBlock label="GAMES" value={activityAnalysisData.summary?.thisMonthGames ?? 0} unit="경기" caption="이번 달 확정 경기" />
                    </StatStrip>
                    <Text fontSize="xs" color="gray.500" mt={2} px={1}>
                      경기 참가율: 이번 달 1회 이상 참가한 회원 비율 · 투표 참여율: 전체 기간 1회 이상 투표한 회원 비율(누적) · 참여 회원: 누적 투표 또는 이번 달 경기 참여 실적이 있는 회원
                    </Text>
                  </Box>

                  {/* ZONE B: 랭킹 */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} w="100%">
                    <AdminPanel label="RANKING" title="투표 활동 TOP 3">
                      <Text fontSize="xs" color="gray.500" mt={-2} mb={3}>전체 투표 세션 참여 횟수 기준 (누적)</Text>
                      {renderLeaderboard(topVote, (m) => m.voteParticipationCount, '투표 참여 데이터가 없습니다.')}
                    </AdminPanel>
                    <AdminPanel label="RANKING" title="경기 참여 TOP 3">
                      <Text fontSize="xs" color="gray.500" mt={-2} mb={3}>이번 달 확정 경기 참여 횟수 기준</Text>
                      {renderLeaderboard(topGame, (m) => m.gameParticipationCount, '경기 참여 데이터가 없습니다.')}
                    </AdminPanel>
                  </SimpleGrid>

                  {/* ZONE C: 팀 활동 추이 */}
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3} w="100%">
                    <AdminPanel label="TREND" title="월별 경기 현황">
                      <Text fontSize="xs" color="gray.500" mt={-2} mb={3}>최근 6개월 확정 경기 수</Text>
                      {monthlyStats.length > 0 ? (
                        <VStack spacing={3} align="stretch">
                          {monthlyStats.map((monthData, index) => {
                            const isCurrent = index === monthlyStats.length - 1;
                            return (
                              <Flex key={index} align="center" gap={3}>
                                <Text fontSize="xs" fontWeight="700" color={isCurrent ? 'matchday.navy' : 'gray.500'} w="36px" flexShrink={0}>{monthData.month}</Text>
                                <Box flex={1} h="10px" bg="gray.100" borderRadius="full" overflow="hidden">
                                  <Box h="100%" w={`${(monthData.gameCount / maxMonthlyGames) * 100}%`} bg={isCurrent ? 'matchday.navy' : 'brand.500'} borderRadius="full" />
                                </Box>
                                <Text fontSize="sm" fontWeight="700" color="matchday.navy" w="44px" textAlign="right" flexShrink={0}>{monthData.gameCount}경기</Text>
                              </Flex>
                            );
                          })}
                        </VStack>
                      ) : (
                        <Text color="gray.400" fontSize="sm">월별 경기 데이터가 없습니다.</Text>
                      )}
                    </AdminPanel>

                    <AdminPanel label="MIX" title="경기 유형 구성">
                      <Text fontSize="xs" color="gray.500" mt={-2} mb={3}>이번 달 확정 경기 기준</Text>
                      <SimpleGrid columns={2} spacing={3}>
                        {[
                          { label: 'MATCH', name: '매치 경기', count: matchCount, color: 'brand.500' },
                          { label: 'SELF', name: '자체 경기', count: friendlyCount, color: 'matchday.navy' },
                        ].map((row) => (
                          <Box key={row.label} border="1px solid" borderColor="gray.200" borderRadius="md" px={4} py={3}>
                            <Text textStyle="scoreLabel" color={row.color}>{row.label}</Text>
                            <Flex align="baseline" gap={1} mt={1}>
                              <Text textStyle="statNumber" fontSize="40px" color="matchday.navy">{row.count}</Text>
                              <Text fontSize="xs" fontWeight="700" color="gray.500">경기</Text>
                            </Flex>
                            <Text fontSize="xs" color="gray.500">{row.name}</Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                      {typeTotal > 0 && (
                        <Flex h="8px" mt={4} borderRadius="full" overflow="hidden" bg="gray.100">
                          <Box w={`${(matchCount / typeTotal) * 100}%`} bg="brand.500" />
                          <Box w={`${(friendlyCount / typeTotal) * 100}%`} bg="matchday.navy" />
                        </Flex>
                      )}
                    </AdminPanel>
                  </SimpleGrid>

                  {/* ZONE D: 회원별 활동 상세 */}
                  <AdminPanel label="SQUAD" title="회원별 활동 상세">
                    <Flex justify="space-between" align="center" gap={3} wrap="wrap" mt={-2} mb={4}>
                      <Text fontSize="xs" color="gray.500">투표(전체 기간) · 경기 참여(이번 달) 횟수 기준</Text>
                      <HStack spacing={3}>
                        <HStack spacing={1.5}><Box w="10px" h="4px" borderRadius="full" bg="brand.500" /><Text fontSize="xs" color="gray.500">투표</Text></HStack>
                        <HStack spacing={1.5}><Box w="10px" h="4px" borderRadius="full" bg="matchday.navy" /><Text fontSize="xs" color="gray.500">경기 참여</Text></HStack>
                      </HStack>
                    </Flex>

                    {activityMetrics.members.length > 0 ? (
                      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={2}>
                        {activityMetrics.members.map((member) => (
                          <Box key={member.id} px={4} py={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                            <HStack spacing={2} mb={2}>
                              <Text fontSize="sm" fontWeight="800" color="matchday.navy">{member.name}</Text>
                              <StatusBadge kind="role" value={member.role} />
                            </HStack>

                            <SimpleGrid columns={2} spacing={4}>
                              <Box>
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize="xs" color="gray.500">투표</Text>
                                  <Text fontSize="xs" fontWeight="700" color="matchday.navy">{member.voteParticipationCount}회</Text>
                                </HStack>
                                <Box h="4px" bg="gray.100" borderRadius="full" overflow="hidden">
                                  <Box h="100%" w={`${activityMetrics.maxVote > 0 ? (member.voteParticipationCount / activityMetrics.maxVote) * 100 : 0}%`} bg="brand.500" borderRadius="full" />
                                </Box>
                              </Box>
                              <Box>
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize="xs" color="gray.500">경기 참여</Text>
                                  <Text fontSize="xs" fontWeight="700" color="matchday.navy">{member.gameParticipationCount}회</Text>
                                </HStack>
                                <Box h="4px" bg="gray.100" borderRadius="full" overflow="hidden">
                                  <Box h="100%" w={`${activityMetrics.maxGame > 0 ? (member.gameParticipationCount / activityMetrics.maxGame) * 100 : 0}%`} bg="matchday.navy" borderRadius="full" />
                                </Box>
                              </Box>
                            </SimpleGrid>
                          </Box>
                        ))}
                      </SimpleGrid>
                    ) : (
                      <AdminEmptyState icon={MdOutlineGroups} title="회원 활동 데이터가 없습니다." description="경기 참여나 투표 기록이 쌓이면 이곳에 표시됩니다." />
                    )}
                  </AdminPanel>
                </VStack>
                );
              })()}

              {/* 풋살 경기 현황판 */}
              {selectedMenu === 'football' && hasPermission('all') && (
                <Box w="100%">
                  <FootballFieldPage memberList={userList} games={games} />
                </Box>
              )}


            </>
          )}
        </Box>
      </Flex>

      {/* 경기 알림 프리뷰 모달 */}
      <Modal isOpen={isGamePreviewOpen} onClose={handleGamePreviewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>경기 알림 프리뷰</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box 
              p={4} 
              border="1px solid" 
              borderColor="gray.200" 
              borderRadius="md"
              bg="white"
            >
              {gamePreviewLoading ? (
                <Center minH="240px">
                  <Spinner size="lg" color="blue.500" />
                </Center>
              ) : gamePreviewError ? (
                <Text fontSize="sm" color="red.600" whiteSpace="pre-wrap">
                  {gamePreviewError}
                </Text>
              ) : gamePreviewObjectUrl ? (
                <Box maxW="720px" mx="auto">
                  <Box as="img" src={gamePreviewObjectUrl} alt="경기 알림 카드" width="100%" borderRadius="md" border="1px solid" borderColor="gray.100" />
                  <Text mt={3} fontSize="xs" color="gray.500">
                    실제 발송 메일 본문에도 동일한 PNG 카드가 표시됩니다.
                  </Text>
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.600">
                  프리뷰를 준비하는 중입니다...
                </Text>
              )}
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={handleGamePreviewClose}>닫기</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 관리자 가이드 모달 */}
      <ManualModal isOpen={adminManual.isOpen} onClose={adminManual.onClose} variant="admin" />

      {/* 투표 알림 프리뷰 모달 */}
      <Modal isOpen={isVotePreviewOpen} onClose={onVotePreviewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>투표 알림 프리뷰</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box 
              p={4} 
              border="1px solid" 
              borderColor="gray.200" 
              borderRadius="md"
              bg="white"
            >
                      <div 
                        style={{
                          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                          maxWidth: "600px",
                          margin: "0 auto",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          padding: "40px",
                          borderRadius: "15px",
                          color: "white"
                        }}
                      >
                        <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "30px", borderRadius: "10px", marginBottom: "30px" }}>
                          <h2 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: 800, textAlign: "center" }}>🗳️ 투표 알림</h2>
                          
                          {/* 실제 투표 데이터 표시 */}
                          {(() => {
                            const sessions = Array.isArray(unifiedVoteData?.allSessions) ? unifiedVoteData.allSessions : [];
                            // 1순위: 가장 최신 세션 (ID가 가장 큰 세션), 2순위: activeSession, 3순위: lastWeekResults, 4순위: 첫 번째 세션
                            const latestSession = sessions.length > 0 ? sessions[0] : null; // allSessions는 id desc로 정렬되어 있음
                            // 최신 세션을 우선적으로 선택
                            const session = latestSession || sessions[0] || null;
                            if (!session) return (
                              <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: "20px", borderRadius: "8px", marginTop: "20px", textAlign: "center" }}>
                                <p style={{ margin: "0", fontSize: "16px" }}>현재 활성화된 투표 세션이 없습니다.</p>
                              </div>
                            );
                            const start = new Date(session.weekStartDate || session.startTime || session.voteStartDate || Date.now());
                            // 월요일 00:01 보정
                            const startMonday = new Date(start);
                            startMonday.setDate(startMonday.getDate() - ((startMonday.getDay() + 6) % 7));
                            startMonday.setHours(0, 1, 0, 0);
                            // 투표 기간 표시용: 월-금 (금요일 23:59:59까지)
                            // 월요일 기준 +4일 = 금요일
                            const endFriday = new Date(startMonday.getTime() + 4 * 24 * 60 * 60 * 1000);
                            endFriday.setHours(23, 59, 59, 0);
                            
                            // 마감 계산용: 매주 목요일 17:00
                            // 현재 시점에서 다음 목요일 17:00 계산
                            const now = new Date();
                            const currentDay = now.getDay(); // 0=일, 1=월, ..., 4=목, 5=금, 6=토
                            let daysUntilThursday = 0;
                            
                            if (currentDay <= 4) { // 일~목
                              daysUntilThursday = 4 - currentDay;
                            } else { // 금~토
                              daysUntilThursday = 11 - currentDay; // 다음주 목요일
                            }
                            
                            const nextThursday = new Date(now);
                            nextThursday.setDate(now.getDate() + daysUntilThursday);
                            nextThursday.setHours(17, 0, 0, 0);
                            
                            // 표시용 종료일은 금요일, 마감 계산은 목요일 17:00
                            const endSafe = endFriday; // 표시는 금요일까지
                            const deadlineForCalculation = nextThursday; // 마감은 목요일 17:00
                            // 요일 표기 (같은 해면 두 번째 연도 생략)
                            const days = ['일','월','화','수','목','금','토'];
                            const startStr = `${startMonday.getFullYear()}. ${String(startMonday.getMonth()+1).padStart(2,'0')}. ${String(startMonday.getDate()).padStart(2,'0')}.(${days[startMonday.getDay()]})`;
                            const endStr = startMonday.getFullYear() === endSafe.getFullYear() 
                              ? `${String(endSafe.getMonth()+1).padStart(2,'0')}. ${String(endSafe.getDate()).padStart(2,'0')}.(${days[endSafe.getDay()]})`
                              : `${endSafe.getFullYear()}. ${String(endSafe.getMonth()+1).padStart(2,'0')}. ${String(endSafe.getDate()).padStart(2,'0')}.(${days[endSafe.getDay()]})`;
                            const participants = Array.isArray(session.participants)
                              ? session.participants
                              : (Array.isArray(session.results) 
                                  ? session.results.filter((r: any) => r?.participated || r?.voted).map((r: any) => ({ id: r.userId || r.id, name: r.name }))
                                  : []);
                            const totalMembers = Array.isArray(userList) ? userList.length : 0;
                            const nonParticipants = Array.isArray(userList)
                              ? userList.filter(user => !participants.some((p: any) => (p?.id && p.id === user.id) || (p?.userId && p.userId === user.id) || (p?.name && p.name === user.name) || (p?.userName && p.userName === user.name)))
                              : [];
                            return (
                            <div style={{ background: "rgba(255, 255, 255, 0.2)", padding: "20px", borderRadius: "8px", marginTop: "20px" }}>
                              <div style={{ marginBottom: "15px", padding: "15px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "8px" }}>
                                <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                                  📅 투표 기간<br />
                                  {startStr} ~ {endStr}
                                </div>
                                <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                                  👥 전체 회원: {totalMembers}명
                                </div>
                                <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                                  ✅ 투표 참여: {participants.length}명
                                </div>
                                {/* 참여자 Pill */}
                                {participants.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {participants.map((p: any, idx: number) => {
                                      const displayName = (p && (p.name || p.userName || p.username)) || String(p);
                                      return (
                                      <span key={idx} style={{
                                        display: 'inline-block',
                                        padding: '2px 6px',
                                        background: '#fff',
                                        color: '#333',
                                        borderRadius: '9999px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        opacity: 0.9
                                      }}>{displayName}</span>
                                      );
                                    })}
                                  </div>
                                )}
                                <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                                  ❌ 투표 미참여: {nonParticipants.length}명
                                </div>
                                {/* 미참여자 Pill */}
                                {nonParticipants.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {nonParticipants.map((user: any, idx: number) => (
                                        <span key={idx} style={{
                                          display: 'inline-block',
                                          padding: '2px 6px',
                                          background: 'rgba(255,255,255,0.85)',
                                          color: '#333',
                                          borderRadius: '9999px',
                                          fontSize: '10px',
                                          fontWeight: 600
                                        }}>{user.name}</span>
                                      ))}
                                  </div>
                                )}
                                <div style={{ fontSize: "14px" }}>
                                  ⏰ 마감까지: {Math.max(0, Math.ceil((deadlineForCalculation.getTime() - new Date().getTime()) / (1000 * 60 * 60)))}시간
                                </div>
                              </div>
                            </div>
                            );
                          })()}
                        </div>
                
                <div style={{ textAlign: "center", marginBottom: "30px" }}>
                  <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.2)", padding: "15px 25px", borderRadius: "25px" }}>
                    <span style={{ fontSize: "14px", opacity: "0.9" }}>발송 시간: {new Date().toLocaleString('ko-KR')}</span>
                  </div>
                </div>
                
                <div style={{ textAlign: "center", fontSize: "14px", opacity: "0.7" }}>
                  <p style={{ margin: "0" }}>이 이메일은 자동으로 발송되었습니다.</p>
                  <p style={{ margin: "5px 0 0 0" }}>FC CHAL GGYEO 관리 시스템</p>
                </div>
              </div>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onVotePreviewClose}>닫기</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
