import { useState, useEffect, useRef } from 'react';
import { Flex, Text, Button, HStack, Badge, Modal, ModalOverlay, ModalContent, ModalBody, useDisclosure, Box, FormControl, FormLabel, Input, useToast, Tooltip, IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton, VStack, StackDivider, useBreakpointValue } from '@chakra-ui/react';
import { CalendarIcon, ViewIcon, SettingsIcon, AttachmentIcon, ExternalLinkIcon, InfoIcon, HamburgerIcon } from '@chakra-ui/icons';
import { useAuthStore } from '../store/auth';
import { changePassword, updateProfile } from '../api/auth';
import Signup from '../pages/Signup';
import Login from '../pages/Login';
import { useNavigate, useLocation } from 'react-router-dom';
import eventBus, { EVENT_TYPES } from '../utils/eventBus';
import { API_ENDPOINTS } from '../constants';
import ManualModal from './ManualModal';
import { getApiBaseUrl } from '../config/api';

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
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const memberManual = useDisclosure();
  const mobileNav = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });
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
    setEditName(user?.name || '');
    setIsNameModalOpen(true);
  };
  const handleNameSave = async () => {
    if (!user || !token) return;
    setNameLoading(true);
    setNameError(null);
    try {
      const response = await updateProfile({ name: editName });
      // 백엔드 응답 형식: { success: true, message: '...', user: {...} }
      const updatedUser = response.user || response;
      setUser(updatedUser);
      setIsNameModalOpen(false);
      toast({ title: '이름이 수정되었습니다.', status: 'success', duration: 2000 });
    } catch (error: any) {
      console.error('프로필 업데이트 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '이름 수정 실패';
      setNameError(errorMessage);
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !token) return;
    
    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      // 비밀번호 변경 API 호출
      await changePassword(newPassword);
      
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: '비밀번호가 변경되었습니다.', status: 'success', duration: 2000 });
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setPasswordError('비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordLoading(false);
    }
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
      <Flex as="nav" align="center" justify="space-between" px={{ base: 3, md: 4, lg: 6 }} py={2} bg="white" boxShadow="sm" w="100%" position="fixed" top={0} left={0} right={0} zIndex={100} maxW="100vw" overflow="hidden" boxSizing="border-box">
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
            color="#004ea8"
            _hover={{ 
              color: '#00397a'
            }}
            whiteSpace="nowrap"
          >
            FC CHAL-GGYEO
          </Text>
        </HStack>
        <HStack spacing={2} flexShrink={1} minW={0} display={{ base: 'none', md: 'flex' }}>
          {availableNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
          <Button 
                key={item.label}
                variant={isActive ? "outline" : "ghost"} 
            bg="transparent"
            color="#004ea8" 
            border="0.5px solid" 
                borderColor={isActive ? "#004ea8" : "transparent"} 
            _hover={{ 
                  bg: isActive ? 'transparent' : 'gray.50',
              borderColor: "#004ea8"
            }} 
                leftIcon={<Icon />}
                onClick={() => handleNavigate(item.path)}
            flexShrink={1}
          >
                {item.label}
          </Button>
            );
          })}
        </HStack>
        <HStack spacing={2} flexShrink={0} minW="fit-content" pr={{ base: 2, md: 6, lg: 8 }} display={{ base: 'none', md: 'flex' }}>
          {!user ? (
            <Button size="sm" bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} variant="outline" onClick={onOpen} whiteSpace="nowrap">로그인</Button>
          ) : (
            <>
              <HStack align="center" spacing={2} flexShrink={1} minW={0} display={{ base: 'none', md: 'flex' }}>
                {/* 투표율과 참여율 표시 (user가 있으면 항상 표시) */}
                {user && (
                  <>
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
                          투표율 <span style={{ color: '#004ea8', fontWeight: 'bold' }}>
                            {isLoading ? '...' : `${animatedVoteAttendance}%`}
                          </span>
                        </Text>
                        <Box w="60px" mt={0.5}>
                          <Box
                            h="6px"
                            bg="#e2e8f0"
                            borderRadius={4}
                            overflow="hidden"
                            position="relative"
                          >
                            <Box
                              bg="#e53e3e"
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
                        <Text fontSize="xs" color="gray.500" cursor="default" _hover={{ color: "blue.400" }} whiteSpace="nowrap">참여율 <span style={{ color: '#004ea8', fontWeight: 'bold' }}>{animatedAttendance}%</span></Text>
                        <Box w="60px" mt={0.5}>
                          <Box
                            h="6px"
                            bg="#e2e8f0"
                            borderRadius={4}
                            overflow="hidden"
                            position="relative"
                          >
                            <Box
                              bg="#004ea8"
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
                  </>
                )}
                <HStack align="center" spacing={2} flexShrink={0}>
                  <Badge bg="#004ea8" color="white" borderRadius="full" px={2} py={1} whiteSpace="nowrap">정</Badge>
                  <Text
                    fontWeight="bold"
                    cursor="pointer"
                    _hover={{ textDecoration: 'underline', color: '#00397a' }}
                    onClick={handleNamePillClick}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    maxW={{ base: '60px', md: '100px' }}
                  >
                    {user.name}
                  </Text>
                </HStack>
              </HStack>
              <Button size="sm" bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} onClick={() => { logout(); navigate('/'); }} whiteSpace="nowrap">로그아웃</Button>
              <IconButton
                aria-label="메뉴얼"
                icon={<InfoIcon />}
                size="sm"
                bg="#004ea8"
                color="white"
                _hover={{ bg: '#00397a' }}
                onClick={memberManual.onOpen}
                borderRadius="full"
              />
            </>
          )}
        </HStack>
        <HStack spacing={1} display={{ base: 'flex', md: 'none' }}>
          {!user ? (
            <Button size="xs" bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} variant="solid" onClick={onOpen}>로그인</Button>
          ) : (
            <Button size="xs" bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} onClick={() => { logout(); navigate('/'); }}>로그아웃</Button>
          )}
          <IconButton
            aria-label="메뉴얼"
            icon={<InfoIcon />}
            size="sm"
            bg="#004ea8"
            color="white"
            _hover={{ bg: '#00397a' }}
            onClick={memberManual.onOpen}
            borderRadius="full"
          />
          <IconButton
            aria-label="모바일 메뉴"
            icon={<HamburgerIcon />}
            size="sm"
            variant="outline"
            onClick={mobileNav.onOpen}
          />
        </HStack>
      </Flex>
      <ManualModal isOpen={memberManual.isOpen} onClose={memberManual.onClose} variant="member" />
      <Drawer placement="right" onClose={mobileNav.onClose} isOpen={mobileNav.isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>메뉴</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4} divider={<StackDivider borderColor="gray.100" />}>
              <VStack align="stretch" spacing={2}>
                {availableNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.label}
                      variant={isActive ? 'solid' : 'ghost'}
                      leftIcon={<Icon />}
                      justifyContent="flex-start"
                      colorScheme={isActive ? 'blue' : undefined}
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
                    <Badge bg="#004ea8" color="white" borderRadius="full" px={2} py={1}>정</Badge>
                    <Text fontWeight="bold">{user.name}</Text>
                  </HStack>
                  <Box>
                    <Text fontSize="sm" color="gray.500">투표율</Text>
                    <Text fontWeight="bold">{animatedVoteAttendance}%</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">참여율</Text>
                    <Text fontWeight="bold">{animatedAttendance}%</Text>
                  </Box>
                  <Button colorScheme="blue" onClick={() => { logout(); navigate('/'); mobileNav.onClose(); }}>
                    로그아웃
                  </Button>
                </VStack>
              ) : (
                <Button colorScheme="blue" onClick={() => { onOpen(); mobileNav.onClose(); }}>
                  로그인
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      {/* 로그인/회원가입 모달 */}
      <Modal isOpen={isOpen} onClose={() => { setShowSignup(false); onClose(); }} isCentered size="sm">
        <ModalOverlay />
        <ModalContent
          p={0}
          borderRadius="lg"
          minH="auto"
          maxH="400px"
          height="auto"
          mx="auto"
          my="auto"
          position="relative"
        >
          <ModalBody p={0} pt={0} pb={1} px={0} display="flex" alignItems="center" justifyContent="center" height="400px" minHeight="400px">
            {showSignup ? (
              <Signup onSwitch={() => setShowSignup(false)} onClose={() => { setShowSignup(false); onClose(); }} />
            ) : (
              <Login onSwitch={() => setShowSignup(true)} onClose={() => { setShowSignup(false); onClose(); }} />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      {/* 이름 수정 모달 */}
      <Modal isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalBody p={6}>
            <FormControl mb={4}>
              <FormLabel>새 이름</FormLabel>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="이름을 입력하세요" />
            </FormControl>
            {nameError && <Text color="red.500" mb={2}>{nameError}</Text>}
            <Button bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} w="full" onClick={handleNameSave} isLoading={nameLoading} isDisabled={!editName.trim() || editName === user?.name} mb={3}>저장</Button>
            <Button variant="outline" colorScheme="orange" w="full" onClick={() => { setIsNameModalOpen(false); setIsPasswordModalOpen(true); }}>비밀번호 변경</Button>
          </ModalBody>
        </ModalContent>
      </Modal>
      
      {/* 비밀번호 변경 모달 */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalBody p={6}>
            <FormControl mb={4}>
              <FormLabel>새 비밀번호</FormLabel>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="새 비밀번호를 입력하세요" 
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>비밀번호 확인</FormLabel>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="비밀번호를 다시 입력하세요" 
              />
            </FormControl>
            {passwordError && <Text color="red.500" mb={2}>{passwordError}</Text>}
            <Button bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} w="full" onClick={handlePasswordChange} isLoading={passwordLoading} isDisabled={!newPassword.trim() || !confirmPassword.trim()}>비밀번호 변경</Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
