import { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Textarea,
  Button,
  VStack,
  HStack,
  Text,
  useColorModeValue,
  Spinner,
  Collapse,
  useBreakpointValue
} from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';
import { ChatIcon, CloseIcon } from '@chakra-ui/icons';
import { askChatbot } from '../api/auth';
import { ADMIN_SHELL, Z_INDEX } from '../constants/designTokens';
import { MatchDayModalHeader } from './admin/MatchDay';

type Message = {
  from: 'bot' | 'user';
  text: string;
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  // 관리자 모바일(lg 미만 — AdminPageNew의 isMobile과 같은 기준)에서는 콘텐츠를 덜 가리는 우측 edge dock으로만 표시한다.
  // 열기/닫기 동작(setIsOpen 토글)은 기존 버튼과 동일.
  const { pathname } = useLocation();
  const isBelowLg = useBreakpointValue({ base: true, lg: false }, { ssr: false });
  const isAdmin = pathname.startsWith('/admin');
  // 관리자 화면은 챗봇을 콘텐츠 영역 밖 Shell에만 둔다 (ADMIN_SHELL 참고).
  // lg 미만: 고정 title bar 높이에 맞춘 우측 edge dock / lg 이상: 사이드바 하단 전용 칸의 원형 버튼.
  const isAdminDock = isAdmin && !!isBelowLg;
  const isAdminSidebarFab = isAdmin && !isBelowLg;
  const [messages, setMessages] = useState<Message[]>([
    {
      from: 'bot',
      text: '안녕하세요! 홈페이지 이용법이나 일정/투표 관련 질문을 도와드릴게요.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const buttonColor = useColorModeValue('brand.600', 'brand.300');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setInput('');
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const response = await askChatbot(trimmed);
      const answer =
        response?.answer ||
        '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.';
      setMessages((prev) => [...prev, { from: 'bot', text: answer }]);
    } catch (error) {
      console.error('챗봇 호출 오류:', error);
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: '서버와 통신 중 오류가 발생했어요. 네트워크를 확인해주세요.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      position="fixed"
      {...(isAdminDock
        ? { top: `${ADMIN_SHELL.HEADER_H + (ADMIN_SHELL.MOBILE_BAR_H - ADMIN_SHELL.DOCK_H) / 2}px`, right: 'env(safe-area-inset-right, 0px)' }
        : isAdminSidebarFab
          ? { bottom: `${(ADMIN_SHELL.SIDEBAR_CHATBOT_SLOT_H - 48) / 2}px`, left: `${(ADMIN_SHELL.SIDEBAR_W - 48) / 2}px` }
          : { bottom: { base: 'calc(16px + env(safe-area-inset-bottom, 0px))', md: 6 }, right: { base: 'calc(16px + env(safe-area-inset-right, 0px))', md: 6 } })}
      zIndex={Z_INDEX.CHATBOT}
    >
      {isAdminDock ? (
        <IconButton
          aria-label="챗봇 열기"
          icon={
            <HStack spacing={1.5}>
              <Box w="2px" h="14px" borderRadius="full" bg="whiteAlpha.600" />
              {isOpen ? <CloseIcon boxSize={2.5} /> : <ChatIcon boxSize={3.5} />}
            </HStack>
          }
          colorScheme="brand"
          minW={`${ADMIN_SHELL.DOCK_W}px`}
          w={`${ADMIN_SHELL.DOCK_W}px`}
          h={`${ADMIN_SHELL.DOCK_H}px`}
          pl={1}
          borderLeftRadius="xl"
          borderRightRadius={0}
          border="0"
          boxShadow="-2px 2px 10px rgba(10,27,51,0.22)"
          onClick={() => setIsOpen((prev) => !prev)}
        />
      ) : (
        <IconButton
          aria-label="챗봇 열기"
          icon={isOpen ? <CloseIcon /> : <ChatIcon />}
          colorScheme="brand"
          borderRadius="full"
          size="lg"
          boxShadow="0 4px 12px rgba(0,0,0,0.2)"
          onClick={() => setIsOpen((prev) => !prev)}
        />
      )}
      <Box
        position="absolute"
        {...(isAdminDock
          ? { top: 'calc(100% + 12px)', right: 2 }
          : isAdminSidebarFab
            ? { bottom: 'calc(100% + 12px)', left: 0 }
            : { bottom: 'calc(100% + 12px)', right: 0 })}
        zIndex={Z_INDEX.CHATBOT}
      >
        <Collapse in={isOpen} animateOpacity unmountOnExit>
          <Box
            className="fccg-member"
            w={{ base: '80vw', md: '360px' }}
            maxW="360px"
            bg={bg}
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="2xl"
            overflow="hidden"
          >
            <MatchDayModalHeader label="FCCG ASSISTANT" title="FC CHAL-GGYEO 도우미" subtitle="이용법 · 일정 · 투표 질문" px={4} />
            <Box p={4}>
            <VStack
              spacing={3}
              align="stretch"
              maxH="320px"
              overflowY="auto"
              pr={1}
              mb={3}
              sx={{
                '&::-webkit-scrollbar': {
                  width: '4px'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: 'full'
                }
              }}
            >
              {messages.map((msg, idx) => (
                <Box
                  key={`${msg.from}-${idx}`}
                  alignSelf={msg.from === 'user' ? 'flex-end' : 'flex-start'}
                  bg={msg.from === 'user' ? 'brand.500' : 'gray.50'}
                  color={msg.from === 'user' ? 'white' : 'matchday.navy'}
                  border="1px solid"
                  borderColor={msg.from === 'user' ? 'brand.500' : 'gray.200'}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  borderBottomRightRadius={msg.from === 'user' ? 'sm' : 'lg'}
                  borderBottomLeftRadius={msg.from === 'user' ? 'lg' : 'sm'}
                  maxW="80%"
                  whiteSpace="pre-line"
                  fontSize="sm"
                >
                  {msg.text}
                </Box>
              ))}
              <div ref={messagesEndRef} />
              {loading && (
                <HStack spacing={2} color="gray.500" fontSize="sm">
                  <Spinner size="sm" />
                  <Text>답변을 준비 중입니다...</Text>
                </HStack>
              )}
            </VStack>
            <Textarea
              placeholder="질문을 입력하세요"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              size="sm"
              resize="none"
              rows={3}
              mb={2}
              borderRadius="lg"
              borderColor="gray.200"
              _focusVisible={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            />
            <Button
              w="full"
              h="44px"
              borderRadius="lg"
              fontWeight="800"
              colorScheme="brand"
              bg={buttonColor}
              onClick={handleSend}
              isDisabled={loading || !input.trim()}
            >
              보내기
            </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}

