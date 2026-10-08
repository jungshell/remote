import { useState } from 'react';
import { Box, Button, FormControl, FormLabel, HStack, Icon, IconButton, Input, InputGroup, InputRightElement, SimpleGrid, Text, VStack, useToast } from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { MdOutlineEmail, MdOutlinePerson, MdOutlineSave } from 'react-icons/md';
import { useAuthStore } from '../store/auth';
import { changePassword, updateProfile } from '../api/auth';
import { AdminPageHeader, AdminPanel, RecordTile } from '../components/admin/MatchDay';
import PlayerIdentity, { getPlayerRecord } from '../components/profile/PlayerIdentity';

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const setUser = useAuthStore(s => s.setUser);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const handlePasswordSave = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: '비밀번호가 일치하지 않습니다.', status: 'error', duration: 2000 });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: '비밀번호는 최소 6자 이상이어야 합니다.', status: 'error', duration: 2000 });
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: '비밀번호가 변경되었습니다.', status: 'success', duration: 2000 });
    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error);
      toast({ title: '비밀번호 변경에 실패했습니다.', status: 'error', duration: 2000 });
    } finally {
      setPasswordLoading(false);
    }
  };

  const { gameParticipated, gameTotal, voteParticipated, voteTotal, attendanceRate, voteRate } = getPlayerRecord(user);

  return (
    <Box className="fccg-matchday fccg-member" bg="gray.50" minH="100vh" px={{ base: 4, md: 6 }} pt={{ base: '96px', md: '100px' }} pb={{ base: 8, md: 10 }}>
      <Box maxW="960px" mx="auto">
        <AdminPageHeader eyebrow="MY PROFILE" title="내 프로필" />
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 5 }} mt={{ base: 4, md: 4 }} alignItems="start">
          {/* 좌: identity + 참여 기록 */}
          <VStack align="stretch" spacing={4}>
            <PlayerIdentity user={user} eyebrow="PLAYER PROFILE" />
            <SimpleGrid columns={2} spacing={3}>
              <RecordTile
                accent
                label="경기 출석"
                value={attendanceRate === null ? '—' : attendanceRate}
                unit={attendanceRate === null ? undefined : '%'}
                caption={gameTotal > 0 ? `${gameParticipated}/${gameTotal}경기` : '참여 기록이 쌓이면 표시됩니다'}
              />
              <RecordTile
                accent
                label="투표 참여"
                value={voteRate === null ? '—' : voteRate}
                unit={voteRate === null ? undefined : '%'}
                caption={voteTotal > 0 ? `${voteParticipated}/${voteTotal}회` : '투표 기록이 쌓이면 표시됩니다'}
              />
            </SimpleGrid>
          </VStack>

          {/* 우: 수정 가능한 정보 → 계정 보안 */}
          <VStack align="stretch" spacing={4}>
            <AdminPanel label="ACCOUNT" title="계정 정보 수정">
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
                h="48px"
                leftIcon={<Icon as={MdOutlineSave} boxSize="16px" />}
                onClick={handleSave}
                isLoading={loading}
                isDisabled={!name.trim() || name === user.name}
              >
                저장
              </Button>
            </AdminPanel>

            <AdminPanel label="SECURITY" title="비밀번호 변경">
              <FormControl mb={3}>
                <FormLabel fontSize="sm" color="gray.700">새 비밀번호</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호를 입력하세요"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(v => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <FormControl mb={5}>
                <FormLabel fontSize="sm" color="gray.700">비밀번호 확인</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(v => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <Button
                bg="brand.500"
                color="white"
                _hover={{ bg: 'brand.600' }}
                w="full"
                h="48px"
                leftIcon={<Icon as={MdOutlineSave} boxSize="16px" />}
                onClick={handlePasswordSave}
                isLoading={passwordLoading}
                isDisabled={!newPassword.trim() || !confirmPassword.trim()}
              >
                비밀번호 변경
              </Button>
            </AdminPanel>
          </VStack>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
