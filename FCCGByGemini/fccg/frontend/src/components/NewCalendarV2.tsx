import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import dayjs from 'dayjs';
import { Flex, Badge, Tooltip } from '@chakra-ui/react';
import { useAuthStore } from '../store/auth';
import { API_ENDPOINTS } from '../constants';

// 애니메이션 정의
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const gaugeFill = keyframes`
  0% { 
    width: 0%; 
    background: #a78bfa;
    opacity: 0.7;
  }
  100% { 
    width: 100%;
    background: #7c3aed;
    opacity: 1;
  }
`;

const gaugePulse = keyframes`
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4);
  }
  50% { 
    transform: scale(1.02);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
  }
`;

// 스타일 컴포넌트
const CalendarContainer = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 16px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: auto;
  overflow: visible;
  box-sizing: border-box;
  display: block;
  flex: 1 1 auto;
  
  @media (max-width: 1024px) {
    padding: 12px;
  }
  
  @media (max-width: 768px) {
    padding: 8px;
    border-radius: 12px;
  }
`;

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const MonthYearText = styled.h2`
  font-size: 20px;
  font-weight: bold;
  color: #1a202c;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const NavigationButton = styled.button`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  
  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0;
  background: #e2e8f0;
  border-radius: 12px;
  overflow: visible;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  height: auto;
  min-height: 500px;
  box-sizing: border-box;
  flex-shrink: 0;
  
  @media (max-width: 1024px) {
    height: auto;
    min-height: 400px;
  }
  
  @media (max-width: 768px) {
    height: auto;
    min-height: 400px;
  }
`;

const DayHeader = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isSunday', 'isSaturday'].includes(prop),
})<{ isSunday: boolean; isSaturday: boolean }>`
  background: white;
  color: ${props => props.isSunday ? '#c53030' : props.isSaturday ? '#2b6cb0' : '#4a5568'};
  padding: 10px 8px;
  text-align: center;
  font-weight: bold;
  font-size: 13px;
  border-bottom: 0.5px solid #e2e8f0;
  border-right: 0.5px solid #e2e8f0;
  
  @media (max-width: 768px) {
    padding: 6px 4px;
    font-size: 11px;
  }
  
  &:nth-child(7) {
    border-right: none;
  }
`;

const DayCell = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isCurrentMonth', 'isToday', 'hasGame', 'hasVote', 'isVoteGroupStart', 'isVoteGroupEnd'].includes(prop),
})<{ 
  isCurrentMonth: boolean; 
  isToday: boolean; 
  hasGame: boolean;
  hasVote: boolean;
  isVoteGroupStart?: boolean;
  isVoteGroupEnd?: boolean;
}>`
  background: ${props => {
    if (props.hasVote) return 'white';
    return props.isCurrentMonth ? 'white' : '#f7fafc';
  }};
  border-right: 0.5px solid #e2e8f0;
  border-bottom: 0.5px solid #e2e8f0;
  min-height: 100px;
  height: 100px;
  padding: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    min-height: 80px;
    height: 80px;
    padding: 4px;
  }
  
  // 투표일인 경우 다른 날짜와 같은 테두리 색상 적용
  ${props => props.hasVote && `
    border: 0.5px solid #e2e8f0;
    border-radius: 0;
  `}
  
  &:hover {
    background: ${props => {
      if (props.hasVote) return '#f7fafc';
      return props.isCurrentMonth ? '#f7fafc' : '#edf2f7';
    }};
    transform: ${props =>
      props.hasGame ? 'translateY(-3px) scale(1.02)' : 'translateY(-1px)'};
    box-shadow: ${props =>
      props.hasGame
        ? '0 6px 18px rgba(0, 78, 168, 0.22)'
        : '0 4px 12px rgba(0, 0, 0, 0.1)'};
  }
  
  // 모든 날짜 셀의 크기를 동일하게 고정 (isCurrentMonth와 무관하게)
  height: 100px;
  min-height: 100px;
  max-height: 100px;
  
  @media (max-width: 768px) {
    height: 80px;
    min-height: 80px;
    max-height: 80px;
  }
  
  // 마지막 열의 오른쪽 테두리 제거
  &:nth-child(7n) {
    border-right: none;
  }
`;

const DateNumber = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isSunday', 'isSaturday', 'isHoliday', 'isToday', 'isCurrentMonth'].includes(prop),
})<{ 
  isSunday: boolean; 
  isSaturday: boolean; 
  isHoliday: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
}>`
  font-size: 15px;
  font-weight: bold;
  color: ${props => {
    if (props.isHoliday) return '#e53e3e';
    if (!props.isCurrentMonth) {
      // 비당월 일요일, 토요일도 흐리게 처리
      if (props.isSunday || props.isSaturday) return 'rgba(160, 174, 192, 0.6)';
      return 'rgba(160, 174, 192, 0.8)';
    }
    if (props.isSunday) return '#e53e3e';
    if (props.isSaturday) return '#3182ce';
    return '#2d3748';
  }};
  text-align: right;
  margin-bottom: 8px;
  position: absolute;
  top: 8px;
  right: 8px;
  
  @media (max-width: 768px) {
    font-size: 12px;
    top: 4px;
    right: 4px;
    margin-bottom: 4px;
  }
`;

const HolidayName = styled.span`
  font-size: 10px;
  color: #e53e3e;
  font-weight: bold;
  margin-right: 4px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 8px;
    max-width: 50px;
  }
`;

const GameTypeBadge = styled.span<{ eventType: string }>`
  font-size: 11px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 6px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  // 유형별 다른 스타일 적용
  ${props => {
    switch (props.eventType) {
      case '매치':
        return `
          color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.3);
        `;
      case '자체':
        return `
          color: #059669;
          background: rgba(5, 150, 105, 0.1);
          border: 1px solid rgba(5, 150, 105, 0.3);
        `;
      case '회식':
        return `
          color: #dc2626;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
        `;
      default:
        return `
          color: #6b7280;
          background: rgba(107, 114, 128, 0.1);
          border: 1px solid rgba(107, 114, 128, 0.3);
        `;
    }
  }}
`;

const GameInfoBox = styled.div`
  background: white;
  color: #2d3748;
  border: 1px solid #3182ce;
  border-radius: 8px;
  padding: 5px 8px;
  margin-top: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.5s ease-out;
  box-shadow: 0 2px 8px rgba(49, 130, 206, 0.2);
  
  // 세로 길이 조정 (더 컴팩트하게)
  min-height: 46px;
  
  // 가로세로 중앙정렬
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(49, 130, 206, 0.3);
    border-color: #2b6cb0;
  }
  
  // 내용을 최대한 축소
  font-size: 9px;
  line-height: 1.2;
  
  // 텍스트가 넘치지 않도록 처리
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 3px 4px;
    margin-top: 4px;
    min-height: 36px;
    font-size: 8px;
    border-radius: 6px;
  }
`;

const GameCountBadge = styled.div`
  font-size: 10px;
  font-weight: bold;
  margin-bottom: 3px;
  text-align: center;
  color: #2d3748;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`;

const GameTimeText = styled.div`
  font-size: 9px;
  color: #4a5568;
  margin-bottom: 2px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
`;

const GameLocationText = styled.div`
  font-size: 9px;
  color: #4a5568;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
`;

const VoteContainer = styled.div`
  margin-top: auto;
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
`;

const VoteGauge = styled.div<{ percentage: number; isMax: boolean }>`
  height: 15px;
  width: 100%;
  background: ${props => props.isMax ? '#ddd6fe' : '#ede9fe'};
  border-radius: 7px;
  overflow: hidden;
  position: relative;
  border: 1px solid ${props => props.isMax ? '#7c3aed' : '#c4b5fd'};
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0%;
    background: ${props => props.isMax ? '#7c3aed' : '#a78bfa'};
    border-radius: 7px;
    animation: ${props => props.percentage > 0 ? css`${gaugeFill} 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards` : 'none'};
    transition: all 0.3s ease;
  }
  
  &:hover {
    border-color: #7c3aed;
    box-shadow: 0 0 8px rgba(124, 58, 237, 0.3);
  }
  
  &:hover::after {
    background: #7c3aed;
    transform: scaleY(1.05);
  }
`;

// 하드코딩된 공휴일 데이터 제거 - API에서만 데이터를 가져옵니다
// API 실패 시 빈 객체 사용

interface GameData {
  id: string;
  eventType: string;
  count: number;
  time: string;
  location: string;
  confirmed: boolean;
}

interface VoteData {
  date: string;
  count: number;
  max: boolean;
  dayName: string;
  voteDate: Date;
}

interface VoteResults {
  voteSession: {
    id: number;
    weekStartDate: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    isCompleted: boolean;
    createdAt: string;
    updatedAt: string;
    votes: Array<{
      id: number;
      userId: number;
      selectedDays: string[];
      createdAt: string;
    }>;
  };
  voteResults: Record<string, number>;
}

interface CalendarProps {
  gameDataForCalendar: Record<string, GameData>;
  allDates: VoteData[];
  onGameClick: (gameData: GameData) => void;
  voteResults?: VoteResults | null;
  nextWeekVoteData?: VoteData[];
  allMembers?: Array<{id: number, name: string}>;
  unifiedVoteData?: any;
}

// 투표 인원명을 가져오는 함수
const getVoteMemberNames = (dateString: string, unifiedVoteData: any, _currentUser: { id: number; name: string } | null, allMembers: Array<{id: number, name: string}> = []): string[] => {
  console.log('🔍 getVoteMemberNames 호출:', {
    dateString,
    hasUnifiedVoteData: !!unifiedVoteData,
    hasActiveSession: !!unifiedVoteData?.activeSession,
    hasResults: !!unifiedVoteData?.activeSession?.results,
    allMembersCount: allMembers?.length || 0
  });
  
  if (!unifiedVoteData?.activeSession?.results) {
    console.log('❌ unifiedVoteData 또는 results가 없습니다.');
    return [];
  }

  const memberNames: string[] = [];
  
  // YYYY-MM-DD 형식을 요일로 변환
  const dateObj = dayjs(dateString);
  const dayOfWeek = dateObj.day(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayKey = dayKeys[dayOfWeek];
  
  console.log(`🔍 투표 멤버 이름 찾기: ${dateString} -> ${dayKey}`);
  console.log('🔍 results 구조:', unifiedVoteData.activeSession.results);
  
  // 통합 API의 results에서 해당 요일의 참여자 찾기
  const dayResult = unifiedVoteData.activeSession.results[dayKey];
  console.log(`🔍 ${dayKey} 결과:`, dayResult);
  
  if (dayResult && dayResult.participants) {
    console.log(`🔍 ${dayKey} 참여자들:`, dayResult.participants);
    dayResult.participants.forEach((participant: any) => {
      memberNames.push(participant.userName);
      console.log(`✅ 멤버 이름 추가: ${participant.userName}`);
    });
  } else {
    console.log(`❌ ${dayKey}에 참여자 데이터가 없습니다.`);
  }
  
  console.log(`📊 ${dateString}에 투표한 멤버들:`, memberNames);

  // 가나다 순으로 정렬
  return memberNames.sort((a, b) => a.localeCompare(b, 'ko'));
};

const NewCalendarV2: React.FC<CalendarProps> = ({
  gameDataForCalendar,
  allDates,
  onGameClick,
  voteResults,
  nextWeekVoteData,
  allMembers = [],
  unifiedVoteData
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [holidays, setHolidays] = useState<Record<string, string>>({}); // 빈 객체로 시작 (API에서 로드)
  const { user } = useAuthStore();
  const targetVoteMonth = useMemo(() => {
    if (!nextWeekVoteData || nextWeekVoteData.length === 0) return null;
    const withVoteDate = nextWeekVoteData.find((item) => item.voteDate);
    const candidate = withVoteDate || nextWeekVoteData[0];
    const parsed = dayjs(candidate.voteDate);
    if (!parsed.isValid()) return null;
    return parsed.startOf('month');
  }, [nextWeekVoteData]);

  useEffect(() => {
    if (!targetVoteMonth) return;
    if (!currentDate.isSame(targetVoteMonth, 'month')) {
      setCurrentDate(targetVoteMonth);
    }
  }, [targetVoteMonth]);

  const disabledDayKeySet = useMemo(() => {
    const set = new Set<string>();
    const raw = unifiedVoteData?.activeSession?.disabledDays;
    if (!raw) return set;
    try {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(arr)) {
        arr.forEach((item: any) => {
          if (item?.day && typeof item.day === 'string') {
            set.add(item.day);
          }
        });
      }
    } catch (e) {
      console.warn('disabledDays 파싱 실패(NewCalendarV2):', e);
    }
    return set;
  }, [unifiedVoteData?.activeSession?.disabledDays]);
  
  // 공휴일 데이터 가져오기
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const currentYear = currentDate.year();
        const nextYear = currentYear + 1;
        
        // API BASE URL 가져오기
        const { getApiBaseUrl } = await import('../config/api');
        const baseUrl = await getApiBaseUrl();
        const apiUrl = baseUrl.replace('/api/auth', '');
        
        // 올해와 내년 공휴일 조회
        const response = await fetch(`${apiUrl}/api/holiday/years`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ years: [currentYear.toString(), nextYear.toString()] }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.holidayMap) {
            // API 응답에서 통합된 공휴일 맵 사용
            setHolidays(data.data.holidayMap);
          } else if (data.success && data.data.holidays) {
            // 연도별 공휴일 맵이 있는 경우 통합
            const holidayMap: Record<string, string> = {};
            Object.values(data.data.holidays).forEach((yearMap: any) => {
              Object.assign(holidayMap, yearMap);
            });
            setHolidays(holidayMap);
          } else {
            console.warn('⚠️ NewCalendarV2 - 공휴일 API 응답 형식이 예상과 다릅니다:', data);
          }
        } else {
          console.error('❌ NewCalendarV2 - 공휴일 API 호출 실패:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ NewCalendarV2 - 공휴일 데이터 로드 실패:', error);
        // API 실패 시 빈 객체 유지 (하드코딩된 데이터 사용 안 함)
        setHolidays({});
      }
    };
    
    fetchHolidays();
  }, [currentDate.year()]);
  
  
  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startOfCalendar = startOfMonth.startOf('week');
  const endOfCalendar = endOfMonth.endOf('week');
  
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  
  // days 배열을 useMemo로 감싸서 holidays가 변경될 때마다 다시 생성되도록 함
  const days = useMemo(() => {
    const daysArray: Array<{
      date: Date;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasGame: boolean;
      gameData: GameData | null;
      hasVote: boolean;
      voteData: VoteData | undefined;
      voteCount: number;
      isHoliday: boolean;
      holidayName: string | undefined;
    }> = [];
    
    let day = startOfCalendar;
  
    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar, 'day')) {
    const isCurrentMonth = day.month() === currentDate.month();
    const isToday = day.isSame(dayjs(), 'day');
    
    // 날짜 유효성 검증
    if (!day.isValid()) {
      console.warn('⚠️ 유효하지 않은 날짜 객체:', day);
      day = day.add(1, 'day');
      continue;
    }
    
    const dateString = day.format('YYYY-MM-DD');
    
    // dateString 유효성 검증 (NaN 포함 여부 확인)
    if (!dateString || dateString.includes('NaN') || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.warn('⚠️ 유효하지 않은 날짜 문자열:', dateString);
      day = day.add(1, 'day');
      continue;
    }
    
    // 공휴일 확인
    const isHoliday = holidays[dateString] !== undefined;
    const holidayName = holidays[dateString];
    
    
    // 경기 정보 확인 (날짜 형식 통일)
    let hasGame = false;
    let gameData = null;
    
    // gameDataForCalendar에서 경기 데이터 찾기
    // gameDataForCalendar가 유효한지 확인
    if (gameDataForCalendar && typeof gameDataForCalendar === 'object' && Object.keys(gameDataForCalendar).length > 0) {
      try {
        for (const [key, value] of Object.entries(gameDataForCalendar)) {
          // 키 유효성 검증
          if (!key || typeof key !== 'string') {
            continue;
          }
          
          // NaN 포함 여부 확인
          if (key.includes('NaN') || key === 'undefined' || key === 'null') {
            continue;
          }
          
          // 날짜 형식 검증
          let keyDate = key;
          if (key.includes('T')) {
            keyDate = key.split('T')[0];
          }
          
          // 날짜 형식이 유효한지 확인
          if (!/^\d{4}-\d{2}-\d{2}$/.test(keyDate)) {
            continue;
          }
          
          // value 유효성 검증
          if (!value || typeof value !== 'object') {
            continue;
          }
          
          // 날짜 매칭
          if (keyDate === dateString) {
            hasGame = true;
            gameData = value as GameData;
            break;
          }
        }
      } catch (error) {
        console.warn('⚠️ gameDataForCalendar 처리 중 오류:', error);
      }
    }
    
    // 투표 정보 확인
    const voteData = allDates.find(date => {
      const voteDateString = dayjs(date.voteDate).format('YYYY-MM-DD');
      return voteDateString === dateString;
    });
    
    const hasVote = voteData !== undefined;
    
    // 통합 API에서 해당 날짜의 투표 수 찾기
    let voteCount = 0;
    const dayOfWeek = day.day(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
    const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayKey = dayKeys[dayOfWeek];
    const isVoteDisabledByAdmin = disabledDayKeySet.has(dayKey);

    if (unifiedVoteData?.activeSession?.results) {
      const dayOfWeek = day.day(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
      const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const dayKey = dayKeys[dayOfWeek];
      
      const dayResult = unifiedVoteData.activeSession.results[dayKey];
      if (dayResult && dayResult.count) {
        voteCount = dayResult.count;
        console.log(`✅ 통합 API에서 투표 수 매칭 성공: ${dateString} → ${dayKey} = ${voteCount}명`);
      }
    }
    
    // 다음주 투표일 확인 (동적 계산)
    const now = new Date();
    const currentDay = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
    
    // 이번주 월요일 계산
    let daysUntilMonday;
    if (currentDay === 0) { // 일요일
      daysUntilMonday = -6; // 지난 월요일
    } else if (currentDay === 1) { // 월요일
      daysUntilMonday = 0; // 오늘
    } else {
      daysUntilMonday = 1 - currentDay; // 이번주 월요일
    }
    
    const thisWeekMonday = new Date(now);
    thisWeekMonday.setDate(now.getDate() + daysUntilMonday);
    
    // 다음주 월요일 계산
    const nextWeekMonday = new Date(thisWeekMonday);
    nextWeekMonday.setDate(thisWeekMonday.getDate() + 7);
    
    // 다음주 투표일 범위 계산 (월-금) - 경계 포함 처리
    const startOfNextWeek = new Date(nextWeekMonday);
    startOfNextWeek.setHours(0, 0, 0, 0); // 월요일 00:00:00
    const endOfNextWeek = new Date(nextWeekMonday);
    endOfNextWeek.setDate(nextWeekMonday.getDate() + 4); // 금요일
    endOfNextWeek.setHours(23, 59, 59, 999); // 금요일 23:59:59.999

    const isNextWeekVoteDay = day.toDate().getTime() >= startOfNextWeek.getTime() && 
                              day.toDate().getTime() <= endOfNextWeek.getTime() && 
                              day.day() >= 1 && day.day() <= 5; // 월요일(1)부터 금요일(5)까지
    
    // 투표 데이터가 있는 경우 로그 출력
    if (hasVote || isNextWeekVoteDay) {
      console.log(`🔍 투표 데이터: ${dateString}, hasVote: ${hasVote}, isNextWeekVoteDay: ${isNextWeekVoteDay}, voteCount: ${voteCount}`);
    }

    // 확정된 경기 주(월~금) 전체 게이지/인원 pill 숨김 처리
    let showVoteForThisDay = (hasVote || isNextWeekVoteDay);

    // 현재 날짜가 속한 주의 월요일/금요일 계산
    const jsDate = day.toDate();
    const dow = jsDate.getDay(); // 0~6
    const daysToMonday = dow === 0 ? -6 : 1 - dow;
    const weekStart = new Date(jsDate);
    weekStart.setDate(jsDate.getDate() + daysToMonday);
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // 금요일
    weekEnd.setHours(23,59,59,999);

    // 해당 주에 확정된 게임이 하나라도 있는지 검사
    let weekHasConfirmed = false;
    if (gameDataForCalendar && typeof gameDataForCalendar === 'object' && Object.keys(gameDataForCalendar).length > 0) {
      try {
        for (const [key, value] of Object.entries(gameDataForCalendar)) {
          // 키 유효성 검증
          if (!key || typeof key !== 'string' || key.includes('NaN')) {
            continue;
          }
          
          // 날짜 형식 검증
          let keyDate = key;
          if (key.includes('T')) {
            keyDate = key.split('T')[0];
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(keyDate)) {
            continue;
          }
          
          const gd = value as any;
          if (!gd || typeof gd !== 'object' || !gd.date) continue;
          
          const gameISO = gd.date as string | undefined;
          if (!gameISO || typeof gameISO !== 'string' || gameISO.includes('NaN')) {
            continue;
          }
          
          // 날짜 유효성 검증
          try {
            const gdDate = new Date(gameISO);
            if (isNaN(gdDate.getTime())) {
              continue;
            }
            
            if (gdDate >= weekStart && gdDate <= weekEnd && gd?.confirmed) {
              weekHasConfirmed = true;
              break;
            }
          } catch (error) {
            console.warn('⚠️ 날짜 파싱 오류:', error, '게임 데이터:', gd);
            continue;
          }
        }
      } catch (error) {
        console.warn('⚠️ weekHasConfirmed 검사 중 오류:', error);
      }
    }

    if (weekHasConfirmed || (isNextWeekVoteDay && isVoteDisabledByAdmin)) {
      showVoteForThisDay = false;
      voteCount = 0;
    }
    
    // 날짜 객체 유효성 최종 검증
    const dateObj = day.toDate();
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ 유효하지 않은 날짜 객체로 인해 건너뜀:', dateString);
      day = day.add(1, 'day');
      continue;
    }
    
      daysArray.push({
        date: dateObj,
        day: day.date(),
        isCurrentMonth,
        isToday,
        hasGame,
        gameData,
        hasVote: showVoteForThisDay,
        voteData,
        voteCount,
        isHoliday,
        holidayName
      });
      
      day = day.add(1, 'day');
    }
    
    return daysArray;
  }, [holidays, currentDate, startOfCalendar, endOfCalendar, gameDataForCalendar, allDates, unifiedVoteData, disabledDayKeySet]);
  
  const goToPreviousMonth = () => {
    const newDate = dayjs(currentDate).subtract(1, 'month');
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = dayjs(currentDate).add(1, 'month');
    setCurrentDate(newDate);
  };

  // 게이지바 비율 계산 함수 (통합 API 구조)
  const calculateGaugePercentage = (voteCount: number) => {
    if (voteCount === 0) return 0;
    
    // 최대 투표 인원 찾기
    const maxVoteCount = getMaxVoteCount();
    
    // 최대 투표 인원이 0이면 100% 반환
    if (maxVoteCount === 0) return 100;
    
    // 비율 계산 (최대 투표 인원 대비)
    const percentage = Math.round((voteCount / maxVoteCount) * 100);
    return Math.min(percentage, 100); // 최대 100%로 제한
  };

  // 최대 투표 수 계산 함수 (통합 API 구조)
  const getMaxVoteCount = () => {
    if (!unifiedVoteData?.activeSession?.results) return 0;
    const results = unifiedVoteData.activeSession.results;
    return Math.max(
      results.MON?.count || 0,
      results.TUE?.count || 0,
      results.WED?.count || 0,
      results.THU?.count || 0,
      results.FRI?.count || 0
    );
  };

  return (
    <CalendarContainer>
      <CalendarHeader>
        <NavigationButton onClick={goToPreviousMonth}>
          ◀ 이전
        </NavigationButton>
        <MonthYearText>
          {currentDate.format('YYYY년 M월')}
        </MonthYearText>
        <NavigationButton onClick={goToNextMonth}>
          다음 ▶
        </NavigationButton>
      </CalendarHeader>
      
      <CalendarGrid>
        {dayNames.map((dayName, index) => (
          <DayHeader 
            key={dayName} 
            isSunday={index === 0}
            isSaturday={index === 6}
          >
            {dayName}
          </DayHeader>
        ))}
        
        {days.map((dayInfo, index) => {
          // 투표 구간 하드코딩 제거: 월 경계와 무관하게 표시
          const isVoteGroupStart = false;
          const isVoteGroupEnd = false;

          return (
            <DayCell
              key={index}
              isCurrentMonth={dayInfo.isCurrentMonth}
              isToday={dayInfo.isToday}
              hasGame={dayInfo.hasGame}
              hasVote={dayInfo.hasVote}
              isVoteGroupStart={isVoteGroupStart}
              isVoteGroupEnd={isVoteGroupEnd}
            >
              <Flex justifyContent="space-between" alignItems="center" width="100%" mb="8px">
                <Flex alignItems="center" gap="4px">
                  {dayInfo.hasGame && dayInfo.gameData && (
                    <GameTypeBadge eventType={dayInfo.gameData.eventType}>{dayInfo.gameData.eventType}</GameTypeBadge>
                  )}
                  {dayInfo.isHoliday && dayInfo.holidayName && (
                    <HolidayName>{dayInfo.holidayName}</HolidayName>
                  )}
                </Flex>
                <DateNumber 
                  isSunday={dayInfo.date && !isNaN(dayInfo.date.getTime()) ? dayjs(dayInfo.date).day() === 0 : false}
                  isSaturday={dayInfo.date && !isNaN(dayInfo.date.getTime()) ? dayjs(dayInfo.date).day() === 6 : false}
                  isHoliday={dayInfo.isHoliday}
                  isToday={dayInfo.isToday}
                  isCurrentMonth={dayInfo.isCurrentMonth}
                >
                  {dayInfo.day}
                </DateNumber>
              </Flex>
              
              {/* 경기 정보 표시 (8월 18-22일 더미데이터만 제외) */}
              {dayInfo.hasGame && dayInfo.gameData && 
               dayInfo.date && !isNaN(dayInfo.date.getTime()) &&
               dayInfo.gameData.date && // 날짜가 있는지 확인
               !(dayjs(dayInfo.date).month() === 7 && 
                 (dayjs(dayInfo.date).date() >= 18 && dayjs(dayInfo.date).date() <= 22)) && (
                <GameInfoBox
                  onClick={() => {
                    if (dayInfo.gameData && dayInfo.gameData.date) {
                      onGameClick(dayInfo.gameData);
                    }
                  }}
                >
                  {/* 공휴일이 아닌 경우에만 인원수 pill 표시 */}
                  {dayInfo.date && !isNaN(dayInfo.date.getTime()) && !dayInfo.isHoliday && (
                    <GameCountBadge>
                      ⚽ {dayInfo.gameData.count}명
                    </GameCountBadge>
                  )}
                  <GameTimeText>
                    🕐 {dayInfo.gameData.time}
                  </GameTimeText>
                  <GameLocationText>
                    📍 {dayInfo.gameData.location}
                  </GameLocationText>
                </GameInfoBox>
              )}
              
              {/* 투표 게이지 표시 - 다음주 일정투표(동적) (월 경계 무시하고 표시) */}
              {dayInfo.hasVote && dayInfo.date && !isNaN(dayInfo.date.getTime()) && !dayInfo.isHoliday && (
                <Tooltip 
                  label={(() => {
                    // 통합 API 데이터에서 직접 투표자 이름 찾기
                    let memberNames: string[] = [];
                    
                    // voteResults가 있고 통합 API 데이터 구조를 사용하는 경우
                    if (voteResults && voteResults.voteSession && voteResults.voteSession.votes && dayInfo.date && !isNaN(dayInfo.date.getTime())) {
                      const dateString = dayjs(dayInfo.date).format('YYYY-MM-DD');
                      if (dateString && !dateString.includes('NaN')) {
                        memberNames = getVoteMemberNames(dateString, unifiedVoteData, user, allMembers);
                      }
                    }
                    
                    if (dayInfo.date && !isNaN(dayInfo.date.getTime())) {
                      console.log('🔍 캘린더 툴팁:', {
                        date: dayjs(dayInfo.date).format('YYYY-MM-DD'),
                        voteCount: dayInfo.voteCount,
                        memberNames,
                        allMembers: allMembers?.length || 0
                      });
                    }
                    
                    // 강제표시 로직 제거 - 실제 데이터에서만 가져오기
                    
                    return memberNames.length > 0 
                      ? memberNames.join(', ')
                      : '아직 투표한 인원이 없습니다.';
                  })()}
                  placement="top"
                  hasArrow
                  bg="purple.600"
                  color="white"
                  fontSize="sm"
                  borderRadius="md"
                  px={3}
                  py={2}
                >
                  <VoteContainer>
                    {(() => {
                      const isMaxVoteDay = dayInfo.voteCount > 0 && dayInfo.voteCount === getMaxVoteCount();
                      const hasVotes = dayInfo.voteCount > 0;
                      return (
                    <Badge 
                      colorScheme={hasVotes ? "purple" : "gray"}
                      variant="outline" 
                      borderRadius="full" 
                      px={3} 
                      py={1} 
                      fontSize="xs"
                      w="45px"
                      h="22px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontWeight={isMaxVoteDay ? "bold" : "normal"}
                      mx="auto"
                      borderWidth="0.3px"
                      bg={isMaxVoteDay ? "purple.600" : (hasVotes ? "purple.100" : "gray.50")}
                      borderColor={isMaxVoteDay ? "purple.700" : (hasVotes ? "purple.300" : "gray.300")}
                      color={isMaxVoteDay ? "white" : (hasVotes ? "purple.700" : "gray.600")}
                    >
                      {dayInfo.voteCount}명
                    </Badge>
                      );
                    })()}
                    <VoteGauge percentage={calculateGaugePercentage(dayInfo.voteCount)} isMax={dayInfo.voteCount > 0 && dayInfo.voteCount === getMaxVoteCount()} />
                  </VoteContainer>
                </Tooltip>
              )}
              
              {/* (중복 표기를 방지하기 위해 예비 블록 제거) */}
            </DayCell>
          );
        })}
      </CalendarGrid>
    </CalendarContainer>
  );
};

export default NewCalendarV2;
