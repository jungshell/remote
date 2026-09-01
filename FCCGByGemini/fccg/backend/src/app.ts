import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import authRoutes from './routes/auth_simple';
import holidayRoutes from './routes/holiday';
import { calculateVoteAttendanceDetails, calculateGameAttendanceDetails, checkMemberStatusRules } from './controllers/authController';
import * as authController from './controllers/authController';
import bodyParser from 'body-parser';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { securityHeaders, apiLimiter } from './middlewares/security';
import { authenticateToken } from './middlewares/authMiddleware';
import { monitoring } from './utils/monitoring';
import {
  aggregateVotesByWeekday,
  getKstDateKey,
  getVoteSessionSundayDeadline,
  parseVoteDays,
  voteDayToMonFriAbsentKeyForSession,
  type WeekdayKey
} from './utils/voteUtils';
import { getMailConfigurationStatus, sendMail } from './utils/mailTransport';

const app = express();
const PORT = process.env.PORT || 4000;

// Prisma 연결 풀 설정 (성능 최적화)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

console.log('서버 시작');

// 미들웨어 - CORS 설정 (프로덕션 환경 포함)
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // 허용할 도메인 목록
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://fccg-inoi.vercel.app',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    // origin이 없거나 (같은 도메인 요청) 허용 목록에 있으면 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      } else {
        // 개발 환경에서는 모든 origin 허용
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          // Render 헬스체크는 origin이 없을 수 있음
          if (!origin) {
            callback(null, true);
            return;
          }
          // 프로덕션 환경에서는 허용 목록에 없는 브라우저 출처를 차단
          console.log('⚠️ CORS 차단:', origin, '허용 목록:', allowedOrigins);
          callback(null, false);
        }
      }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'cache-control', 'Cache-Control', 'pragma', 'Pragma'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// 보안 헤더 설정 (기존 기능에 영향 없음)
app.use(securityHeaders);

// Body parser는 미들웨어 체인 초기에 설정 (요청 본문 파싱을 위해)
app.use(bodyParser.json({ limit: '50mb' })); // body-parser로 대체, 업로드용 크기 제한 증가
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' })); // multipart/form-data 지원

// [DIAG] IP 진단 엔드포인트 — rate limiter 적용 전, trust proxy 설정 효과 확인용. 확인 후 제거 예정.
app.get('/debug/ip', (_req, res) => {
  const req = _req as any;
  res.json({
    'req.ip':               req.ip,
    'req.ips':              req.ips,
    'x-forwarded-for':      req.headers['x-forwarded-for'],
    'x-real-ip':            req.headers['x-real-ip'],
    'socket.remoteAddress': req.socket?.remoteAddress,
    trustProxySetting:      req.app.get('trust proxy'),
    note: 'trust proxy가 설정되지 않으면 req.ip = 소켓 직접 주소(Render 내부 IP). x-forwarded-for가 실제 클라이언트 IP.',
  });
});

// 헬스체크 엔드포인트 (rate limiter 적용 전에 등록 - keepalive용)
app.get('/health', (req, res) => {
  const healthStatus = monitoring.getHealthStatus();
  res.status(200).json({ 
    status: healthStatus.status === 'healthy' ? 'OK' : 'DEGRADED',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    release: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || process.env.npm_package_version || 'local',
    ...healthStatus
  });
});

// 모니터링 엔드포인트 (관리자용)
app.get('/api/monitoring/status', authenticateToken, (req: any, res: any) => {
  // 관리자만 접근 가능
  const user = (req as any).user;
  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
    return res.status(403).json({ error: '권한이 없습니다.' });
  }

  const healthStatus = monitoring.getHealthStatus();
  const errorStats = monitoring.getErrorStats();
  
  res.json({
    health: healthStatus,
    errors: errorStats,
    recentErrors: monitoring.getRecentErrors(20)
  });
});

// Rate Limiting 적용 (기존 사용자에게는 영향 없음)
app.use('/api', apiLimiter);

// 정적 파일 서빙 (업로드된 이미지)
app.use('/uploads', express.static('uploads'));
// 갤러리 이미지를 위한 별도 경로
app.use('/uploads/gallery', express.static('uploads/gallery'));

// 라우트 - authRoutes 사용 (직접 구현한 API보다 먼저 등록)
console.log('authRoutes 등록 시작');
app.use('/api/auth', authRoutes);
console.log('authRoutes 등록 완료');

// 공휴일 API 라우트 등록
console.log('holidayRoutes 등록 시작');
app.use('/api/holiday', holidayRoutes);
console.log('holidayRoutes 등록 완료');

// 과거 Gmail OAuth 콜백은 refresh token 노출 위험이 있어 폐기했다.
// 실제 메일 발송은 GMAIL_USER/GMAIL_APP_PASSWORD 기반 SMTP를 사용한다.
app.get('/auth/google/callback', (_req, res) => {
  return res.status(410).json({
    error: '사용하지 않는 Gmail OAuth 경로입니다.',
    setup: 'Render에서는 GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN을 설정해주세요.'
  });
});

// 안전망 라우트 제거: authRoutes에서 모든 경로를 처리

// 라우트는 모두 authRoutes에서 처리 (중복 등록 제거)

// 통합 회원 및 경기 정보 조회 API
app.get('/api/auth/members', async (req, res) => {
  try {
    console.log('🔍 통합 API 호출 - 회원 및 경기 정보 조회');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // 모든 회원 조회 (완전한 정보 포함)
    const members = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        attendance: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        statusChangedAt: true,
        statusChangeReason: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // 활성 투표 세션 조회
    const activeSession = await prisma.voteSession.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('🔍 통합 API - 활성 세션 확인:', {
      hasActiveSession: !!activeSession,
      activeSessionId: activeSession?.id,
      activeSessionIsActive: activeSession?.isActive,
      activeSessionWeekStart: activeSession?.weekStartDate
    });

    // 경기 조회 조건 설정
    let gameWhereCondition: any = {};
    
    // 활성 세션이 있으면 자동생성 일정은 표시하지 않음 (투표가 진행 중이므로)
    if (activeSession && activeSession.isActive) {
      console.log('📊 통합 API - 활성 세션 있음 - 자동생성일정 숨김');
      gameWhereCondition = { autoGenerated: false };
    } else {
      console.log('📊 통합 API - 활성 세션 없음 - 자동생성일정 표시');
      // 활성 세션이 없으면 (투표가 마감된 상태) 자동생성 일정도 표시
      // 최근 마감된 세션의 주간에 해당하는 자동생성 게임들을 표시
      const allCompletedSessions = await prisma.voteSession.findMany({
        where: { isCompleted: true },
        orderBy: { id: 'desc' }
      });
      
      // weekStartDate 기준으로 최신 세션 찾기
      const lastCompletedSession = allCompletedSessions
        .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())[0];
      
      console.log('🔍 통합 API - 마지막 완료된 세션:', {
        hasLastCompletedSession: !!lastCompletedSession,
        lastCompletedSessionId: lastCompletedSession?.id,
        lastCompletedSessionWeekStart: lastCompletedSession?.weekStartDate
      });
      
      if (lastCompletedSession) {
        const weekStart = new Date(lastCompletedSession.weekStartDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // 주말까지
        
        console.log('📅 통합 API - 자동생성일정 필터링 범위:', {
          weekStart: weekStart.toLocaleDateString(),
          weekEnd: weekEnd.toLocaleDateString()
        });
        
        gameWhereCondition = {
          OR: [
            { autoGenerated: false }, // 수동 생성된 경기는 항상 표시
            {
              AND: [
                { autoGenerated: true },
                { date: { gte: weekStart } },
                { date: { lte: weekEnd } }
              ]
            }
          ]
        };
      } else {
        // 마감된 세션이 없으면 수동 생성된 경기만 표시
        console.log('📊 통합 API - 마감된 세션 없음 - 수동생성일정만 표시');
        gameWhereCondition = { autoGenerated: false };
      }
    }

    // 경기 조회
    const games = await prisma.game.findMany({
      where: gameWhereCondition,
      select: {
        id: true,
        date: true,
        time: true,
        location: true,
        gameType: true,
        eventType: true,
        mercenaryCount: true,
        memberNames: true,
        selectedMembers: true,
        autoGenerated: true,
        confirmed: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        date: 'asc'
      }
    });

        // 각 경기에 대해 전체 참가자 수 계산
        const gamesWithTotalCount = games.map(game => {
          let totalCount = 0;
          let allParticipantNames = [];
          let uniqueSelectedMembers = [];
          let uniqueMemberNames = [];

          // selectedMembers 파싱 (주요 참가자)
          try {
            const selectedMembers = typeof game.selectedMembers === 'string' 
              ? JSON.parse(game.selectedMembers) 
              : game.selectedMembers || [];
            
            // 실제 회원 목록과 매칭하여 중복 제거
            const actualMemberNames = members.map(m => m.name);
            uniqueSelectedMembers = selectedMembers.filter(name => 
              actualMemberNames.includes(name)
            );
            
            // 중복 제거 (같은 이름이 여러 번 나올 경우)
            uniqueSelectedMembers = [...new Set(uniqueSelectedMembers)];
            totalCount += uniqueSelectedMembers.length;
            allParticipantNames = [...allParticipantNames, ...uniqueSelectedMembers];
          } catch (error) {
            console.warn('⚠️ selectedMembers 파싱 오류:', error);
          }

          // memberNames 파싱 (추가 참가자 - 중복 제거)
          try {
            const memberNames = typeof game.memberNames === 'string' 
              ? JSON.parse(game.memberNames) 
              : game.memberNames || [];
            
            // selectedMembers에 없는 이름만 추가
            // 빈 문자열 제거 및 "용병"으로 시작하는 이름 제외 (용병은 mercenaryCount로 계산)
            uniqueMemberNames = memberNames.filter(name => {
              if (!name || typeof name !== 'string') return false;
              const trimmedName = name.trim();
              if (trimmedName === '') return false;
              if (trimmedName.startsWith('용병')) return false; // 용병은 mercenaryCount로 계산
              return !allParticipantNames.includes(trimmedName);
            });
            totalCount += uniqueMemberNames.length;
            allParticipantNames = [...allParticipantNames, ...uniqueMemberNames];
          } catch (error) {
            console.warn('⚠️ memberNames 파싱 오류:', error);
          }

          // mercenaryCount 추가
          totalCount += game.mercenaryCount || 0;

      console.log(`🔍 경기 ${game.id} 참가자 계산:`, {
        selectedMembers: game.selectedMembers,
        memberNames: game.memberNames,
        mercenaryCount: game.mercenaryCount,
        totalCount,
        allParticipantNames,
        uniqueSelectedMembers,
        uniqueMemberNames,
        actualMemberNames: members.map(m => m.name)
      });

      return {
        ...game,
        totalParticipantCount: totalCount,
        allParticipantNames: allParticipantNames
      };
    });
    
    console.log('🔍 경기 목록 필터링:', {
      activeSession: activeSession ? activeSession.weekStartDate : '없음',
      isActive: activeSession ? activeSession.isActive : false,
      totalGames: gamesWithTotalCount.length,
      autoGenerated: gamesWithTotalCount.filter(g => g.autoGenerated).length
    });
    
    console.log('✅ 통합 데이터 조회 성공:', members.length, '명 회원,', gamesWithTotalCount.length, '경기');
    console.log('📋 첫 번째 회원 데이터:', {
      id: members[0]?.id,
      name: members[0]?.name,
      email: members[0]?.email,
      createdAt: members[0]?.createdAt
    });
    
    const response = { 
      members,
      games: gamesWithTotalCount,
      totalMembers: members.length,
      totalGames: gamesWithTotalCount.length,
      activeMembers: members.filter(m => m.status === 'ACTIVE').length
    };
    
    console.log('📤 응답 데이터 구조:', {
      membersCount: response.members.length,
      gamesCount: response.games.length,
      firstMemberFields: Object.keys(response.members[0] || {}),
      firstGameFields: Object.keys(response.games[0] || {}),
      firstGameData: response.games[0]
    });
    
    res.json(response);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 통합 데이터 조회 API 오류:', error);
    res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
  }
});

// 중복/직접 라우트 제거: 통합 및 결과 API는 모두 authRoutes에서 처리

// 프로필 조회 API
app.get('/api/auth/profile', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 직접 등록된 /api/auth/profile 호출됨, userId:', userId);
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      await prisma.$disconnect();
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 투표 참여 상세 정보 계산 (직접 구현)
    const fs = require('fs');
    const path = require('path');
    const voteDataPath = path.join(process.cwd(), 'voteData.json');
    
    let voteData = [];
    if (fs.existsSync(voteDataPath)) {
      const data = fs.readFileSync(voteDataPath, 'utf8');
      voteData = JSON.parse(data);
    }
    
    // 주간 투표 창(월 00:01 ~ 목 17:00) 계산 - 매주 동일 규칙
    const currentTime = new Date();
    const currentWeekStart = new Date(currentTime);
    // getDay(): 일0 월1 ... 토6 → 이번주 월요일로 이동
    const dow = currentWeekStart.getDay();
    const deltaToMonday = dow === 0 ? -6 : (1 - dow);
    currentWeekStart.setDate(currentWeekStart.getDate() + deltaToMonday);
    currentWeekStart.setHours(0, 1, 0, 0); // 월요일 00:01
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 3); // 목요일
    currentWeekEnd.setHours(17, 0, 0, 0); // 목요일 17:00
    
    // 현재 날짜가 목요일 17:00 이후라면 다음 주 투표 창으로 확장
    if (currentTime > currentWeekEnd) {
      // 다음 주 월요일부터 목요일까지로 확장
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);
    }
    
    // 활성 투표 세션 확인 (현재 주 또는 다음 주)
    const activeVoteSessions = new Set(voteData.map((vote: any) => vote.sessionId));
    const userVotes = voteData.filter((vote: any) => vote.userId === userId);
    
    // 사용자가 이번 주 투표 창 내에서 투표했는지 확인
    const recentUserVotes = userVotes.filter((vote: any) => {
      const voteDate = new Date(vote.timestamp);
      return voteDate >= currentWeekStart && voteDate < currentWeekEnd;
    });
    
    console.log('투표 데이터 계산:', {
      userId,
      totalVotes: voteData.length,
      userVotes: userVotes.length,
      recentUserVotes: recentUserVotes.length,
      activeSessions: Array.from(activeVoteSessions),
      weekRange: `${currentWeekStart.toISOString().split('T')[0]} ~ ${currentWeekEnd.toISOString().split('T')[0]}`
    });
    
    // 헤더 투표율 계산 - DB 기준으로 정확히 계산
    const prismaClient = new PrismaClient();
    const totalVoteSessions = await prismaClient.voteSession.count();
    const participatedSessions = await prismaClient.vote.count({ where: { userId } });
    
    // 세션 상세 정보 조회 (투표율 근거 제공)
    const allSessions = await prismaClient.voteSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: { votes: { where: { userId } } }
    });
    
    const sessionDetails = allSessions.map((session: any) => ({
      id: session.id,
      weekStartDate: session.weekStartDate,
      isActive: session.isActive,
      isCompleted: session.isCompleted,
      userParticipated: session.votes.length > 0,
      createdAt: session.createdAt
    }));
    
    const voteDetails = {
      total: totalVoteSessions,
      participated: participatedSessions,
      missed: Math.max(0, totalVoteSessions - participatedSessions),
      sessions: sessionDetails
    };
    
    // 디버그 로그 (전체 투표 세션 기준)
    console.log('전체 투표 세션 기준(DB):', { 
      totalVoteSessions, 
      participatedSessions,
      sessionDetails: sessionDetails.map((s: any) => ({
        id: s.id,
        weekStart: s.weekStartDate,
        participated: s.userParticipated,
        status: s.isActive ? 'active' : (s.isCompleted ? 'completed' : 'pending')
      }))
    });
    
    // 헤더 투표율: 전체 투표 세션 중 참여한 비율
    const voteAttendance = totalVoteSessions > 0 ? Math.round((participatedSessions / totalVoteSessions) * 100) : 0;
    
    // 경기 참여 상세 정보 계산 (확정된 경기만 분모로 사용)
    const allGames = await prisma.game.findMany({ where: { confirmed: true } });
    
    // 사용자의 실제 출석 기록 조회 (해당 경기도 확정된 것만 카운트)
    const attendanceRecords = await prisma.attendance.findMany({
      where: { userId: user.id },
      include: { game: true }
    });
    
    // 참여한 경기 수: 출석 YES 이면서 해당 경기가 확정된 경우만
    const participatedGames = attendanceRecords.filter(att => att.status === 'YES' && att.game?.confirmed).length;
    
    console.log('투표율 계산:', {
      total: voteDetails.total,
      participated: voteDetails.participated,
      voteAttendance
    });
    
    // 경기 참여 상세 정보 계산
    const gameDetails = {
      total: allGames.length,
      participated: participatedGames,
      missed: Math.max(0, allGames.length - participatedGames)
    };
    
    // 경기 참여율 계산
    const gameAttendance = gameDetails.total > 0 ? 
      Math.round((gameDetails.participated / gameDetails.total) * 100) : 0;
    
    console.log('경기 참여율 계산:', {
      totalGames: allGames.length,
      participatedGames,
      gameAttendance,
      attendanceRecords: attendanceRecords.length,
      userId: user.id
    });
    
    const profileData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      voteAttendance,
      attendance: gameAttendance,
      voteDetails,
      gameDetails
    };
    
    console.log('✅ 프로필 조회 성공:', profileData);
    res.json(profileData);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 프로필 조회 오류:', error);
    res.status(500).json({ error: '프로필을 가져오는 중 오류가 발생했습니다.' });
  }
});

// 투표 데이터 로드 함수
function loadVoteData() {
  try {
    const fs = require('fs');
    const path = require('path');
    const voteDataPath = path.join(process.cwd(), 'backend/voteData.json');
    
    console.log('투표 데이터 파일 경로:', voteDataPath);
    
    if (fs.existsSync(voteDataPath)) {
      const data = fs.readFileSync(voteDataPath, 'utf8');
      const parsedData = JSON.parse(data);
      console.log('투표 데이터 로드 성공:', parsedData.length, '개');
      return parsedData;
    } else {
      console.log('투표 데이터 파일이 존재하지 않음:', voteDataPath);
      return [];
    }
  } catch (error) {
    console.error('투표 데이터 파일 읽기 오류:', error);
    return [];
  }
}

// 투표 데이터 API
app.get('/api/votes', (req, res) => {
  try {
    console.log('🔍 투표 데이터 API 호출됨');
    const fs = require('fs');
    const path = require('path');
    const voteDataPath = path.join(process.cwd(), 'voteData.json');
    
    console.log('투표 데이터 파일 경로:', voteDataPath);
    
    if (fs.existsSync(voteDataPath)) {
      const data = fs.readFileSync(voteDataPath, 'utf8');
      const parsedData = JSON.parse(data);
      console.log('투표 데이터 로드 성공:', parsedData.length, '개');
      res.json(parsedData);
    } else {
      console.log('투표 데이터 파일이 존재하지 않음:', voteDataPath);
      res.json([]);
    }
  } catch (error) {
    console.error('투표 데이터 로드 오류:', error);
    res.status(500).json({ error: '투표 데이터를 불러올 수 없습니다.' });
  }
});

// 멤버 통계 API
app.get('/api/auth/members/stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 전체 멤버 수
    const totalMembers = await prisma.user.count({
      where: { status: 'ACTIVE' }
    });
    
    // 활성 멤버 수
    const activeMembers = await prisma.user.count({
      where: { status: 'ACTIVE' }
    });
    
    // 이번 주 경기 수
    const currentTime = new Date();
    const startOfWeek = new Date(currentTime);
    startOfWeek.setDate(currentTime.getDate() - currentTime.getDay() + 1); // 월요일
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 일요일
    
    const thisWeekGames = await prisma.game.count({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    });
    
    // 다음 주 투표 세션
    const nextWeekVote = await prisma.voteSession.findFirst({
      where: {
        isActive: true
      }
    });
    
    const stats = {
      totalMembers,
      activeMembers,
      thisWeekGames,
      nextWeekVote: nextWeekVote ? {
        id: nextWeekVote.id,
        weekStartDate: nextWeekVote.weekStartDate,
        endTime: nextWeekVote.endTime,
        isActive: nextWeekVote.isActive
      } : null
    };
    
    console.log('📊 멤버 통계 조회:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ 멤버 통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// 멤버 통계 API (admin 경로)
app.get('/api/auth/admin/member-stats', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 전체 멤버 수
    const totalMembers = await prisma.user.count({
      where: { status: 'ACTIVE' }
    });
    
    // 활성 멤버 수
    const activeMembers = await prisma.user.count({
      where: { status: 'ACTIVE' }
    });
    
    // 이번 주 경기 수
    const currentTime = new Date();
    const startOfWeek = new Date(currentTime);
    startOfWeek.setDate(currentTime.getDate() - currentTime.getDay() + 1); // 월요일
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 일요일
    
    const thisWeekGames = await prisma.game.count({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    });
    
    // 다음 주 투표 세션
    const nextWeekVote = await prisma.voteSession.findFirst({
      where: {
        isActive: true
      }
    });
    
    const stats = {
      totalMembers,
      activeMembers,
      thisWeekGames,
      nextWeekVote: nextWeekVote ? {
        id: nextWeekVote.id,
        weekStartDate: nextWeekVote.weekStartDate,
        endTime: nextWeekVote.endTime,
        isActive: nextWeekVote.isActive
      } : null
    };
    
    console.log('📊 멤버 통계 조회 (admin):', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ 멤버 통계 조회 오류 (admin):', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// 회원 추가 API (관리자용)
app.post('/api/auth/members', authenticateToken, async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;
    
    console.log('회원 추가 요청:', { name, email, role, status });
    
    // 필수 필드 검증
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' });
    }
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: '이메일 주소를 입력해주세요.' });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요.' });
    }
    
    // 이메일 중복 확인
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }
    
    // 비밀번호 해시화
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    
    // 새 회원 생성
    const newMember = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'MEMBER',
        status: status || 'ACTIVE'
      }
    });
    
    console.log('생성된 회원:', newMember);
    
    res.json({
      message: '회원이 성공적으로 추가되었습니다.',
      member: {
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        status: newMember.status,
        createdAt: newMember.createdAt
      }
    });
  } catch (error) {
    console.error('회원 추가 오류:', error);
    res.status(500).json({ error: '회원 추가 중 오류가 발생했습니다.' });
  }
});

// 투표 재설정 API (인증 필요)
app.delete('/api/votes/reset', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    
    console.log('🗑️ 투표 재설정 API 호출됨:', { userId });
    
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 투표 데이터 파일에서 해당 사용자의 투표 삭제
    const fs = require('fs');
    const path = require('path');
    const voteDataPath = path.join(process.cwd(), 'voteData.json');
    
    let voteData = [];
    if (fs.existsSync(voteDataPath)) {
      const data = fs.readFileSync(voteDataPath, 'utf8');
      voteData = JSON.parse(data);
    }
    
    // 해당 사용자의 투표 데이터 삭제
    const originalLength = voteData.length;
    voteData = voteData.filter(vote => vote.userId !== userId);
    const deletedCount = originalLength - voteData.length;
    
    // 파일에 저장
    fs.writeFileSync(voteDataPath, JSON.stringify(voteData, null, 2));
    
    console.log('✅ 투표 재설정 성공:', { userId, deletedCount });
    res.json({ message: '투표가 재설정되었습니다.', deletedCount });
    
  } catch (error) {
    console.error('❌ 투표 재설정 오류:', error);
    res.status(500).json({ error: '투표 재설정 중 오류가 발생했습니다.' });
  }
});

// 투표 제출 API (인증 필요) - 데이터베이스 저장
app.post('/api/votes', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { selectedDays, timestamp } = req.body;
    
    console.log('🗳️ 투표 제출 API 호출됨:', {
      userId,
      selectedDays,
      timestamp,
      userFromToken: (req as any).user
    });
    
    if (!userId) {
      console.log('❌ 투표 제출 실패: userId 없음');
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    if (!selectedDays || !Array.isArray(selectedDays)) {
      return res.status(400).json({ error: '선택된 날짜가 필요합니다.' });
    }
    
    console.log('🗳️ 투표 제출:', { userId, selectedDays, timestamp });
    
    const prismaClient = new PrismaClient();
    
    // 1. 현재 활성 투표 세션 찾기
    const activeSession = await prismaClient.voteSession.findFirst({
      where: {
        isActive: true,
        isCompleted: false
      }
    });
    
    if (!activeSession) {
      await prismaClient.$disconnect();
      return res.status(400).json({ error: '활성 투표 세션이 없습니다.' });
    }
    
    // 2. 기존 투표가 있는지 확인
    const existingVote = await prismaClient.vote.findFirst({
      where: {
        userId: userId,
        voteSessionId: activeSession.id
      }
    });
    
    let voteResult;
    if (existingVote) {
      // 기존 투표 업데이트
      voteResult = await prismaClient.vote.update({
        where: { id: existingVote.id },
        data: {
          selectedDays: JSON.stringify(selectedDays),
          updatedAt: new Date()
        }
      });
      console.log('✅ 기존 투표 업데이트:', voteResult);
    } else {
      // 새로운 투표 생성
      voteResult = await prismaClient.vote.create({
        data: {
          userId: userId,
          voteSessionId: activeSession.id,
          selectedDays: JSON.stringify(selectedDays),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ 새로운 투표 생성:', voteResult);
    }
    
    // 3. 파일에도 백업 저장 (호환성 유지)
    const fs = require('fs');
    const path = require('path');
    const voteDataPath = path.join(process.cwd(), 'voteData.json');
    
    let voteData = [];
    if (fs.existsSync(voteDataPath)) {
      const data = fs.readFileSync(voteDataPath, 'utf8');
      voteData = JSON.parse(data);
    }
    
    // 기존 투표 제거 후 새 투표 추가
    voteData = voteData.filter((vote: any) => vote.userId !== userId);
    voteData.push({
      id: voteResult.id,
      userId: userId,
      selectedDays: selectedDays,
      timestamp: voteResult.createdAt.toISOString(),
      sessionId: activeSession.id
    });
    
    fs.writeFileSync(voteDataPath, JSON.stringify(voteData, null, 2));
    
    await prismaClient.$disconnect();
    
    console.log('✅ 투표 데이터 저장 성공 (DB + 파일):', voteResult);
    res.json({ 
      message: '투표가 성공적으로 저장되었습니다.', 
      vote: {
        id: voteResult.id,
        userId: userId,
        selectedDays: selectedDays,
        sessionId: activeSession.id,
        isUpdate: !!existingVote
      }
    });
    
  } catch (error) {
    console.error('❌ 투표 제출 오류:', error);
    res.status(500).json({ error: '투표 제출 중 오류가 발생했습니다.' });
  }
});

console.log('긴급 수정: 직접 API 등록 완료');

// authRoutes 테스트
app.get('/api/auth-test', (req, res) => {
  res.json({ message: 'authRoutes 테스트 성공!', timestamp: new Date().toISOString() });
});
console.log('✅ authRoutes 테스트 라우트 등록 완료: /api/auth-test');

// 중복된 API 제거 - authRoutes에서 제공됨

// 중복된 회원 추가 API 제거 - authRoutes에서 제공됨

// 중복된 회원 수정 API 제거 - authRoutes에서 제공됨

// 중복된 회원 삭제 API 제거 - authRoutes에서 제공됨

// 중복된 비밀번호 초기화 API 제거 - authRoutes에서 제공됨

// 중복된 긴급 회원 관리 API 제거 - authRoutes에서 제공됨

// 주석 처리된 중복 API 제거됨

// 카카오맵 장소 검색 API는 auth_simple.ts의 router에서 처리됨 (중복 제거)

// 경기 관리 API
// 중복된 경기 생성 API 제거 - authRoutes에서 제공됨

// 게임 조회/수정/삭제는 authRoutes(auth_simple)에서만 처리 (중복 제거)

// 중복된 경기 삭제/자동생성 API 제거 - authRoutes에서 제공됨

// 중복된 경기 수정 API 제거 - authRoutes에서 제공됨

// 비밀번호 변경 API는 authController에서 처리

// 중복된 프로필 수정 API 제거 - authRoutes에서 제공됨

// 로그인 라우트 - authRoutes로 이동됨
// app.post('/api/auth/login', ...

// 자동화 기능 제거됨 - 수동 관리로 전환

// 자동화 기능 제거됨 - 수동 관리로 전환

// 대시보드 통계 API 추가
// 중복된 통계 API 제거 - authRoutes에서 제공됨

// 중복된 API 제거됨 - /api/auth/members로 통합

// 중복된 통합 API 제거 - authRoutes에서 제공됨

// 중복된 프로필 API 제거 - authRoutes에서 제공됨


// 투표 데이터 API
// 중복된 투표 데이터 API 제거 - authRoutes에서 제공됨

// 회원 상태 자동 체크 API (관리자)
// GET/POST ?dryRun=true 이면 변경 없이 대상만 미리보기
app.post('/api/admin/check-member-status', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const dryRun =
      req.query.dryRun === 'true' ||
      req.query.dryRun === '1' ||
      req.body?.dryRun === true;

    const result = await checkMemberStatusRules({ dryRun });
    
    res.json({
      message: dryRun
        ? '회원 상태 체크 미리보기가 완료되었습니다. (변경 없음)'
        : '회원 상태 체크가 완료되었습니다.',
      ...result,
    });
  } catch (error) {
    console.error('회원 상태 체크 API 오류:', error);
    res.status(500).json({ error: '회원 상태 체크 중 오류가 발생했습니다.' });
  }
});
console.log('✅ 회원 상태 체크 API 등록 완료: /api/admin/check-member-status');


// 간단한 테스트 API
app.get('/api/test', (req, res) => {
  res.json({ message: '테스트 API가 작동합니다!', timestamp: new Date().toISOString() });
});
console.log('✅ 테스트 API 등록 완료: /api/test');

// 로그인 API 직접 구현
// 중복된 로그인/회원가입 API 제거 - authRoutes에서 제공됨

// 매일 09:00 KST — 투표·경기·로그인 기준 회원 상태 자동 반영
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🕘 [cron] 회원 상태 자동 체크 시작 (매일 09:00 KST)');
    const result = await checkMemberStatusRules({ dryRun: false });
    console.log('🕘 [cron] 회원 상태 자동 체크 결과:', {
      checked: result.checked,
      changed: result.changed,
      success: result.success,
    });
  } catch (error) {
    console.error('❌ [cron] 회원 상태 자동 체크 오류:', error);
  }
}, {
  timezone: 'Asia/Seoul'
});
console.log('✅ 회원 상태 자동 체크 스케줄러 설정 완료: 매일 오전 9시 (Asia/Seoul)');

type GameReminderRunOptions = {
  dryRun?: boolean;
  targetOffsetDays?: 0 | 1;
  force?: boolean;
};

function getGameWeekdayKey(date: Date): WeekdayKey | null {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const keys: Array<WeekdayKey | null> = [null, 'MON', 'TUE', 'WED', 'THU', 'FRI', null];
  return keys[kstDate.getDay()];
}

function getGameWeekStartRange(date: Date) {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const dayOfWeek = kstDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(kstDate);
  monday.setDate(kstDate.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);

  // 레거시 데이터의 UTC/KST 저장 차이를 흡수하되 다른 주차까지 포함하지 않는다.
  const rangeStart = new Date(monday);
  rangeStart.setHours(rangeStart.getHours() - 12);
  const rangeEnd = new Date(monday);
  rangeEnd.setHours(rangeEnd.getHours() + 36);
  return { rangeStart, rangeEnd };
}

async function getConfirmedGameVoters(game: { id: number; date: Date }) {
  const gameDayKey = getGameWeekdayKey(new Date(game.date));
  if (!gameDayKey) {
    return { voteSessionId: null as number | null, recipients: [] as Array<{ id: number; name: string; email: string }> };
  }

  const sessionInclude = {
    votes: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        }
      }
    }
  } as const;

  let voteSession = await prisma.voteSession.findFirst({
    where: { gameId: game.id },
    orderBy: { id: 'desc' },
    include: sessionInclude
  });

  if (!voteSession) {
    const { rangeStart, rangeEnd } = getGameWeekStartRange(new Date(game.date));
    voteSession = await prisma.voteSession.findFirst({
      where: {
        weekStartDate: {
          gte: rangeStart,
          lt: rangeEnd
        }
      },
      orderBy: { id: 'desc' },
      include: sessionInclude
    });
  }

  if (!voteSession) {
    return { voteSessionId: null as number | null, recipients: [] as Array<{ id: number; name: string; email: string }> };
  }

  const recipientsById = new Map<number, { id: number; name: string; email: string }>();
  for (const vote of voteSession.votes) {
    const selectedConfirmedDate = parseVoteDays(vote.selectedDays).some(
      (day) => voteDayToMonFriAbsentKeyForSession(day, new Date(voteSession.weekStartDate)) === gameDayKey
    );
    const email = vote.user.email?.trim();
    if (selectedConfirmedDate && vote.user.status === 'ACTIVE' && email) {
      recipientsById.set(vote.user.id, {
        id: vote.user.id,
        name: vote.user.name,
        email
      });
    }
  }

  return {
    voteSessionId: voteSession.id,
    recipients: [...recipientsById.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  };
}

async function sendAutoGameReminderEmails(options: GameReminderRunOptions = {}) {
  const enabled = (process.env.AUTO_GAME_REMINDER_ENABLED ?? 'true') === 'true';
  if (!enabled && !options.force) {
    return { success: true, skipped: true, reason: 'disabled' };
  }

  const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const currentHour = nowKST.getHours();
  const targetOffsetDays = options.targetOffsetDays ?? (currentHour === 15 ? 1 : 0);
  const targetDate = new Date(nowKST);
  targetDate.setDate(nowKST.getDate() + targetOffsetDays);
  targetDate.setHours(0, 0, 0, 0);

  const endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);

  const games = await prisma.game.findMany({
    where: {
      date: { gte: targetDate, lte: endDate },
      confirmed: true
    },
    orderBy: { date: 'asc' }
  });

  if (games.length === 0) {
    console.log('ℹ️ 자동 경기 알림 대상 경기 없음:', targetDate.toISOString().split('T')[0]);
    return {
      success: true,
      skipped: true,
      reason: 'no-confirmed-games',
      targetDate: getKstDateKey(targetDate)
    };
  }

  const gameTargets = await Promise.all(
    games.map(async (game) => ({
      game,
      ...(await getConfirmedGameVoters(game))
    }))
  );
  const recipientCount = gameTargets.reduce((sum, target) => sum + target.recipients.length, 0);
  const mailConfig = getMailConfigurationStatus();

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      targetDate: getKstDateKey(targetDate),
      mode: targetOffsetDays === 1 ? 'day-before' : 'day-of',
      mailConfigured: mailConfig.configured,
      confirmedGames: games.length,
      recipientDeliveries: recipientCount,
      games: gameTargets.map((target) => ({
        gameId: target.game.id,
        voteSessionId: target.voteSessionId,
        recipients: target.recipients.length
      }))
    };
  }

  if (!mailConfig.configured) {
    console.log('ℹ️ 자동 경기 알림 스킵: Gmail 설정 누락');
    return {
      success: false,
      skipped: true,
      reason: 'gmail-not-configured',
      recipientDeliveries: recipientCount
    };
  }

  if (recipientCount === 0) {
    console.log('ℹ️ 자동 경기 알림 수신자 없음: 확정 경기 날짜를 선택한 활성 투표자 없음');
    return {
      success: true,
      skipped: true,
      reason: 'no-confirmed-date-voters',
      confirmedGames: games.length
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  let alreadySentCount = 0;
  let lastTransport = 'none';
  const reminderType = targetOffsetDays === 1 ? 'DAY_BEFORE' : 'DAY_OF';

  for (const { game, recipients } of gameTargets) {
    const date = new Date(game.date);
    const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    const formattedDate = `${date.getMonth() + 1}월 ${date.getDate()}일(${dayName})`;
    const subjectPrefix = targetOffsetDays === 1 ? '⚽ 내일 경기 알림' : '⚽ 오늘 경기 알림';
    const subject = `${subjectPrefix} - ${formattedDate}`;
    const text = [
      `${subjectPrefix}`,
      '',
      `날짜: ${formattedDate}`,
      `시간: ${game.time || '미정'}`,
      `장소: ${game.location || '미정'}`,
      `유형: ${game.eventType || '미정'}`
    ].join('\n');

    for (const recipient of recipients) {
      const deliveryKey = `GAME_REMINDER:${reminderType}:GAME:${game.id}:USER:${recipient.id}`;
      // TODO: findUnique→upsert 대신 create+P2002 catch로 교체하면 나노초 동시 호출도 완전 안전
      const previous = await prisma.notificationDelivery.findUnique({
        where: { deliveryKey },
        select: { status: true }
      });

      if (previous?.status === 'SENT' || previous?.status === 'PENDING') {
        alreadySentCount++;
        continue;
      }

      await prisma.notificationDelivery.upsert({
        where: { deliveryKey },
        create: {
          deliveryKey,
          type: `GAME_REMINDER_${reminderType}`,
          status: 'PENDING',
          recipientId: recipient.id,
          recipientEmail: recipient.email
        },
        update: {
          status: 'PENDING',
          recipientEmail: recipient.email,
          error: null
        }
      });

      try {
        const mailResult = await sendMail({
          to: recipient.email,
          subject,
          text
        });
        lastTransport = mailResult.mode;
        await prisma.notificationDelivery.update({
          where: { deliveryKey },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            error: null
          }
        });
        sentCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await prisma.notificationDelivery.update({
          where: { deliveryKey },
          data: {
            status: 'FAILED',
            error: errorMessage
          }
        });
        failedCount++;
        console.error('❌ 자동 경기 알림 개별 발송 실패:', {
          gameId: game.id,
          recipientId: recipient.id,
          error: errorMessage
        });
      }
    }
  }

  console.log('✅ 자동 경기 알림 발송 완료:', {
    games: games.length,
    recipients: recipientCount,
    sentCount,
    failedCount,
    alreadySentCount,
    mode: targetOffsetDays === 1 ? 'day-before' : 'day-of'
  });

  return {
    success: failedCount === 0,
    games: games.length,
    recipients: recipientCount,
    sentCount,
    failedCount,
    alreadySentCount,
    mode: targetOffsetDays === 1 ? 'day-before' : 'day-of',
    transport: lastTransport
  };
}

function escapeEmailHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatKoreanDateTime(value: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

type VoteReminderRunOptions = {
  dryRun?: boolean;
  force?: boolean;
};

async function sendAutomaticVoteReminderEmails(options: VoteReminderRunOptions = {}) {
  const enabled = (process.env.AUTO_VOTE_REMINDER_ENABLED ?? 'true') === 'true';
  if (!enabled && !options.force) {
    return { success: true, skipped: true, reason: 'disabled' };
  }

  const kstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const isScheduledWindow = [1, 2, 3, 4].includes(kstNow.getDay()) && kstNow.getHours() === 10;
  if (!isScheduledWindow && !options.force) {
    return { success: true, skipped: true, reason: 'outside-schedule-window' };
  }

  const activeSession = await prisma.voteSession.findFirst({
    where: { isActive: true, isCompleted: false },
    orderBy: { id: 'desc' },
    include: {
      votes: {
        select: { userId: true }
      }
    }
  });

  if (!activeSession) {
    return { success: true, skipped: true, reason: 'no-active-vote-session' };
  }

  const votedUserIds = new Set(activeSession.votes.map((vote) => vote.userId));
  const activeMembers = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      email: { not: '' }
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    orderBy: { name: 'asc' }
  });

  const recipients = activeMembers.filter((member) =>
    Boolean(member.email?.trim()) && !votedUserIds.has(member.id)
  );

  if (options.dryRun) {
    return {
      success: true,
      dryRun: true,
      sessionId: activeSession.id,
      activeMembers: activeMembers.length,
      votedMembers: votedUserIds.size,
      recipients: recipients.length
    };
  }

  const mailConfig = getMailConfigurationStatus();
  if (!mailConfig.configured) {
    return {
      success: false,
      skipped: true,
      reason: 'gmail-not-configured',
      recipients: recipients.length
    };
  }

  if (recipients.length === 0) {
    return {
      success: true,
      skipped: true,
      reason: 'no-non-voters',
      sessionId: activeSession.id,
      recipients: 0
    };
  }

  const targetStart = new Date(activeSession.weekStartDate);
  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetEnd.getDate() + 4);
  const frontendUrl = (process.env.FRONTEND_URL || 'https://fccg-inoi.vercel.app').replace(/\/$/, '');
  const scheduleUrl = `${frontendUrl}/schedule-v2?utm=vote_email`;
  const targetPeriod = `${targetStart.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} ~ ${targetEnd.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
  const deadline = formatKoreanDateTime(new Date(activeSession.endTime));

  let sentCount = 0;
  let failedCount = 0;
  let alreadySentCount = 0;
  let lastTransport = 'none';

  for (const recipient of recipients) {
    const deliveryKey = `VOTE_REMINDER:${activeSession.id}:USER:${recipient.id}:DATE:${getKstDateKey(new Date())}`;
    // TODO: findUnique→upsert 대신 create+P2002 catch로 교체하면 나노초 동시 호출도 완전 안전
    const previous = await prisma.notificationDelivery.findUnique({
      where: { deliveryKey },
      select: { status: true }
    });

    if (previous?.status === 'SENT' || previous?.status === 'PENDING') {
      alreadySentCount++;
      continue;
    }

    await prisma.notificationDelivery.upsert({
      where: { deliveryKey },
      create: {
        deliveryKey,
        type: 'VOTE_REMINDER',
        status: 'PENDING',
        recipientId: recipient.id
      },
      update: {
        status: 'PENDING',
        error: null
      }
    });

    const safeName = escapeEmailHtml(recipient.name);
    const text = [
      `${recipient.name}님, 다음 경기 일정 투표에 참여해주세요.`,
      '',
      `대상 일정: ${targetPeriod}`,
      `투표 마감: ${deadline}`,
      `현재 참여: ${votedUserIds.size}/${activeMembers.length}명`,
      '',
      scheduleUrl
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A1118;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A1118;padding:24px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0F1923;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">

      <!-- HEADER -->
      <tr><td style="padding:24px 32px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:800;letter-spacing:0.12em;color:#C8F135;">⚽ FC찰껴</td>
            <td align="right" style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#3A4E60;">Vote Reminder</td>
          </tr>
        </table>
      </td></tr>

      <!-- HERO -->
      <tr><td style="padding:22px 32px 18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#C8F135;margin-bottom:8px;">투표 미참여 안내</div>
        <div style="font-size:28px;font-weight:900;letter-spacing:-0.02em;color:#fff;line-height:1.15;margin-bottom:4px;">${safeName}님,<br>아직 투표를 안 하셨어요</div>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#1F2D3A;"></div></td></tr>

      <!-- INFO GRID -->
      <tr><td style="padding:20px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid #1A2535;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#3A4E60;margin-bottom:4px;">대상 일정</div>
              <div style="font-size:14px;font-weight:700;color:#E8ECF0;">${escapeEmailHtml(targetPeriod)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #1A2535;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#3A4E60;margin-bottom:4px;">투표 마감</div>
              <div style="font-size:14px;font-weight:700;color:#C8F135;">${escapeEmailHtml(deadline)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#3A4E60;margin-bottom:4px;">현재 참여</div>
              <div style="font-size:22px;font-weight:900;color:#C8F135;letter-spacing:-0.02em;">${votedUserIds.size}<span style="font-size:13px;font-weight:600;color:#4A6070;margin:0 2px;">/</span>${activeMembers.length}<span style="font-size:13px;font-weight:600;color:#4A6070;margin-left:3px;">명</span></div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:4px 32px 28px;">
        <a href="${escapeEmailHtml(scheduleUrl)}" style="display:block;background:#C8F135;color:#0A1018;text-decoration:none;text-align:center;font-size:13px;font-weight:800;letter-spacing:0.08em;padding:14px 18px;border-radius:6px;">투표하러 가기 →</a>
        <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#2A3F52;text-align:center;">이미 투표했다면 이 메일과 발송 시점이 엇갈린 경우입니다.</p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#080F17;padding:14px 32px;border-top:1px solid #111B26;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:11px;color:#2A3F52;">수신거부</td>
            <td align="right" style="font-size:11px;color:#2A3F52;">FC찰껴 · 자동발송</td>
          </tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

    try {
      const mailResult = await sendMail({
        to: recipient.email,
        subject: '🗳️ FC찰껴 투표 참여 안내',
        text,
        html
      });
      lastTransport = mailResult.mode;
      await prisma.notificationDelivery.update({
        where: { deliveryKey },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          error: null
        }
      });
      sentCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.notificationDelivery.update({
        where: { deliveryKey },
        data: {
          status: 'FAILED',
          error: message.slice(0, 1000)
        }
      });
      failedCount++;
    }
  }

  return {
    success: failedCount === 0,
    sessionId: activeSession.id,
    recipients: recipients.length,
    sentCount,
    failedCount,
    alreadySentCount,
    transport: lastTransport
  };
}

// 매주 월요일 00:01 자동 작업 함수 (재사용 가능)
async function runWeeklyScheduler() {
  try {
    console.log('🔄 매주 월요일 00:01 자동 작업 시작...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // 현재 시간 (한국시간 기준)
    const currentTime = new Date();
    const koreaTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    
    // 1. 다음주 월요일 계산 (다음주 투표 세션 생성용)
    // 오늘이 월요일이면 7일 후가 다음 주 월요일, 다른 요일이면 다음 월요일까지의 일수를 계산
    const today = new Date(koreaTime);
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    
    // 이번주 월요일 계산
    let daysUntilThisMonday;
    if (dayOfWeek === 0) {
      daysUntilThisMonday = -6;
    } else if (dayOfWeek === 1) {
      daysUntilThisMonday = 0;
    } else {
      daysUntilThisMonday = 1 - dayOfWeek;
    }
    
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() + daysUntilThisMonday);
    thisWeekMonday.setHours(0, 0, 0, 0);
    
    // 다음주 월요일 계산 (이번주 월요일 기준 +7일)
    const daysUntilNextMonday = 7;
    const nextWeekMonday = new Date(thisWeekMonday);
    nextWeekMonday.setDate(thisWeekMonday.getDate() + daysUntilNextMonday);
    nextWeekMonday.setHours(0, 0, 0, 0); // weekStartDate는 00:00
    
    console.log('📅 다음주 월요일 계산:', {
      오늘: today.toLocaleDateString('ko-KR'),
      오늘요일: ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek],
      다음주월요일: nextWeekMonday.toLocaleDateString('ko-KR'),
      일수차이: daysUntilNextMonday
    });
    
    // 세션 마감은 대상 주차 직전 일요일 23:59
    const nextWeekDeadline = getVoteSessionSundayDeadline(nextWeekMonday);
    
    // 의견수렴기간 시작일은 이번주 월요일 00:01
    thisWeekMonday.setHours(0, 1, 0, 0);
    
    // 중복 체크 - 정확한 주간(월요일) 비교
    // 같은 주의 월요일인지 확인 (주간을 고유하게 식별)
    const targetWeekKey = getKstDateKey(nextWeekMonday);
    const aroundStart = new Date(nextWeekMonday.getTime() - 36 * 60 * 60 * 1000);
    const aroundEnd = new Date(nextWeekMonday.getTime() + 36 * 60 * 60 * 1000);
    const existingCandidates = await prisma.voteSession.findMany({
      where: {
        weekStartDate: {
          gte: aroundStart,
          lte: aroundEnd
        }
      },
      orderBy: { id: 'desc' }
    });
    const existingSession = existingCandidates.find((s) => getKstDateKey(new Date(s.weekStartDate)) === targetWeekKey) || null;
    
    const activeSession = await prisma.voteSession.findFirst({
      where: { isActive: true, isCompleted: false },
      orderBy: { id: 'desc' }
    });
    let newVoteSession = null;
    
    // 다음주 세션이 없고, 오늘이 월요일 00:01 이후인 경우에만 생성
    if (!existingSession && dayOfWeek === 1) {
      // 월요일 00:01 이후인지 확인
      const currentHour = koreaTime.getHours();
      const currentMinute = koreaTime.getMinutes();
      
      if (currentHour > 0 || (currentHour === 0 && currentMinute >= 1)) {
        // 다음주 투표 세션 생성
        newVoteSession = await prisma.voteSession.create({
          data: {
            weekStartDate: nextWeekMonday,
            startTime: thisWeekMonday,
            endTime: nextWeekDeadline,
            isActive: !activeSession,
            isCompleted: false
          }
        });
        console.log('✅ 다음주 투표 세션 자동 생성 완료:', {
          세션ID: newVoteSession.id,
          투표기간: `${nextWeekMonday.toLocaleDateString('ko-KR')} 대상 / 마감 ${nextWeekDeadline.toLocaleString('ko-KR')}`,
          의견수렴기간시작: `${thisWeekMonday.toLocaleDateString('ko-KR')} 00:01`,
          의견수렴기간마감: `${nextWeekDeadline.toLocaleString('ko-KR')} 또는 관리자 수동 마감`
        });
      }
    } else if (existingSession) {
      console.log('⚠️ 이미 해당 주간의 투표 세션이 존재합니다:', {
        기존세션ID: existingSession.id,
        기존세션투표기간: existingSession.weekStartDate.toLocaleDateString('ko-KR'),
        생성하려던세션투표기간: nextWeekMonday.toLocaleDateString('ko-KR')
      });
    } else {
      console.log('ℹ️ 오늘이 월요일이 아니므로 세션을 생성하지 않습니다. (현재 요일:', ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek], ')');
    }
    
    // 2. 지난주 투표결과를 이번주 일정에 반영 (자동생성 경기 생성)
    const lastWeekMonday = new Date(thisWeekMonday);
    lastWeekMonday.setDate(thisWeekMonday.getDate() - 7);
    const lastWeekFriday = new Date(lastWeekMonday);
    lastWeekFriday.setDate(lastWeekMonday.getDate() + 4);
    lastWeekFriday.setHours(23, 59, 59, 999);
    
    // 지난주 완료된 세션 찾기
    const lastWeekSession = await prisma.voteSession.findFirst({
      where: {
        isCompleted: true,
        weekStartDate: {
          gte: lastWeekMonday,
          lte: lastWeekFriday
        },
        votes: { some: {} }
      },
      include: {
        votes: {
          include: { user: { select: { name: true, status: true } } }
        }
      },
      orderBy: { weekStartDate: 'desc' }
    });
    
    let gamesCreatedCount = 0;
    
    if (lastWeekSession && lastWeekSession.votes.length > 0) {
      const weekStart = new Date(lastWeekSession.weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // 기존 자동생성일정 정리
      const deleted = await prisma.game.deleteMany({
        where: {
          autoGenerated: true,
          date: { gte: weekStart, lte: weekEnd }
        }
      });
      console.log('🧹 지난주 자동생성일정 정리:', deleted.count, '개 삭제');
      
      const { counts, participantsByDay } = aggregateVotesByWeekday(
        lastWeekSession.votes,
        new Date(lastWeekSession.weekStartDate)
      );
      
      const max = Math.max(...Object.values(counts));
      
      if (max > 0) {
        const topDays = (Object.keys(counts) as WeekdayKey[]).filter((k) => counts[k] === max);
        gamesCreatedCount = topDays.length;
        const dayOffset: Record<WeekdayKey, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
        const creatorId = lastWeekSession.votes[0]?.userId ?? 1;
        
        for (const day of topDays) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + dayOffset[day]);
          date.setHours(0, 1, 0, 0);
          
          await prisma.game.create({
            data: {
              date,
              time: '미정',
              location: '미정',
              eventType: '미정',
              gameType: '미정',
              mercenaryCount: 0,
              memberNames: '[]',
              selectedMembers: JSON.stringify(participantsByDay[day] || []),
              autoGenerated: true,
              confirmed: false,
              createdById: creatorId
            }
          });
          console.log('✅ 지난주 투표결과 반영 자동생성일정:', day, date.toISOString().split('T')[0]);
        }
      }
    } else {
      console.log('ℹ️ 지난주 완료된 투표 세션이 없습니다.');
    }
    
    const result = {
      success: true,
      message: '자동 작업이 성공적으로 완료되었습니다.',
      sessionCreated: !existingSession,
      sessionId: existingSession ? existingSession.id : (newVoteSession ? newVoteSession.id : null),
      gamesCreated: gamesCreatedCount
    };
    
    await prisma.$disconnect();
    console.log('✅ 매주 월요일 00:01 자동 작업 완료');
    
    return result;
  } catch (error) {
    console.error('❌ 매주 월요일 자동 작업 오류:', error);
    await prisma.$disconnect().catch(() => {});
    return {
      success: false,
      message: '자동 작업 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// 매주 월요일 00:01 자동 작업 스케줄러
cron.schedule('1 0 * * 1', async () => {
  await runWeeklyScheduler();
}, {
  timezone: 'Asia/Seoul'
});

console.log('✅ 매주 월요일 00:01 자동 작업 스케줄러 설정 완료');

// 매시간 투표 마감·자동경기 반영 (요청이 없을 때도 만료 세션 처리)
cron.schedule('15 * * * *', async () => {
  try {
    const { validateAndFixSessionState } = await import('./utils/voteSessionManager');
    await validateAndFixSessionState();
  } catch (e) {
    console.error('⏰ 투표세션 자동 검증 오류:', e);
  }
}, {
  timezone: 'Asia/Seoul'
});
console.log('✅ 매시간 투표세션 검증 스케줄러 설정 완료 (매시 15분 KST)');

// 경기 자동 알림 (한국시간 기준): 매일 오전 10시 — 당일·전날 경기 참가자에게 발송
cron.schedule('0 10 * * *', async () => {
  try {
    await Promise.all([
      sendAutoGameReminderEmails({ targetOffsetDays: 0 }),
      sendAutoGameReminderEmails({ targetOffsetDays: 1 })
    ]);
  } catch (error) {
    console.error('❌ 자동 경기 알림 발송 오류:', error);
  }
}, {
  timezone: 'Asia/Seoul'
});

console.log('✅ 자동 경기 알림 스케줄러 설정 완료 (10:00 KST, 당일·전날 경기 참가자 대상)');

// 월~목 10시 1회 — 투표하지 않은 회원에게만 발송
// 수신자별 발송 기록을 DB에 저장하므로 서버 재시작/중복 실행에도 한 번만 전송된다.
cron.schedule('0 10 * * 1-4', async () => {
  try {
    const result = await sendAutomaticVoteReminderEmails();
    if (!result.skipped) {
      console.log('✅ 자동 투표 독려 메일 처리 완료:', result);
    }
  } catch (error) {
    console.error('❌ 자동 투표 독려 메일 처리 오류:', error);
  }
}, {
  timezone: 'Asia/Seoul'
});

console.log('✅ 자동 투표 독려 메일 스케줄러 설정 완료 (월~목 10:00 KST, 미투표자 대상)');

function isAuthorizedCronRequest(req: express.Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const authorization = req.headers.authorization;
  const provided = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : String(req.headers['x-cron-secret'] || '');

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer);
}

// 무료 Render가 유휴 상태에서 내려가더라도 외부 스케줄러가 깨울 수 있는 전용 경로.
// CRON_SECRET이 일치할 때만 실행하며, 수신자별 DB 기록으로 중복 발송을 차단한다.
app.post('/api/cron/vote-reminder', async (req, res) => {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: '유효하지 않은 스케줄러 인증입니다.' });
  }

  try {
    const dryRun = req.body?.dryRun === true;
    const result = await sendAutomaticVoteReminderEmails({ dryRun, force: true });
    return res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    console.error('❌ 외부 스케줄러 투표 독려 메일 오류:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 경기 알림 외부 스케줄러 전용 경로.
// - 자동 실행(schedule): targetOffsetDays 없음 → 오늘+내일 동시 처리 (force=true)
// - 수동 dryRun(workflow_dispatch): targetOffsetDays=0(today) 또는 1(tomorrow) → 해당 일만 dryRun
app.post('/api/cron/game-reminder', async (req, res) => {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: '유효하지 않은 스케줄러 인증입니다.' });
  }

  try {
    const dryRun = req.body?.dryRun === true;
    const rawOffset = req.body?.targetOffsetDays;

    if (rawOffset === 0 || rawOffset === 1) {
      // 수동 dryRun: 지정된 날만 처리
      const result = await sendAutoGameReminderEmails({ dryRun, targetOffsetDays: rawOffset, force: true });
      return res.status(result?.success ? 200 : 503).json(result);
    }

    // 자동 실행: 오늘·내일 동시 처리
    const [todayResult, tomorrowResult] = await Promise.all([
      sendAutoGameReminderEmails({ dryRun, targetOffsetDays: 0, force: true }),
      sendAutoGameReminderEmails({ dryRun, targetOffsetDays: 1, force: true })
    ]);
    const success = (todayResult?.success ?? true) && (tomorrowResult?.success ?? true);
    return res.status(success ? 200 : 503).json({ today: todayResult, tomorrow: tomorrowResult });
  } catch (error) {
    console.error('❌ 외부 스케줄러 경기 알림 오류:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/api/admin/mail-status', authenticateToken, (req: any, res) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }

  const mailConfig = getMailConfigurationStatus();
  return res.json({
    ...mailConfig,
    gameReminderEnabled: (process.env.AUTO_GAME_REMINDER_ENABLED ?? 'true') === 'true',
    voteReminderEnabled: (process.env.AUTO_VOTE_REMINDER_ENABLED ?? 'true') === 'true',
    schedules: {
      gameReminder: 'GitHub Actions 매일 10:07 KST — 오늘·내일 경기 각 1회',
      voteReminder: 'GitHub Actions 월~목 10:17 KST — 미투표 활성 회원에게 하루 1회'
    },
    gameReminderRecipients: '확정 경기 날짜를 선택한 활성 투표자',
    recommendedTransport: 'Gmail API (HTTPS)'
  });
});

app.post('/api/admin/run-vote-reminder', authenticateToken, async (req: any, res) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }

  try {
    const dryRun = req.body?.dryRun !== false;
    const result = await sendAutomaticVoteReminderEmails({ dryRun, force: true });
    return res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    console.error('❌ 투표 독려 메일 수동 실행 오류:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 일회성 실행 코드 제거 - 월요일 00:01 cron 스케줄러만 사용

// 수동 실행 API (테스트용)
app.post('/api/admin/run-weekly-scheduler', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 관리자 권한 확인
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    console.log('🔧 수동 실행 요청됨 - 매주 월요일 자동 작업');
    const result = await runWeeklyScheduler();
    
    res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      details: result
    });
  } catch (error) {
    console.error('❌ 수동 실행 오류:', error);
    res.status(500).json({
      success: false,
      error: '수동 실행 중 오류가 발생했습니다.',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// 중복된 경기 수정/삭제 API 제거됨 (auth_simple 사용)

// 루트 경로 - Render 헬스체크용
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'FC CHALGGYEO API 서버 동작 중',
    timestamp: new Date().toISOString()
  });
});

// 중복 세션 자동 정리 함수 (서버 시작 시 실행)
async function cleanupDuplicateSessionsOnStartup() {
  try {
    console.log('🔄 서버 시작 시 중복 세션 정리 시작...');
    const sessions = await prisma.voteSession.findMany({
      include: { _count: { select: { votes: true } } },
      orderBy: { id: 'desc' }
    });
    if (sessions.length === 0) {
      console.log('✅ 정리할 세션이 없습니다.');
      return;
    }
    const sessionsByWeek = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const weekKey = getKstDateKey(new Date(session.weekStartDate));
      if (!sessionsByWeek.has(weekKey)) sessionsByWeek.set(weekKey, []);
      sessionsByWeek.get(weekKey)!.push(session);
    }

    let deletedCount = 0;
    for (const [weekKey, weekSessions] of sessionsByWeek) {
      if (weekSessions.length > 1) {
        // 투표 데이터가 있는 세션을 우선 보존하여 마감 직후 리셋처럼 보이는 문제를 방지
        weekSessions.sort((a, b) => {
          const voteDiff = (b._count?.votes || 0) - (a._count?.votes || 0);
          if (voteDiff !== 0) return voteDiff;
          const activeDiff = Number(b.isActive) - Number(a.isActive);
          if (activeDiff !== 0) return activeDiff;
          return b.id - a.id;
        });
        const keepSession = weekSessions[0];
        const deleteSessions = weekSessions.slice(1);
        console.log(`📋 주간 ${weekKey}: ${weekSessions.length}개 중 세션 ${keepSession.id} 보존`);

        for (const session of deleteSessions) {
          await prisma.vote.deleteMany({
            where: { voteSessionId: session.id }
          });
          
          await prisma.voteSession.delete({
            where: { id: session.id }
          });
          
          deletedCount++;
        }
      }
    }
    console.log(deletedCount > 0 ? `✅ 중복 세션 ${deletedCount}개 삭제 완료` : '✅ 중복 세션이 없습니다.');
  } catch (error) {
    console.error('❌ 중복 세션 정리 중 오류:', error);
    // 오류가 발생해도 서버는 계속 실행되도록 함
  }
}

// 서버 시작 시 중복 세션 정리 실행
cleanupDuplicateSessionsOnStartup().catch(err => {
  console.error('❌ 서버 시작 시 중복 세션 정리 오류:', err);
});

app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중`);
});
