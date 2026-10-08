import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Flex, Text, Button, HStack, Modal, ModalOverlay, ModalContent, ModalBody, useDisclosure, Box, useToast, Tooltip, IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton, VStack, StackDivider, useBreakpointValue } from '@chakra-ui/react';
import { CalendarIcon, ViewIcon, SettingsIcon, AttachmentIcon, ExternalLinkIcon, InfoIcon, HamburgerIcon } from '@chakra-ui/icons';
import { useAuthStore } from '../store/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import eventBus, { EVENT_TYPES } from '../utils/eventBus';
import { API_ENDPOINTS } from '../constants';
import ManualModal from './ManualModal';
import { getApiBaseUrl } from '../config/api';
import PlayerPassportPanel from './profile/PlayerPassportPanel';
import { Button as AppButton } from './common';
import { Z_INDEX, COLORS, MOTION } from '../constants/designTokens';

const Signup = lazy(() => import('../pages/Signup'));
const Login = lazy(() => import('../pages/Login'));

type NavItem = {
  label: string;
  path: string;
  icon: React.ElementType;
};

export default function Header() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);
  const [showSignup, setShowSignup] = useState(false);
  const attendance = user?.attendance ?? null;
  const voteAttendance = user?.voteAttendance ?? null;
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const memberManual = useDisclosure();
  const mobileNav = useDisclosure();
  const playerPassport = useDisclosure();
  // 데스크톱 nav는 lg(992px)부터. 그보다 좁으면(태블릿 포함) 햄버거 메뉴를 쓴다 — 800px 전후 로고/nav/계정 영역 충돌 방지.
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const navItems: NavItem[] = [
    { label: '일정', path: '/schedule-v2', icon: CalendarIcon },
    { label: '사진', path: '/gallery/photos', icon: AttachmentIcon },
    { label: '동영상', path: '/gallery/videos', icon: ExternalLinkIcon }
  ];

  const adminItem: NavItem = { label: '관리자', path: '/admin', icon: SettingsIcon };
  const availableNavItems = [...navItems];
  if (user?.role === 'ADMIN' || user?.email === 'sti60val@gmail.com') {
    availableNavItems.push(adminItem);
  }

  const handleNavigate = (path: string) => {
    if (path === '/admin') {
      try {
        navigate('/admin');
        setTimeout(() => {
          if (window.location.pathname !== '/admin') {
            window.location.href = '/admin';
          }
        }, 500);
      } catch (error) {
        console.error('🔍 관리자 navigate 에러:', error);
        window.location.href = '/admin';
      }
    } else if (path === '/') {
      try {
        navigate('/');
        setTimeout(() => {
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }, 500);
      } catch (error) {
        console.error('🔍 홈 navigate 에러:', error);
        window.location.href = '/';
      }
    } else {
      navigate(path);
    }
    if (isMobile) {
      mobileNav.onClose();
    }
  };

  // 사용자 데이터 새로고침 함수
  const refreshUserData = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      console.log('🔄 헤더: 사용자 데이터 새로고침 시작');

      // API BASE URL 가져오기 (환경별 자동 감지)
      const baseUrl = await getApiBaseUrl();

      // 캐시를 무시하고 강제로 새로고침
      const response = await fetch(`${baseUrl}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 헤더: 프로필 API 응답:', {
        voteDetails: data.voteDetails,
        voteAttendance: data.voteAttendance,
        participated: data.voteDetails?.participated,
        total: data.voteDetails?.total
      });

      setUser(data);
      console.log('✅ 헤더: 사용자 데이터 새로고침 완료:', {
        voteAttendance: data.voteAttendance,
        voteDetails: data.voteDetails,
        name: data.name
      });
    } catch (error) {
      console.error('❌ 헤더: 사용자 데이터 새로고침 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 투표 제출 이벤트 리스너
  useEffect(() => {
    const handleVoteSubmitted = () => {
      console.log('🗳️ 헤더: 투표 제출 이벤트 수신, 사용자 데이터 새로고침');
      refreshUserData();
    };

    const handleVoteDataChanged = () => {
      console.log('🔄 헤더: 투표 데이터 변경 이벤트 수신, 사용자 데이터 새로고침');
      refreshUserData();
    };

    window.addEventListener('voteSubmitted', handleVoteSubmitted);
    window.addEventListener('voteDataChanged', handleVoteDataChanged);
    return () => {
      window.removeEventListener('voteSubmitted', handleVoteSubmitted);
      window.removeEventListener('voteDataChanged', handleVoteDataChanged);
    };
  }, [token]);

  const handleNamePillClick = () => {
    playerPassport.onOpen();
  };
  const handlePassportEdit = () => {
    playerPassport.onClose();
    navigate('/profile');
  };

  // 애니메이션용 상태
  const [animatedAttendance, setAnimatedAttendance] = useState(0);
  const [animatedVoteAttendance, setAnimatedVoteAttendance] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const voteAnimationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 실제 참여율 계산
    const gameDetails = user?.gameDetails;
    const targetAttendance = gameDetails && gameDetails.total > 0
      ? Math.round((gameDetails.participated / gameDetails.total) * 100)
      : 0;

    setAnimatedAttendance(0);

    // 애니메이션: 0에서 targetAttendance까지 빠르게 증가
    const duration = 700; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;
    if (animationRef.current) clearInterval(animationRef.current);
    animationRef.current = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const value = Math.round(progress * targetAttendance);
      setAnimatedAttendance(value);
      if (progress === 1) {
        if (animationRef.current) clearInterval(animationRef.current);
      }
    }, frameRate);
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [user?.gameDetails]);

  // 투표 참여율 애니메이션
  useEffect(() => {
    // 실제 투표율 계산
    const voteDetails = user?.voteDetails;
    const targetVoteAttendance = voteDetails && voteDetails.total > 0
      ? Math.round((voteDetails.participated / voteDetails.total) * 100)
      : 0;

    // 애니메이션: 0에서 targetVoteAttendance까지 빠르게 증가
    const duration = 700; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);
    let frame = 0;
    if (voteAnimationRef.current) clearInterval(voteAnimationRef.current);
    voteAnimationRef.current = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const value = Math.round(progress * targetVoteAttendance);
      setAnimatedVoteAttendance(value);
      if (progress === 1) {
        if (voteAnimationRef.current) clearInterval(voteAnimationRef.current);
      }
    }, frameRate);
    return () => {
      if (voteAnimationRef.current) clearInterval(voteAnimationRef.current);
    };
  }, [user?.voteDetails]);

  // gaugeGrow keyframes를 헤더에도 적용 (최초 1회)
  useEffect(() => {
    const styleId = 'header-gauge-grow-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `@keyframes gaugeGrow { from { width: 0%; } to { width: var(--gauge-width, 100%); } }`;
      document.head.appendChild(style);
    }
  }, []);

  // 컴포넌트 마운트 시 사용자 데이터 새로고침
  useEffect(() => {
    if (token) {
      console.log('🚀 헤더: 컴포넌트 마운트, 사용자 데이터 새로고침');
      refreshUserData();
    }
  }, [token]); // token이 변경될 때만 실행

  // 페이지 로드 시 강제로 사용자 데이터 새로고침
  useEffect(() => {
    if (token) {
      console.log('🔄 헤더: 페이지 로드 시 강제 새로고침');
      // 약간의 지연을 두어 다른 데이터 로딩 후 실행
      const timer = setTimeout(() => {
      refreshUserData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 투표 완료 이벤트 수신하여 사용자 데이터 새로고침
  useEffect(() => {
    const handleVoteSubmitted = () => {
      console.log('🔍 헤더: 투표 완료 이벤트 수신, 사용자 데이터 새로고침');
      if (user && token) {
        refreshUserData();
      }
    };

    window.addEventListener('voteSubmitted', handleVoteSubmitted);
    // 경기 변경 이벤트에도 즉시 새로고침
    const handleGamesChanged = () => {
      console.log('🔔 헤더: 경기 변경 이벤트 수신, 사용자 데이터 새로고침');
      if (token) refreshUserData();
    };
    window.addEventListener('gamesChanged', handleGamesChanged);
    const busHandler = () => handleGamesChanged();
    eventBus.on(EVENT_TYPES.GAME_CREATED, busHandler);
    eventBus.on(EVENT_TYPES.GAME_UPDATED, busHandler);
    eventBus.on(EVENT_TYPES.GAME_DELETED, busHandler);
    eventBus.on(EVENT_TYPES.GAME_CONFIRMED, busHandler);
    eventBus.on(EVENT_TYPES.DATA_REFRESH_NEEDED, ({ payload }: any) => {
      if (payload?.dataType === 'games') handleGamesChanged();
    });

    return () => {
      window.removeEventListener('voteSubmitted', handleVoteSubmitted);
      window.removeEventListener('gamesChanged', handleGamesChanged);
      eventBus.off(EVENT_TYPES.GAME_CREATED, busHandler);
      eventBus.off(EVENT_TYPES.GAME_UPDATED, busHandler);
      eventBus.off(EVENT_TYPES.GAME_DELETED, busHandler);
      eventBus.off(EVENT_TYPES.GAME_CONFIRMED, busHandler);
    };
  }, [user, token]);

  return (
    <>
      <Flex as="nav" className="fccg-header" align="center" justify="space-between" px={{ base: 3, md: 4, lg: 6 }} h="80px" bg="white" boxShadow="sm" w="100%" position="fixed" top={0} left={0} right={0} zIndex={Z_INDEX.HEADER} maxW="100vw" overflow="hidden" boxSizing="border-box">
        <HStack spacing={3} flexShrink={1} minW={0} pl={{ base: 2, md: 4, lg: 6 }}>
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="bold"
            cursor="pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate('/');
            }}
            tabIndex={0}
            aria-label="홈으로 이동"
            color="brand.500"
            _hover={{
              color: 'brand.600'
            }}
            whiteSpace="nowrap"
          >
            FC CHAL-GGYEO
          </Text>
        </HStack>
        {/* 데스크톱 top nav: 박스형 버튼이 아닌 텍스트 중심 한 줄 nav. active는 brand 텍스트 + 하단 2px indicator */}
        <HStack spacing={1} flexShrink={1} minW={0} display={{ base: 'none', lg: 'flex' }}>
          {availableNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.label}
                variant="ghost"
                h="40px"
                px={3}
                iconSpacing={2}
                bg="transparent"
                border="0"
                borderRadius="md"
                position="relative"
                fontSize="sm"
                color={isActive ? 'brand.600' : 'gray.600'}
                fontWeight={isActive ? '700' : '500'}
                aria-current={isActive ? 'page' : undefined}
                _after={{
                  content: '""',
                  position: 'absolute',
                  left: 3,
                  right: 3,
                  bottom: 0,
                  h: '2px',
                  borderRadius: 'full',
                  bg: isActive ? 'brand.500' : 'transparent',
                }}
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
                _active={{ bg: 'brand.50' }}
                transition={`color ${MOTION.DURATION.FAST} ${MOTION.EASING.STANDARD}, background-color ${MOTION.DURATION.FAST} ${MOTION.EASING.STANDARD}`}
                leftIcon={<Icon boxSize="16px" opacity={isActive ? 1 : 0.75} />}
                onClick={() => handleNavigate(item.path)}
                flexShrink={0}
              >
                {item.label}
              </Button>
            );
          })}
        </HStack>
        <HStack spacing={2} flexShrink={0} minW="fit-content" pr={{ base: 2, md: 6, lg: 8 }} display={{ base: 'none', lg: 'flex' }}>
          {!user ? (
            <>
              <AppButton size="sm" variant="primary" onClick={onOpen} whiteSpace="nowrap">로그인</AppButton>
              <IconButton
                aria-label="메뉴얼"
                icon={<InfoIcon />}
                size="sm"
                variant="outline"
                color="gray.600"
                borderColor="gray.300"
                _hover={{ bg: 'gray.50', color: 'brand.600' }}
                onClick={memberManual.onOpen}
                borderRadius="full"
              />
            </>
          ) : (
            <>
              <HStack align="center" spacing={2} flexShrink={1} minW={0} display={{ base: 'none', lg: 'flex' }}>
                {/* 투표율과 참여율 표시 — 공간이 충분한 xl(1280px) 이상에서만 (그 아래는 햄버거 메뉴/패스포트에서 확인) */}
                {user && (
                  <HStack spacing={2} display={{ base: 'none', xl: 'flex' }}>
                    <Tooltip
                      label={isLoading ? '로딩 중...' : `${user?.voteDetails?.participated || 0}/${user?.voteDetails?.total || 0} 투표참여`}
                      placement="bottom"
                      hasArrow
                      bg="gray.800"
                      color="white"
                      fontSize="sm"
                    >
                      <Box minW={{ base: '60px', md: '70px' }} textAlign="center" display="flex" flexDirection="column" alignItems="center" justifyContent="center" flexShrink={1}>
                        <Text fontSize="xs" color="gray.500" cursor="default" _hover={{ color: "blue.400" }} whiteSpace="nowrap">
                          투표율 <span style={{ color: COLORS.TEXT_PRIMARY, fontWeight: 'bold' }}>
                            {isLoading ? '...' : `${animatedVoteAttendance}%`}
                          </span>
                        </Text>
                        <Box w="60px" mt={0.5}>
                          <Box
                            h="6px"
                            bg="gray.200"
                            borderRadius={4}
                            overflow="hidden"
                            position="relative"
                          >
                            <Box
                              bg={COLORS.WARNING}
                              h="100%"
                              borderRadius={4}
                              position="absolute"
                              left={0}
                              top={0}
                              zIndex={1}
                              style={{
                                width: `${animatedVoteAttendance}%`,
                                animation: `gaugeGrow 0.7s cubic-bezier(.4,2,.6,1)`,
                                animationFillMode: 'forwards',
                                '--gauge-width': `${animatedVoteAttendance}%`,
                                transition: 'width 0.7s cubic-bezier(.4,2,.6,1)'
                              } as React.CSSProperties}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Tooltip>
                    <Tooltip
                      label={`${user?.gameDetails?.participated || 0}/${user?.gameDetails?.total || 0} 경기 참여`}
                      placement="bottom"
                      hasArrow
                      bg="gray.800"
                      color="white"
                      fontSize="sm"
                    >
                      <Box minW={{ base: '60px', md: '70px' }} textAlign="center" display="flex" flexDirection="column" alignItems="center" justifyContent="center" flexShrink={1}>
                        <Text fontSize="xs" color="gray.500" cursor="default" _hover={{ color: "blue.400" }} whiteSpace="nowrap">참여율 <span style={{ color: COLORS.TEXT_PRIMARY, fontWeight: 'bold' }}>{animatedAttendance}%</span></Text>
                        <Box w="60px" mt={0.5}>
                          <Box
                            h="6px"
                            bg="gray.200"
                            borderRadius={4}
                            overflow="hidden"
                            position="relative"
                          >
                            <Box
                              bg="brand.500"
                              h="100%"
                              borderRadius={4}
                              position="absolute"
                              left={0}
                              top={0}
                              zIndex={1}
                              style={{
                                width: `${animatedAttendance}%`,
                                animation: `gaugeGrow 0.7s cubic-bezier(.4,2,.6,1)`,
                                animationFillMode: 'forwards',
                                '--gauge-width': `${animatedAttendance}%`,
                                transition: 'width 0.7s cubic-bezier(.4,2,.6,1)'
                              } as React.CSSProperties}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Tooltip>
                    {/* 투표율/참여율(정보)과 아바타/이름(계정) 영역을 시각적으로 구분 */}
                    <Box w="1px" h="28px" bg="gray.200" flexShrink={0} />
                  </HStack>
                )}
                <HStack align="center" spacing={2} flexShrink={0}>
                  <Box
                    w="26px"
                    h="26px"
                    flexShrink={0}
                    borderRadius="full"
                    bg="brand.500"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="900"
                  >
                    {user.name.slice(0, 1)}
                  </Box>
                  <Tooltip label="플레이어 패스포트 열기" placement="bottom" hasArrow bg="gray.800" color="white">
                    <Text
                      as="button"
                      type="button"
                      aria-label={`${user.name}님의 플레이어 패스포트 열기`}
                      onClick={handleNamePillClick}
                      fontWeight="800"
                      color="#102A43"
                      cursor="pointer"
                      bg="transparent"
                      border="0"
                      outline="none"
                      appearance="none"
                      fontFamily="inherit"
                      fontSize="inherit"
                      lineHeight="inherit"
                      p={0}
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      maxW={{ base: '72px', md: '112px' }}
                      transition={`color ${MOTION.DURATION.FAST} ${MOTION.EASING.STANDARD}`}
                      _hover={{ color: 'brand.500', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300', outlineOffset: '3px' }}
                    >
                      {user.name} <Box as="span" color="#8AA0B8" fontSize="lg" lineHeight="1" aria-hidden="true">›</Box>
                    </Text>
                  </Tooltip>
                </HStack>
              </HStack>
              <AppButton size="sm" variant="primary" onClick={() => { logout(); navigate('/'); }} whiteSpace="nowrap">로그아웃</AppButton>
              <IconButton
                aria-label="메뉴얼"
                icon={<InfoIcon />}
                size="sm"
                variant="outline"
                color="gray.600"
                borderColor="gray.300"
                _hover={{ bg: 'gray.50', color: 'brand.600' }}
                onClick={memberManual.onOpen}
                borderRadius="full"
              />
            </>
          )}
        </HStack>
        <HStack spacing={2} display={{ base: 'flex', lg: 'none' }}>
          {!user ? (
            <AppButton size="xs" variant="primary" onClick={onOpen}>로그인</AppButton>
          ) : (
            <AppButton size="xs" variant="primary" onClick={() => { logout(); navigate('/'); }}>로그아웃</AppButton>
          )}
          <IconButton
            aria-label="메뉴얼"
            icon={<InfoIcon />}
            size="md"
            variant="outline"
            borderWidth="1px"
            color="gray.600"
            borderColor="gray.200"
            _hover={{ bg: 'brand.50', borderColor: 'brand.300', color: 'brand.600' }}
            onClick={memberManual.onOpen}
            borderRadius="full"
          />
          <IconButton
            aria-label="모바일 메뉴"
            icon={<HamburgerIcon />}
            size="md"
            variant="outline"
            borderWidth="1px"
            color="gray.600"
            borderColor="gray.200"
            _hover={{ bg: 'brand.50', borderColor: 'brand.300', color: 'brand.600' }}
            onClick={mobileNav.onOpen}
          />
        </HStack>
      </Flex>
      <ManualModal isOpen={memberManual.isOpen} onClose={memberManual.onClose} variant="member" />
      <Drawer placement="right" onClose={mobileNav.onClose} isOpen={mobileNav.isOpen}>
        <DrawerOverlay />
        <DrawerContent className="fccg-header">
          <DrawerCloseButton />
          <DrawerHeader>메뉴</DrawerHeader>
          <DrawerBody display="flex" flexDirection="column">
            <VStack align="stretch" spacing={4} divider={<StackDivider borderColor="gray.100" />}>
              <VStack align="stretch" spacing={2}>
                {availableNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.label}
                      variant="ghost"
                      leftIcon={<Icon />}
                      justifyContent="flex-start"
                      bg={isActive ? 'brand.50' : 'transparent'}
                      color={isActive ? 'brand.600' : 'gray.700'}
                      fontWeight={isActive ? '700' : '500'}
                      borderLeft="3px solid"
                      borderLeftColor={isActive ? 'brand.500' : 'transparent'}
                      _hover={{ bg: isActive ? 'brand.50' : 'gray.50' }}
                      onClick={() => handleNavigate(item.path)}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </VStack>
              {user ? (
                <VStack align="stretch" spacing={3}>
                  <HStack spacing={2}>
                    <Box
                      w="26px"
                      h="26px"
                      borderRadius="full"
                      bg="brand.500"
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="xs"
                      fontWeight="900"
                    >
                      {user.name.slice(0, 1)}
                    </Box>
                    <Text
                      as="button"
                      type="button"
                      aria-label={`${user.name}님의 플레이어 패스포트 열기`}
                      color="#0F172A"
                      fontWeight="bold"
                      bg="transparent"
                      border="0"
                      outline="none"
                      appearance="none"
                      fontFamily="inherit"
                      p={0}
                      cursor="pointer"
                      transition={`color ${MOTION.DURATION.FAST} ${MOTION.EASING.STANDARD}`}
                      _hover={{ color: 'brand.500', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                      _focusVisible={{ outline: '2px solid', outlineColor: 'brand.300', outlineOffset: '3px' }}
                      onClick={() => {
                        mobileNav.onClose();
                        playerPassport.onOpen();
                      }}
                    >
                      {user.name} <Box as="span" color="#8AA0B8" fontSize="lg" lineHeight="1" aria-hidden="true">›</Box>
                    </Text>
                  </HStack>
                  <Box>
                    <Text fontSize="sm" color="gray.500">투표율</Text>
                    <Text fontWeight="bold">{animatedVoteAttendance}%</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">참여율</Text>
                    <Text fontWeight="bold">{animatedAttendance}%</Text>
                  </Box>
                  <Button colorScheme="brand" onClick={() => { logout(); navigate('/'); mobileNav.onClose(); }}>
                    로그아웃
                  </Button>
                </VStack>
              ) : (
                <Button colorScheme="brand" onClick={() => { onOpen(); mobileNav.onClose(); }}>
                  로그인
                </Button>
              )}
            </VStack>
            {/* 메뉴 항목이 적어도 드로어 하단이 허전하지 않도록 여백을 의미 있게 채운다 */}
            <Box mt="auto" pt={6} pb={2} textAlign="center">
              <Text fontSize="xs" color="gray.400" fontWeight="700" letterSpacing="0.08em">
                FC CHAL-GGYEO
              </Text>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <Drawer
        placement="right"
        onClose={playerPassport.onClose}
        isOpen={playerPassport.isOpen}
        size="sm"
      >
        <DrawerOverlay />
        <DrawerContent bg="#F8FAFC" className="fccg-header">
          <DrawerCloseButton
            color="#0F172A"
            _focusVisible={{ boxShadow: '0 0 0 3px rgba(0,78,168,0.28)' }}
          />
          <DrawerHeader color="#0F172A" borderBottomWidth="1px" borderColor="#E2E8F0">
            내 선수 정보
          </DrawerHeader>
          <DrawerBody px={{ base: 4, md: 6 }} py={6}>
            {user && (
              <PlayerPassportPanel user={user} onEditProfile={handlePassportEdit} />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      {/* 로그인/회원가입 모달 */}
      <Modal isOpen={isOpen} onClose={() => { setShowSignup(false); onClose(); }} isCentered size="sm" scrollBehavior="inside">
        <ModalOverlay />
        {/* 로그인/회원가입 카드(AuthShell)가 자체 배경·radius를 가지므로 모달 틀은 투명, 높이는 내용에 맞춘다 */}
        <ModalContent
          p={0}
          borderRadius="xl"
          overflow="hidden"
          bg="transparent"
          boxShadow="xl"
          mx={4}
          my="auto"
          position="relative"
        >
          <ModalBody p={0} display="flex" alignItems="flex-start" justifyContent="center">
            <Suspense fallback={<Box color="gray.500">불러오는 중...</Box>}>
              {showSignup ? (
                <Signup onSwitch={() => setShowSignup(false)} onClose={() => { setShowSignup(false); onClose(); }} />
              ) : (
                <Login onSwitch={() => setShowSignup(true)} onClose={() => { setShowSignup(false); onClose(); }} />
              )}
            </Suspense>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
