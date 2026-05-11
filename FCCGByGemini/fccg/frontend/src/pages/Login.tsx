import React, { useState } from 'react';
import type { FC } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  VStack,
  useToast,
  ModalCloseButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuthStore } from '../store/auth';
import { login } from '../api/auth';
import { useNavigate, useLocation } from 'react-router-dom';

interface LoginProps {
  onSwitch?: () => void;
  onClose?: () => void;
}

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login: FC<LoginProps> = ({ onSwitch, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusWarning, setStatusWarning] = useState<any>(null);
  const [inactiveModalMessage, setInactiveModalMessage] = useState('');
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isWarningModalOpen, onOpen: onWarningModalOpen, onClose: onWarningModalClose } = useDisclosure();
  const { isOpen: isInactiveModalOpen, onOpen: onInactiveModalOpen, onClose: onInactiveModalClose } = useDisclosure();

  // 회원 상태 경고 체크 함수
  const checkMemberStatusWarning = (user: any) => {
    if (!user) return null;
    
    // 투표 참여율이 낮은 경우
    if (user.voteAttendance < 50) {
      return {
        type: 'vote',
        title: '투표 참여율 경고',
        message: `현재 투표 참여율이 ${user.voteAttendance}%입니다. 4회 연속 미참여 또는 3개월간 6회 미참여 시 비활성 상태로 변경됩니다.`,
        severity: 'warning'
      };
    }
    
    // 경기 참여율이 낮은 경우
    if (user.attendance < 30) {
      return {
        type: 'game',
        title: '경기 참여율 경고',
        message: '3개월간 축구경기에 참여하지 않으면 비활성 상태로 변경됩니다.',
        severity: 'warning'
      };
    }
    
    // 마지막 로그인이 오래된 경우
    if (user.lastLoginAt) {
      const lastLogin = new Date(user.lastLoginAt);
      const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLogin > 30) {
        return {
          type: 'login',
          title: '로그인 경고',
          message: `${daysSinceLogin}일간 로그인하지 않았습니다. 2개월간 로그인하지 않으면 정지 상태로 변경됩니다.`,
          severity: 'error'
        };
      }
    }
    
    return null;
  };

  // 경고 모달 닫기 및 로그인 완료
  const handleWarningClose = () => {
    onWarningModalClose();
    toast({ title: '로그인 성공', status: 'success', duration: 2000, isClosable: true });
    if (onClose) onClose();
    
    // 이전 페이지로 돌아가기
    const from = (location.state as LocationState)?.from?.pathname || '/';
    navigate(from);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('🚀 로그인 시작:', { email });
      const { token, user } = await login(email, password);
      console.log('🔍 로그인 응답:', { token: token ? '토큰 있음' : '토큰 없음', user: user?.name });
      console.log('🔍 토큰 길이:', token ? token.length : 0);
      console.log('🔍 토큰 내용 (처음 50자):', token ? token.substring(0, 50) + '...' : '없음');
      
      console.log('🔄 사용자 정보 저장 중...');
      setUser(user);
      console.log('🔄 토큰 저장 중...');
      setToken(token);
      
      // 저장 후 즉시 확인
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      console.log('🔍 토큰 저장 후 localStorage 확인:', storedToken ? `저장됨 (길이: ${storedToken.length})` : '저장 안됨');
      console.log('🔍 사용자 저장 후 localStorage 확인:', storedUser ? '저장됨' : '저장 안됨');
      
      // 회원 상태 경고 체크
      const warning = checkMemberStatusWarning(user);
      if (warning) {
        setStatusWarning(warning);
        onWarningModalOpen();
      } else {
        toast({ title: '로그인 성공', status: 'success', duration: 2000, isClosable: true });
        if (onClose) onClose();
        
        // 이전 페이지로 돌아가기 (state에서 from 정보 가져오기)
        const from = (location.state as LocationState)?.from?.pathname || '/';
        navigate(from);
      }
    } catch (err: unknown) {
      let errorMsg = '오류 발생';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string; message?: string }; status?: number } };
        
        if (axiosError.response?.status === 401) {
          errorMsg = '이메일 또는 비밀번호가 올바르지 않습니다.';
        } else if (axiosError.response?.status === 403) {
          const responseMessage = axiosError.response.data?.error || axiosError.response.data?.message || '';
          const isInactiveMember = axiosError.response.data?.memberStatus === 'INACTIVE' || responseMessage.includes('비활성');
          if (isInactiveMember) {
            setInactiveModalMessage(responseMessage || '비활성화된 계정입니다. 관리자에게 확인 바랍니다.');
            onInactiveModalOpen();
            return;
          }
          errorMsg = responseMessage || '접근 권한이 없습니다.';
        } else if (axiosError.response?.status === 400) {
          errorMsg = axiosError.response.data?.error || axiosError.response.data?.message || '입력 정보를 확인해주세요.';
        } else if (axiosError.response?.status === 404) {
          errorMsg = '로그인 서비스를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.';
        } else if (axiosError.response?.status === 500) {
          errorMsg = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else if (axiosError.response?.data?.error) {
          errorMsg = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMsg = axiosError.response.data.message;
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = (err as { message: string }).message;
      }
      
      toast({ title: '로그인 실패', description: errorMsg, status: 'error', duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bgGradient="linear(to-br, #004ea8, #1f2937)" borderRadius="xl" p={0} px={8} py={8} position="relative">
      {onSwitch && (
        <ModalCloseButton
          color="white"
          position="absolute"
          top="1rem"
          right="1rem"
          zIndex={100}
          size="lg"
          bg="rgba(0,0,0,0.25)"
          _hover={{ bg: 'rgba(0,0,0,0.35)' }}
          _focus={{ boxShadow: 'none' }}
          borderRadius="full"
          m={0}
          transform="none"
          onClick={onSwitch}
        />
      )}
      <Box bg="white" borderRadius="xl" p={8} boxShadow="lg" w="full" maxW="sm" minW={320}>
        <Heading mb={6} color="#004ea8" fontFamily="Pretendard, Inter, sans-serif" fontWeight="bold" textAlign="center">로그인</Heading>
        <form onSubmit={handleLogin}>
          <VStack spacing={4}>
            <FormControl id="email" isRequired>
              <FormLabel>이메일</FormLabel>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일을 입력하세요" rounded="lg" bg="gray.50" _dark={{ bg: '#374151' }} />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel>비밀번호</FormLabel>
              <InputGroup>
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" rounded="lg" bg="gray.50" _dark={{ bg: '#374151' }} />
                <InputRightElement>
                  <IconButton aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'} icon={showPw ? <ViewOffIcon /> : <ViewIcon />} variant="ghost" size="sm" bg="#004ea8" color="white" _hover={{ bg: '#00397a' }} onClick={() => setShowPw(v => !v)} />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <Button type="submit" colorScheme="blue" bg="#004ea8" _hover={{ bg: '#00397a' }} w="full" rounded="lg" isLoading={loading} fontWeight="bold">로그인</Button>
            {onSwitch && (
              <Button
                variant="outline"
                color="#004ea8"
                borderColor="#004ea8"
                borderWidth={1}
                borderStyle="solid"
                rounded="lg"
                w="full"
                mt={2}
                fontWeight="bold"
                bg="white"
                _hover={{ bg: '#e6f0fa' }}
                onClick={onSwitch}
              >
                회원가입
              </Button>
            )}
          </VStack>
        </form>
      </Box>
      
      {/* 회원 상태 경고 모달 */}
      <Modal isOpen={isWarningModalOpen} onClose={handleWarningClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {statusWarning?.title || '상태 경고'}
          </ModalHeader>
          <ModalBody>
            <Alert 
              status={statusWarning?.severity === 'error' ? 'error' : 'warning'} 
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              height="200px"
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                {statusWarning?.title}
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                {statusWarning?.message}
              </AlertDescription>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleWarningClose}>
              확인
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 비활성 계정 차단 모달 */}
      <Modal isOpen={isInactiveModalOpen} onClose={onInactiveModalClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>비활성 계정 안내</ModalHeader>
          <ModalBody>
            <Alert status="warning" variant="left-accent" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle mb={1}>로그인이 제한되었습니다.</AlertTitle>
                <AlertDescription>
                  {inactiveModalMessage || '비활성화된 계정입니다. 관리자에게 확인 바랍니다.'}
                </AlertDescription>
              </Box>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onInactiveModalClose}>
              확인
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Login; 