import { useState } from 'react';
import { Avatar, Box, Button, FormControl, FormLabel, HStack, Icon, Input, Text, VStack, useToast } from '@chakra-ui/react';
import { MdOutlineBadge, MdOutlineEmail, MdOutlinePerson, MdOutlineSave } from 'react-icons/md';
import { useAuthStore } from '../store/auth';
import { updateProfile } from '../api/auth';

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: '총괄관리자',
  ADMIN: '관리자',
  MEMBER: '회원',
};

const formatJoinedDate = (value?: string) => {
  if (!value) return '가입일 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '가입일 정보 없음';
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}. 가입`;
};

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const setUser = useAuthStore(s => s.setUser);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!user || !token) {
    return (
      <Box maxW="480px" mx="auto" mt={12} px={4} py={10} textAlign="center">
        <Icon as={MdOutlinePerson} boxSize="32px" color="gray.400" mb={2} />
        <Text color="gray.600" fontWeight="medium">로그인이 필요합니다.</Text>
      </Box>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await updateProfile({ name });
      // 백엔드 응답 형식: { success: true, message: '...', user: {...} }
      const updatedUser = response.user || response;
      setUser(updatedUser);
      toast({ title: '이름이 수정되었습니다.', status: 'success', duration: 2000 });
    } catch (error: any) {
      console.error('프로필 업데이트 오류:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '이름 수정 실패';
      toast({ title: errorMessage, status: 'error', duration: 2000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="480px" mx="auto" mt={{ base: 6, md: 12 }} px={4} pb={10}>
      {/* Player Identity Header — 옅은 brand accent, PlayerPassportPanel의 강한 hero와 구분되는 톤 */}
      <HStack
        spacing={4}
        align="center"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderLeft="3px solid"
        borderLeftColor="brand.500"
        borderRadius="lg"
        boxShadow="sm"
        px={5}
        py={4}
        mb={4}
      >
        <Avatar name={user.name} src={user.avatarUrl} size="md" bg="brand.50" color="brand.600" fontWeight="800" />
        <VStack align="start" spacing={0} minW={0}>
          <HStack spacing={1.5}>
            <Icon as={MdOutlineBadge} boxSize="14px" color="brand.500" />
            <Text fontSize="xs" color="brand.600" fontWeight="700" letterSpacing="0.04em">
              PLAYER PROFILE
            </Text>
          </HStack>
          <Text fontSize="lg" fontWeight="800" color="gray.800" noOfLines={1}>
            {user.name}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {roleLabel[user.role] || '회원'} · {formatJoinedDate(user.createdAt)}
          </Text>
        </VStack>
      </HStack>

      {/* 계정 정보 수정 — Functional UI, 중립 surface */}
      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" boxShadow="sm" p={6}>
        <Text fontWeight="bold" fontSize="md" color="gray.800" mb={4}>
          계정 정보 수정
        </Text>
        <FormControl mb={3}>
          <FormLabel display="flex" alignItems="center" gap={1.5} fontSize="sm" color="gray.700">
            <Icon as={MdOutlinePerson} boxSize="14px" color="gray.500" />
            이름
          </FormLabel>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요" />
        </FormControl>
        <HStack spacing={1.5} mb={5} color="gray.500">
          <Icon as={MdOutlineEmail} boxSize="12px" />
          <Text fontSize="xs" wordBreak="break-all">{user.email}</Text>
        </HStack>
        <Button
          bg="brand.500"
          color="white"
          _hover={{ bg: 'brand.600' }}
          w="full"
          leftIcon={<Icon as={MdOutlineSave} boxSize="16px" />}
          onClick={handleSave}
          isLoading={loading}
          isDisabled={!name.trim() || name === user.name}
        >
          저장
        </Button>
      </Box>
    </Box>
  );
}
