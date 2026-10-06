import React, { useState } from 'react';
import {
  Box,
  Button,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  HStack,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  useToast,
  Flex,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { LuEye, LuKeyRound, LuPencil, LuSearch, LuSearchX, LuUserPlus, LuUserX, LuUsers } from 'react-icons/lu';
import { updateMember, deleteMember, resetMemberPassword, getValidToken } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { getApiUrl } from '../config/api';
import { AdminEmptyState, AdminPageHeader, AdminPanel, StatBlock, StatStrip, StatusBadge } from './admin/MatchDay';
import { eventBus, EVENT_TYPES, emitMemberAdded, emitDataRefreshNeeded, emitLoadingStart, emitLoadingEnd, emitAlert } from '../utils/eventBus';

interface Member {
  id: number;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt?: string;
}

interface MemberManagementProps {
  userList: Member[];
  onUserListChange: (users: Member[]) => void;
}

function generateClientTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(randomValues, (value) => chars[value % chars.length]).join('');
}

export default function MemberManagement({ userList, onUserListChange }: MemberManagementProps) {
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [originalMemberData, setOriginalMemberData] = useState<Member | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isViewModalOpen, onOpen: onViewModalOpen, onClose: onViewModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  
  const toast = useToast();
  // 표시 전용 상태 필터 (검색 결과 filteredMembers 위에 한 번 더 거른다)
  const [statusFilter, setStatusFilter] = useState<'ALL' | Member['status']>('ALL');
  
  // 전역 사용자 정보 업데이트를 위한 store
  const { user, setUser } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // editingMember 상태 보존을 위한 useEffect
  React.useEffect(() => {
    // 모달이 열릴 때 원본 데이터가 있으면 복원
    if (isEditModalOpen && originalMemberData && !editingMember) {
      console.log('원본 데이터 복원:', originalMemberData);
      setEditingMember(originalMemberData);
    }
    
    // 컴포넌트가 리렌더링되어도 editingMember 상태 유지
    if (editingMember && !isEditModalOpen) {
      // 모달이 닫혀있어도 상태는 유지
      console.log('editingMember 상태 유지:', editingMember);
    }
  }, [editingMember, isEditModalOpen, originalMemberData]);

  // 검색 필터링
  React.useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMembers(userList);
    } else {
      const filtered = userList.filter(member =>
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, userList]);

  // 회원 정보 수정
  const handleEditMember = (member: Member) => {
    console.log('수정할 회원 정보:', member);
    
    // 원본 데이터 백업 (깊은 복사)
    const originalData = {
      id: member.id,
      name: member.name || '',
      email: member.email || '',
      role: member.role || 'MEMBER',
      status: member.status || 'ACTIVE',
      createdAt: member.createdAt
    };
    
    setOriginalMemberData(originalData);
    
    // 모든 필드를 명시적으로 복사하여 이메일 정보가 누락되지 않도록 함
    setEditingMember({
      id: member.id,
      name: member.name || '',
      email: member.email || '', // 이메일 정보 명시적 복사
      role: member.role || 'MEMBER',
      status: member.status || 'ACTIVE',
      createdAt: member.createdAt
    });
    onEditModalOpen();
  };

  // 회원 정보 저장
  const handleSaveMember = async () => {
    if (!editingMember || isSaving) return;

    setIsSaving(true);
    try {
      if (editingMember.id === 0) {
        // 새 회원 추가 - 이메일 검증 강화
        if (!editingMember.email || !editingMember.email.trim()) {
          toast({
            title: '이메일 주소 필요',
            description: '이메일 주소를 입력해주세요.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return; // 모달 유지
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editingMember.email)) {
          toast({
            title: '이메일 형식 오류',
            description: '올바른 이메일 형식을 입력해주세요.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return; // 모달 유지
        }

        // 백엔드 API 호출
        try {
          const token = getValidToken();
          if (!token) throw new Error('로그인이 필요합니다.');
          const initialPassword = generateClientTempPassword();
          const createMemberUrl = await getApiUrl('/members');
          const response = await fetch(createMemberUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: editingMember.name,
              email: editingMember.email,
              password: initialPassword,
              role: editingMember.role,
              status: editingMember.status
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '회원 추가 실패');
          }
          
          const result = await response.json();
          
          // 성공 메시지
          toast({
            title: '회원 추가 완료',
            description: `새 회원이 추가되었습니다. 임시 비밀번호: ${result.initialPassword || initialPassword}`,
            status: 'success',
            duration: 8000,
            isClosable: true,
          });
          
          // 모달 닫기 및 상태 초기화
          onEditModalClose();
          setEditingMember(null);
          setOriginalMemberData(null);
          
          // 회원 목록 새로고침 (페이지 이동 없이)
          try {
            // 새로 추가된 회원 정보를 포함하여 목록 업데이트
            const newMember = result.member;
            
            const updatedList = [...userList, newMember];
            onUserListChange(updatedList);
            
            // 🔄 이벤트 시스템으로 다른 페이지에 동기화 알림
            emitMemberAdded(newMember);
            emitDataRefreshNeeded('members');
            emitAlert(`새 회원 "${newMember.name}"이 추가되었습니다.`, 'success');
            
            console.log('회원 목록 업데이트 완료:', updatedList.length, '명');
          } catch (error) {
            console.error('회원 목록 업데이트 실패:', error);
            // 실패 시에만 페이지 새로고침
            window.location.reload();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '회원 추가 중 오류가 발생했습니다.';
          toast({
            title: '회원 추가 실패',
            description: errorMessage,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          // 모달 유지 - 사용자가 수정할 수 있도록
        }
      } else {
        // 기존 회원 정보 수정 - 직접 백엔드 API 호출
        console.log('회원 정보 수정 API 호출:', editingMember.id, {
          name: editingMember.name,
          email: editingMember.email,
          role: editingMember.role || 'MEMBER',
          status: editingMember.status || 'ACTIVE'
        });
        
        // 인증 토큰 확인
        const token = localStorage.getItem('token');
        if (!token) {
          toast({
            title: '인증 오류',
            description: '로그인이 필요합니다. 다시 로그인해주세요.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        
        // 직접 백엔드 API 호출
        try {
          const apiUrl = await getApiUrl(`/members/${editingMember.id}`);
          const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: editingMember.name,
              email: editingMember.email,
              role: editingMember.role || 'MEMBER',
              status: editingMember.status || 'ACTIVE'
            })
          });
          
          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch (e) {
              errorData = { error: `서버 오류 (${response.status})` };
            }
            throw new Error(errorData.error || '회원 정보 수정 실패');
          }
          
          let result;
          try {
            result = await response.json();
          } catch (e) {
            console.error('JSON 파싱 오류:', e);
            throw new Error('서버 응답을 파싱할 수 없습니다.');
          }
          console.log('API 응답:', result);
          
          // API 응답으로 업데이트된 회원 정보로 목록 갱신
          const updatedList = userList.map(user =>
            user.id === editingMember.id ? { ...editingMember, ...result.member } : user
          );
          onUserListChange(updatedList);
          
          // 현재 로그인한 사용자의 정보가 수정된 경우 전역 상태도 업데이트
          if (user && user.id === editingMember.id) {
            setUser({
              ...user,
              name: editingMember.name,
              email: editingMember.email,
              role: editingMember.role || 'MEMBER',
              status: editingMember.status || 'ACTIVE'
            });
          }
          
          toast({
            title: '회원 정보 수정 완료',
            description: '회원 정보가 성공적으로 수정되었습니다.',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          
          onEditModalClose();
          setEditingMember(null);
          setOriginalMemberData(null);
          // 전역 동기화 이벤트 발행
          try { window.dispatchEvent(new CustomEvent('membersChanged')); } catch {}
        } catch (error) {
          console.error('회원 정보 수정 API 오류:', error);
          const errorMessage = error instanceof Error ? error.message : '회원 정보 수정 중 오류가 발생했습니다.';
          toast({
            title: '회원 정보 수정 실패',
            description: errorMessage,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      console.error('회원 정보 저장 오류:', error);
      toast({
        title: '회원 정보 저장 실패',
        description: '회원 정보 저장 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 비밀번호 초기화
  const handleResetPassword = async (memberId: number) => {
    if (!memberId) return;
    
    // 인증 토큰 확인
    const token = getValidToken();
    if (!token) {
      toast({
        title: '인증 오류',
        description: '로그인이 필요합니다. 다시 로그인해주세요.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsResettingPassword(true);
    
    try {
      const response = await resetMemberPassword(memberId);
      
      toast({
        title: '비밀번호 초기화 완료',
        description: response?.newPassword
          ? `새 비밀번호: ${response.newPassword}`
          : '비밀번호가 초기화되었습니다.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('비밀번호 초기화 오류:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : '비밀번호 초기화 중 오류가 발생했습니다.';
      toast({
        title: '비밀번호 초기화 실패',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 회원 삭제
  const handleDeleteMember = async () => {
    if (!selectedMember || isDeleting) return;

    // 인증 토큰 확인
    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: '인증 오류',
        description: '로그인이 필요합니다. 다시 로그인해주세요.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsDeleting(true);
    try {
      // API 호출로 실제 삭제
      await deleteMember(selectedMember.id);
      
      // 성공 시 로컬 상태에서도 제거
      const updatedList = userList.filter(user => user.id !== selectedMember.id);
      onUserListChange(updatedList);
      
      toast({
        title: '탈퇴 처리 완료',
        description: '회원이 탈퇴 처리되었습니다. 기존 활동 기록은 보존됩니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onDeleteModalClose();
      setSelectedMember(null);
      // 전역 동기화 이벤트 발행
      try { window.dispatchEvent(new CustomEvent('membersChanged')); } catch {}
    } catch (error) {
      console.error('회원 삭제 오류:', error);
      toast({
        title: '탈퇴 처리 실패',
        description: error instanceof Error ? error.message : '탈퇴 처리 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 표시 전용 집계 (userList 그대로, 계산 규칙 변경 없음)
  const statusCounts = {
    ACTIVE: userList.filter(m => m.status === 'ACTIVE').length,
    INACTIVE: userList.filter(m => m.status === 'INACTIVE').length,
    SUSPENDED: userList.filter(m => m.status === 'SUSPENDED').length,
    DELETED: userList.filter(m => m.status === 'DELETED').length,
  };
  const displayedMembers = statusFilter === 'ALL'
    ? filteredMembers
    : filteredMembers.filter(m => m.status === statusFilter);
  const filterChips: { key: 'ALL' | Member['status']; label: string; count: number }[] = [
    { key: 'ALL', label: '전체', count: userList.length },
    { key: 'ACTIVE', label: '활성', count: statusCounts.ACTIVE },
    { key: 'INACTIVE', label: '비활성', count: statusCounts.INACTIVE },
    { key: 'SUSPENDED', label: '정지', count: statusCounts.SUSPENDED },
    // /members 응답은 탈퇴(DELETED) 회원을 제외하므로, 실제로 있을 때만 보조 필터를 노출
    ...(statusCounts.DELETED > 0 ? [{ key: 'DELETED' as const, label: '삭제됨', count: statusCounts.DELETED }] : []),
  ];
  const formatJoined = (createdAt?: string) => (createdAt ? new Date(createdAt).toLocaleDateString('ko-KR') : '-');
  // 모바일 카드용 짧은 가입일: 2026.01.10
  const formatJoinedShort = (createdAt?: string) => {
    if (!createdAt) return '-';
    const d = new Date(createdAt);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  const editLocked = (member: Member) => !isSuperAdmin && member.role !== 'MEMBER';
  const editTooltip = (member: Member) => (editLocked(member) ? '관리자 계정 수정은 슈퍼관리자만 가능합니다.' : '회원 정보 수정');
  const openView = (member: Member) => {
    setSelectedMember(member);
    onViewModalOpen();
  };
  const openDelete = (member: Member) => {
    setSelectedMember(member);
    onDeleteModalOpen();
  };
  const openAdd = () => {
    setEditingMember({
      id: 0,
      name: '',
      email: '',
      role: 'MEMBER',
      status: 'ACTIVE'
    });
    onEditModalOpen();
  };

  return (
    <Box className="fccg-matchday fccg-admin">
      <VStack spacing={5} align="stretch">
        <AdminPageHeader
          eyebrow="SQUAD MANAGEMENT"
          title="회원 관리"
          description="회원 상태와 권한을 관리합니다."
          right={
            <Button size="sm" bg="brand.500" color="white" _hover={{ bg: 'brand.600' }} leftIcon={<Icon as={LuUserPlus} />} onClick={openAdd}>
              회원 추가
            </Button>
          }
        />

        <StatStrip columns={4}>
          <StatBlock label="TOTAL" caption="전체 회원" value={userList.length} unit="명" />
          <StatBlock label="ACTIVE" caption="활성" value={statusCounts.ACTIVE} unit="명" />
          <StatBlock label="INACTIVE" caption="비활성" value={statusCounts.INACTIVE} unit="명" />
          <StatBlock label="SUSPENDED" caption="정지" value={statusCounts.SUSPENDED} unit="명" />
        </StatStrip>

        <AdminPanel p={0} overflow="hidden">
          {/* 검색 + 상태 필터 */}
          <Flex direction={{ base: 'column', md: 'row' }} gap={3} justify="space-between" align={{ base: 'stretch', md: 'center' }} p={{ base: 4, md: 5 }} borderBottom="1px solid" borderColor="gray.100">
            <InputGroup maxW={{ md: '320px' }}>
              <InputLeftElement pointerEvents="none">
                <Icon as={LuSearch} color="gray.400" boxSize={4} />
              </InputLeftElement>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이름, 이메일, 등급으로 검색"
                bg="white"
              />
            </InputGroup>
            <HStack spacing={2} flexWrap="wrap" role="group" aria-label="회원 상태 필터">
              {filterChips.map(chip => {
                const active = statusFilter === chip.key;
                return (
                  <Button
                    key={chip.key}
                    size="sm"
                    borderRadius="full"
                    aria-pressed={active}
                    bg={active ? 'matchday.navy' : 'white'}
                    color={active ? 'white' : 'gray.600'}
                    border="1px solid"
                    borderColor={active ? 'matchday.navy' : 'gray.200'}
                    _hover={{ borderColor: 'matchday.navy' }}
                    fontWeight="600"
                    onClick={() => setStatusFilter(chip.key)}
                  >
                    {chip.label}
                    <Text as="span" ml={1.5} fontFamily="display" fontWeight="700" color={active ? 'matchday.volt' : 'gray.400'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {chip.count}
                    </Text>
                  </Button>
                );
              })}
            </HStack>
          </Flex>

          {userList.length === 0 ? (
            <AdminEmptyState
              icon={LuUsers}
              title="등록된 회원이 없습니다"
              description="첫 회원을 추가해 스쿼드를 구성해 보세요."
              action={<Button size="sm" bg="brand.500" color="white" _hover={{ bg: 'brand.600' }} leftIcon={<Icon as={LuUserPlus} />} onClick={openAdd}>회원 추가</Button>}
            />
          ) : displayedMembers.length === 0 ? (
            <AdminEmptyState
              icon={LuSearchX}
              title="조건에 맞는 회원이 없습니다"
              description="검색어나 상태 필터를 바꿔 보세요."
              action={<Button size="sm" variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}>필터 초기화</Button>}
            />
          ) : (
            <>
              {/* 데스크톱: 테이블 */}
              <TableContainer display={{ base: 'none', md: 'block' }}>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      {['이름', '이메일', '등급', '상태', '가입일'].map(h => (
                        <Th key={h} textStyle="scoreLabel" fontSize="10px" color="gray.500" py={3}>{h}</Th>
                      ))}
                      {/* 작업 열 pr: desktop(lg+) 우하단 챗봇 버튼(right 24px + 48px)과 겹치지 않도록 이 열에만 여백 */}
                      <Th textStyle="scoreLabel" fontSize="10px" color="gray.500" py={3} textAlign="right" pr={{ base: 4, lg: 12 }}>작업</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {displayedMembers.map((member) => (
                      <Tr key={member.id} _hover={{ bg: 'gray.50' }}>
                        <Td py={3}><Text fontWeight="700" color="matchday.navy">{member.name}</Text></Td>
                        <Td py={3}><Text fontSize="sm" color="gray.600">{member.email || '-'}</Text></Td>
                        <Td py={3}><StatusBadge kind="role" value={member.role} /></Td>
                        <Td py={3}><StatusBadge kind="status" value={member.status} /></Td>
                        <Td py={3}><Text fontSize="sm" color="gray.500" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatJoined(member.createdAt)}</Text></Td>
                        <Td py={3} pr={{ base: 4, lg: 12 }}>
                          <HStack spacing={1} justify="flex-end">
                            <Tooltip label="회원 정보 보기" placement="top" hasArrow bg="matchday.navy" color="white" fontSize="sm">
                              <IconButton aria-label="회원 정보 보기" icon={<Icon as={LuEye} />} size="sm" variant="ghost" color="gray.600" onClick={() => openView(member)} />
                            </Tooltip>
                            <Tooltip label={editTooltip(member)} placement="top" hasArrow bg="matchday.navy" color="white" fontSize="sm">
                              <IconButton aria-label="회원 정보 수정" icon={<Icon as={LuPencil} />} size="sm" variant="ghost" color="brand.500" isDisabled={editLocked(member)} onClick={() => handleEditMember(member)} />
                            </Tooltip>
                            {isSuperAdmin && (
                              <Tooltip label="탈퇴 처리" placement="top" hasArrow bg="red.600" color="white" fontSize="sm">
                                <IconButton aria-label="탈퇴 처리" icon={<Icon as={LuUserX} />} size="sm" variant="ghost" color="red.500" _hover={{ bg: 'red.50' }} onClick={() => openDelete(member)} />
                              </Tooltip>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>

              {/* 모바일: 카드 리스트 */}
              <VStack display={{ base: 'flex', md: 'none' }} spacing={0} align="stretch" divider={<Box borderBottom="1px solid" borderColor="gray.100" />}>
                {displayedMembers.map((member) => (
                  <Box key={member.id} px={4} py={4}>
                    <Flex justify="space-between" align="flex-start" gap={3}>
                      <Box minW={0}>
                        <Text fontWeight="800" fontSize="md" color="matchday.navy" noOfLines={1}>{member.name}</Text>
                        <Text fontSize="sm" color="gray.500" noOfLines={1}>{member.email || '-'}</Text>
                      </Box>
                      <HStack spacing={1.5} flexShrink={0}>
                        <StatusBadge kind="role" value={member.role} />
                        <StatusBadge kind="status" value={member.status} />
                      </HStack>
                    </Flex>
                    <Flex justify="space-between" align="center" mt={3} gap={2}>
                      <Text fontSize="xs" color="gray.400" whiteSpace="nowrap" sx={{ fontVariantNumeric: 'tabular-nums' }}>가입 {formatJoinedShort(member.createdAt)}</Text>
                      {/* 터치 영역 44px, 아이콘은 18px 유지. pr: 관리자 모바일 챗봇 edge dock(우측 38px)과 겹치지 않게 */}
                      <HStack spacing={1} flexShrink={0} pr={{ base: 3, lg: 0 }}>
                        <IconButton aria-label="회원 정보 보기" icon={<Icon as={LuEye} boxSize="18px" />} minW="44px" h="44px" variant="ghost" color="gray.600" _hover={{ bg: 'gray.100' }} onClick={() => openView(member)} />
                        <IconButton aria-label={editTooltip(member)} icon={<Icon as={LuPencil} boxSize="18px" />} minW="44px" h="44px" variant="ghost" color="brand.500" isDisabled={editLocked(member)} onClick={() => handleEditMember(member)} />
                        {isSuperAdmin && (
                          <IconButton aria-label="탈퇴 처리" icon={<Icon as={LuUserX} boxSize="18px" />} minW="44px" h="44px" variant="ghost" color="red.500" _hover={{ bg: 'red.50' }} onClick={() => openDelete(member)} />
                        )}
                      </HStack>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </>
          )}
        </AdminPanel>
      </VStack>

      {/* 회원 정보 수정 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          // 모달 닫기 시 상태 초기화하지 않음 (데이터 보존)
          onEditModalClose();
        }}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent mx={4} className="fccg-admin">
          <ModalHeader color="matchday.navy" fontWeight="800">
            {editingMember?.id === 0 ? '새 회원 추가' : '회원 정보 수정'}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>이름</FormLabel>
                <Input
                  value={editingMember?.name || ''}
                  onChange={(e) => setEditingMember(prev => prev ? {...prev, name: e.target.value} : null)}
                  placeholder="회원 이름을 입력하세요"
                />
              </FormControl>

              <FormControl>
                <FormLabel>이메일</FormLabel>
                <Input
                  value={editingMember?.email || ''}
                  onChange={(e) => setEditingMember(prev => prev ? {...prev, email: e.target.value} : null)}
                  placeholder="이메일을 입력하세요"
                  type="email"
                />
              </FormControl>

              <FormControl>
                <FormLabel>등급</FormLabel>
                <Select
                  value={editingMember?.role || 'MEMBER'}
                  onChange={(e) => setEditingMember(prev => prev ? {...prev, role: e.target.value as any} : null)}
                  isDisabled={!isSuperAdmin}
                >
                  <option value="MEMBER">회원</option>
                  <option value="ADMIN">관리자</option>
                  <option value="SUPER_ADMIN">슈퍼관리자</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>상태</FormLabel>
                <Select
                  value={editingMember?.status || 'ACTIVE'}
                  onChange={(e) => setEditingMember(prev => prev ? {...prev, status: e.target.value as any} : null)}
                >
                  <option value="ACTIVE">활성</option>
                  <option value="INACTIVE">비활성</option>
                  <option value="SUSPENDED">정지</option>
                </Select>
              </FormControl>

              {/* Danger Zone: 비밀번호 초기화 (기존 회원 수정 시, 슈퍼관리자만) */}
              {isSuperAdmin && editingMember?.id !== 0 && (
                <Box w="100%" mt={2} p={4} borderRadius="lg" border="1px solid" borderColor="red.200" bg="red.50">
                  <Text textStyle="scoreLabel" fontSize="10px" color="red.600">DANGER ZONE</Text>
                  <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'stretch', sm: 'center' }} gap={3} mt={2}>
                    <Box>
                      <Text fontWeight="700" fontSize="sm" color="gray.800">비밀번호 초기화</Text>
                      <Text fontSize="xs" color="gray.600" mt={0.5}>초기화된 비밀번호는 토스트 메시지로 표시됩니다.</Text>
                    </Box>
                    <Button
                      leftIcon={<Icon as={LuKeyRound} />}
                      variant="outline"
                      borderColor="red.300"
                      color="red.600"
                      bg="white"
                      _hover={{ bg: 'red.50' }}
                      size="sm"
                      flexShrink={0}
                      onClick={() => handleResetPassword(editingMember.id)}
                      isLoading={isResettingPassword}
                      loadingText="초기화 중..."
                    >
                      비밀번호 초기화
                    </Button>
                  </Flex>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter gap={3} borderTop="1px solid" borderColor="gray.100" mt={4}>
            <Button
              variant="ghost"
              color="gray.600"
              isDisabled={isSaving}
              onClick={() => {
                // 취소 시에도 상태 초기화하지 않음 (데이터 보존)
                onEditModalClose();
              }}
            >
              취소
            </Button>
            <Button bg="brand.500" color="white" _hover={{ bg: 'brand.600' }} onClick={handleSaveMember} isLoading={isSaving} loadingText="저장 중...">
              저장
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 회원 정보 보기 모달 */}
      <Modal isOpen={isViewModalOpen} onClose={onViewModalClose} size="lg">
        <ModalOverlay />
        <ModalContent mx={4} className="fccg-admin">
          <ModalHeader color="matchday.navy" fontWeight="800">회원 정보</ModalHeader>
          <ModalBody>
            {selectedMember && (
              <VStack spacing={4} align="stretch">
                {[
                  { label: 'NAME', value: <Text fontWeight="700">{selectedMember.name}</Text> },
                  { label: 'EMAIL', value: <Text>{selectedMember.email}</Text> },
                  { label: 'ROLE', value: <StatusBadge kind="role" value={selectedMember.role} /> },
                  { label: 'STATUS', value: <StatusBadge kind="status" value={selectedMember.status} /> },
                  { label: 'JOINED', value: <Text>{formatJoined(selectedMember.createdAt)}</Text> },
                ].map(row => (
                  <Box key={row.label}>
                    <Text textStyle="scoreLabel" fontSize="10px" color="gray.500" mb={1.5}>{row.label}</Text>
                    {row.value}
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.100" mt={4}>
            <Button variant="ghost" color="gray.600" onClick={onViewModalClose}>닫기</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 회원 탈퇴 처리 확인 모달 (DELETE API = 탈퇴 처리) */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && onDeleteModalClose()}>
        <ModalOverlay />
        <ModalContent mx={4} className="fccg-admin">
          <ModalHeader color="matchday.navy" fontWeight="800">회원 탈퇴 처리</ModalHeader>
          <ModalBody>
            <Alert status="warning" alignItems="flex-start" borderRadius="lg">
              <AlertIcon />
              <VStack align="start" spacing={2}>
                <Text><strong>{selectedMember?.name}</strong> 회원을 탈퇴 처리하시겠습니까?</Text>
                <Text fontSize="sm">
                  탈퇴 처리 후 이 계정으로는 로그인할 수 없으며, 이름·이메일·연락처 등 개인정보는 익명화됩니다. 경기·출석·사진·댓글 등 FC CGG의 기존 활동 기록은 보존되며 작성자는 '탈퇴회원'으로 표시됩니다. 아직 집계가 완료되지 않은 투표의 참여 기록만 제외됩니다.
                </Text>
                <Text fontSize="sm" fontWeight="bold">이 작업은 되돌릴 수 없습니다.</Text>
              </VStack>
            </Alert>
          </ModalBody>
          <ModalFooter gap={3} borderTop="1px solid" borderColor="gray.100" mt={4}>
            <Button variant="ghost" color="gray.600" onClick={onDeleteModalClose} isDisabled={isDeleting}>
              취소
            </Button>
            <Button colorScheme="red" onClick={handleDeleteMember} isLoading={isDeleting} loadingText="처리 중...">
              탈퇴 처리
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
