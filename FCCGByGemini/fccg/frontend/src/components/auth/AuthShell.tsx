import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { CggShieldTemp, PitchLines } from '../admin/MatchDay';

// 로그인/회원가입 공통 외형: Match Day 남색 무대 + 엠블럼 + 흰 카드.
// 페이지(/login, /signup)와 Header 모달 양쪽에서 같은 컴포넌트를 쓴다. inModal이면 높이를 내용에 맞춘다.
export default function AuthShell({
  title,
  description,
  inModal,
  topRight,
  children,
}: {
  title: string;
  description?: string;
  inModal?: boolean;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      className="fccg-matchday fccg-member"
      position="relative"
      overflow="hidden"
      bg="matchday.navy"
      borderRadius={inModal ? 'xl' : 0}
      {...(inModal ? {} : { minH: '100vh' })}
      w="full"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 4, md: 8 }}
      py={{ base: inModal ? 6 : 10, md: inModal ? 8 : 12 }}
    >
      <PitchLines opacity={0.07} />
      {topRight}
      <Box position="relative" w="full" maxW="380px">
        <Flex direction="column" align="center" mb={{ base: 4, md: 5 }}>
          <CggShieldTemp size={inModal ? 36 : 44} />
          <Text textStyle="scoreLabel" color="matchday.volt" mt={3}>FC CHAL-GGYEO</Text>
        </Flex>
        <Box bg="white" borderRadius="xl" px={{ base: 5, md: 7 }} py={{ base: 6, md: 7 }}>
          <Text fontSize="2xl" fontWeight="800" color="matchday.navy" letterSpacing="-0.02em" textAlign="center">
            {title}
          </Text>
          {description && (
            <Text fontSize="sm" color="gray.500" textAlign="center" mt={1}>{description}</Text>
          )}
          <Box mt={6}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
