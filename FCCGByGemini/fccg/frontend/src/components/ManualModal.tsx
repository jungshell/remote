import React, { useState } from 'react';
import type { IconType } from 'react-icons';
import {
  MdOutlineSportsSoccer,
  MdOutlineHome,
  MdOutlineGroup,
  MdOutlineGroupAdd,
  MdOutlineGroups,
  MdOutlineEmojiEvents,
  MdOutlineHowToVote,
  MdOutlineCalendarMonth,
  MdOutlineEditCalendar,
  MdOutlineBarChart,
  MdOutlineTrendingUp,
  MdOutlineCheckCircle,
  MdOutlineTouchApp,
  MdOutlineSchedule,
  MdOutlineLock,
  MdOutlineRefresh,
  MdOutlineBlock,
  MdOutlineWarningAmber,
  MdOutlinePhotoCamera,
  MdOutlineVisibility,
  MdOutlineSearch,
  MdOutlineVideoLibrary,
  MdOutlinePhone,
  MdOutlineChatBubbleOutline,
  MdOutlineEdit,
  MdOutlineKey,
  MdOutlineDeleteOutline,
  MdOutlineStopCircle,
  MdOutlineSave,
  MdOutlineAddCircle,
  MdOutlineDescription,
  MdOutlineEmail,
  MdOutlineSms,
  MdOutlineAdminPanelSettings,
  MdOutlineInsights,
  MdOutlineScoreboard,
  MdOutlineInfo,
} from 'react-icons/md';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  SimpleGrid,
  Icon,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { Card } from './common';
import { PitchLines } from './admin/MatchDay';

type ManualModalProps = {
  isOpen: boolean;
  onClose: () => void;
  variant: 'member' | 'admin';
};

// 모든 섹션/카드/스텝이 공유하는 단일 아이콘 타일 — brand.50 배경 + brand.600 라인 아이콘.
// 크기만 다르게 써서(섹션 타이틀은 크게, 리스트 행은 작게) 위계를 표현하고, 색은 반복하지 않는다.
const IconTile = ({
  icon,
  tileSize = 32,
  iconSize = 18,
}: {
  icon: IconType;
  tileSize?: number;
  iconSize?: number;
}) => (
  <Flex
    boxSize={`${tileSize}px`}
    align="center"
    justify="center"
    bg="brand.50"
    color="brand.600"
    borderRadius="md"
    flexShrink={0}
    _dark={{ bg: 'brand.900', color: 'brand.200' }}
  >
    <Icon as={icon} boxSize={`${iconSize}px`} />
  </Flex>
);

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: IconType;
  title: string;
  description: string;
}) => (
  <Card variant="tight" borderRadius="md" boxShadow="sm">
    <HStack spacing={2} mb={1} align="center">
      <IconTile icon={icon} tileSize={28} iconSize={16} />
      <Text fontWeight="bold" fontSize="sm" color="gray.800" _dark={{ color: 'gray.100' }}>
        {title}
      </Text>
    </HStack>
    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} lineHeight="1.3">
      {description}
    </Text>
  </Card>
);

const StepCard = ({
  icon,
  title,
  description,
}: {
  icon: IconType;
  title: string;
  description: string;
}) => (
  <HStack spacing={2.5} align="flex-start" py={0.5}>
    <IconTile icon={icon} tileSize={26} iconSize={15} />
    <Box flex={1}>
      <Text fontWeight="semibold" fontSize="sm" lineHeight="1.2" color="gray.800" _dark={{ color: 'gray.100' }}>
        {title}
      </Text>
      <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} lineHeight="1.3" mt={0.5}>
        {description}
      </Text>
    </Box>
  </HStack>
);

// 섹션(홈 대시보드/일정 관리/갤러리) 안의 중간 그룹 컨테이너 — pastel 배경 대신
// 중립 surface(Card) + 아이콘/타이틀만으로 구분한다.
const GuideGroup = ({
  icon,
  title,
  children,
}: {
  icon: IconType;
  title: string;
  children: React.ReactNode;
}) => (
  <Card variant="compact" boxShadow="sm">
    <HStack spacing={2} mb={1.5}>
      <IconTile icon={icon} tileSize={26} iconSize={15} />
      <Text fontWeight="bold" fontSize="sm" color="gray.800" _dark={{ color: 'gray.100' }}>
        {title}
      </Text>
    </HStack>
    <VStack align="stretch" spacing={1}>
      {children}
    </VStack>
  </Card>
);

const SectionHeading = ({ icon, title }: { icon: IconType; title: string }) => (
  <HStack spacing={2} mb={2}>
    <IconTile icon={icon} tileSize={32} iconSize={18} />
    <Text fontSize="lg" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>
      {title}
    </Text>
  </HStack>
);

export default function ManualModal({ isOpen, onClose, variant }: ManualModalProps) {
  const title = variant === 'member' ? 'FCGG 이용 가이드' : '관리자 운영 매뉴얼';
  const chip =
    variant === 'member' ? (
      <Badge
        bg="whiteAlpha.300"
        color="white"
        px={2.5}
        py={0.5}
        borderRadius="md"
        fontSize="2xs"
        fontWeight="600"
      >
        회원용
      </Badge>
    ) : null;

  // 관리자 탭 상태
  const [adminTabIndex, setAdminTabIndex] = useState(0);

  // (요청) 풋살현황판 탭만 줄바꿈 처리

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent className="fccg-member" bg="white" _dark={{ bg: 'gray.800' }} borderRadius="xl" overflow="hidden" boxShadow="lg" mx={{ base: 3, md: 'auto' }}>
        <ModalHeader
          className="fccg-matchday"
          position="relative"
          overflow="hidden"
          flexShrink={0}
          bg="matchday.navy"
          color="white"
          py={3.5}
          px={5}
        >
          <PitchLines opacity={0.08} />
          <HStack spacing={3} align="center" position="relative" pr={8}>
            <Flex boxSize="40px" align="center" justify="center" bg="whiteAlpha.200" borderRadius="md" flexShrink={0}>
              <Icon as={MdOutlineSportsSoccer} boxSize="20px" color="white" />
            </Flex>
            <VStack align="start" spacing={0}>
              <Text textStyle="scoreLabel" fontSize="10px" color="matchday.volt">
                FC CHAL-GGYEO
              </Text>
              <Text fontSize="lg" fontWeight="800" lineHeight="1.3" mt={1}>
                {title}
              </Text>
            </VStack>
            {chip}
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" _hover={{ bg: 'whiteAlpha.300' }} size="md" top={4} />
        <ModalBody p={4}>
          {variant === 'member' ? (
            <VStack align="stretch" spacing={3}>
              {/* 홈 섹션 */}
              <Box>
                <SectionHeading icon={MdOutlineHome} title="홈 대시보드" />
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                  <FeatureCard icon={MdOutlineGroup} title="총 멤버" description="현재 가입 인원 수" />
                  <FeatureCard icon={MdOutlineSportsSoccer} title="이번주 경기" description="확정된 경기 날짜/장소" />
                  <FeatureCard icon={MdOutlineEmojiEvents} title="총 경기수" description="누적 경기 횟수" />
                  <FeatureCard icon={MdOutlineHowToVote} title="다음주 투표" description="현재 활성화된 투표 기간" />
                </SimpleGrid>
              </Box>

              {/* 일정 섹션 */}
              <Box>
                <SectionHeading icon={MdOutlineCalendarMonth} title="일정 관리" />

                <VStack spacing={2} align="stretch">
                  <GuideGroup icon={MdOutlineBarChart} title="이번주 일정 섹션">
                    <StepCard icon={MdOutlineTrendingUp} title="투표 결과 요약" description="지난주 투표 결과를 요일별로 표시" />
                  </GuideGroup>

                  <GuideGroup icon={MdOutlineEditCalendar} title="달력">
                    <StepCard icon={MdOutlineCheckCircle} title="확정 경기만 표시" description="확정된 경기만 캘린더에 표시" />
                    <StepCard icon={MdOutlineTouchApp} title="상세 정보 확인" description="일정 탭 시 날짜/장소/참여 인원 확인" />
                  </GuideGroup>

                  <GuideGroup icon={MdOutlineHowToVote} title="다음주 일정 투표">
                    <StepCard icon={MdOutlineSchedule} title="투표 기간 표시" description="현재 진행 중인 투표 기간 표시" />
                    <StepCard icon={MdOutlineLock} title="로그인 필요" description="투표는 로그인 후 가능" />
                    <StepCard icon={MdOutlineBarChart} title="투표 현황" description="각 요일별 투표자 수와 참여율 확인" />
                    <StepCard icon={MdOutlineRefresh} title="재투표 가능" description="이미 투표한 경우 '재투표하기' 버튼으로 수정" />
                    <StepCard icon={MdOutlineBlock} title="공휴일 자동 차단" description="공휴일은 자동으로 빨간색 표시되며 선택 불가" />
                    <StepCard icon={MdOutlineWarningAmber} title="요일 차단 안내" description="관리자가 차단한 요일은 빨간색으로 표시되고 차단 사유 확인 가능" />
                  </GuideGroup>
                </VStack>
              </Box>

              {/* 갤러리 섹션 */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                <GuideGroup icon={MdOutlinePhotoCamera} title="사진 갤러리">
                  <StepCard icon={MdOutlineVisibility} title="공개 열람" description="누구나 열람 가능" />
                  <StepCard icon={MdOutlineSearch} title="상세 보기" description="카드 탭 시 큰 이미지 보기" />
                  <StepCard icon={MdOutlineLock} title="업로드" description="로그인 후 업로드 가능" />
                </GuideGroup>

                <GuideGroup icon={MdOutlineVideoLibrary} title="동영상 갤러리">
                  <StepCard icon={MdOutlinePhone} title="업로드 문의" description="관리자에게 문의 (관리자 : 강병우, 정성인)" />
                </GuideGroup>
              </SimpleGrid>

              {/* 문의 섹션 */}
              <Box textAlign="center" p={2} bg="gray.50" _dark={{ bg: 'gray.700' }} rounded="md">
                <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                  <Icon as={MdOutlineChatBubbleOutline} boxSize="14px" mr={1} verticalAlign="-2px" />
                  문의사항이 있으시면 관리자에게 DM 주세요! (관리자 : 강병우, 정성인)
                </Text>
              </Box>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={3}>
              <Tabs index={adminTabIndex} onChange={setAdminTabIndex} colorScheme="blue" variant="enclosed" isFitted>
                <TabList w="100%" mb={2} borderBottom="none">
                  {['대시보드', '회원 관리', '투표 결과', '투표 세션', '경기 관리', '이번주 일정', '알림 관리', '활동 분석', '풋살 현황판'].map((label) => (
                    <Tab
                      key={label}
                      fontSize="xs"
                      py={2}
                      px={1}
                      bg="gray.100"
                      color="gray.700"
                      borderColor="gray.300"
                      _dark={{ bg: 'gray.700', color: 'gray.200', borderColor: 'gray.600' }}
                      _hover={{ bg: 'gray.200', _dark: { bg: 'gray.600' } }}
                      _selected={{ bg: 'blue.50', fontWeight: 'bold', borderColor: 'blue.300', color: 'blue.700', _dark: { bg: 'blue.900', color: 'blue.300' } }}
                      transition="background-color 0.15s ease, color 0.15s ease"
                    >
                      {(() => {
                        const labelMap: { [key: string]: string } = {
                          '대시보드': '대시\n보드',
                          '회원 관리': '회원\n관리',
                          '투표 결과': '투표\n결과',
                          '투표 세션': '투표\n세션',
                          '경기 관리': '경기\n관리',
                          '이번주 일정': '이번주\n일정',
                          '알림 관리': '알림\n관리',
                          '활동 분석': '활동\n분석',
                          '풋살 현황판': '풋살\n현황판'
                        };
                        return (
                          <Box as="span" whiteSpace="pre-line">
                            {labelMap[label] || label}
                          </Box>
                        );
                      })()}
                    </Tab>
                  ))}
                </TabList>
                <TabPanels mt={2.25} borderTop="none">
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineBarChart} title="실시간 통계" description="회원 수, 경기 수, 투표율 등 실시간 현황 확인" />
                      <StepCard icon={MdOutlineRefresh} title="자동 업데이트" description="데이터 변경 시 자동으로 화면 갱신" />
                      <StepCard icon={MdOutlineTrendingUp} title="성과 지표" description="참여율, 활동도 등 주요 지표 모니터링" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineGroupAdd} title="회원 등록" description="새 회원 추가 및 기본 정보 입력" />
                      <StepCard icon={MdOutlineEdit} title="정보 수정" description="회원 정보 편집 및 권한 변경" />
                      <StepCard icon={MdOutlineKey} title="비밀번호 초기화" description="회원 비밀번호 재설정" />
                      <StepCard icon={MdOutlineDeleteOutline} title="회원 삭제" description="회원 계정 완전 삭제" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineBarChart} title="투표 현황" description="현재 진행 중인 투표 세션 확인" />
                      <StepCard icon={MdOutlineTrendingUp} title="결과 분석" description="요일별 득표수 및 참여율 분석" />
                      <StepCard icon={MdOutlineStopCircle} title="투표 마감" description="투표 세션 수동 마감/재개" />
                      <StepCard icon={MdOutlineSave} title="결과 저장" description="투표 결과 집계 및 저장" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineAddCircle} title="세션 수동 생성" description="특정 주간에 대한 투표 세션을 수동으로 생성" />
                      <StepCard icon={MdOutlineCalendarMonth} title="주 시작일 설정" description="투표 대상 주간의 월요일 날짜 선택" />
                      <StepCard icon={MdOutlineSchedule} title="투표 기간 설정" description="의견수렴 시작일시와 투표 마감일시 지정 (선택사항)" />
                      <StepCard icon={MdOutlineBlock} title="요일 차단 설정" description="특정 요일을 투표에서 제외하고 차단 사유 표시" />
                      <StepCard icon={MdOutlineRefresh} title="활성 세션 관리" description="현재 활성 세션의 요일 차단 설정 수정 가능" />
                      <StepCard icon={MdOutlineDescription} title="세션 정보 확인" description="세션 ID, 투표 기간, 참여자 수, 차단된 요일 확인" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineAddCircle} title="경기 생성" description="새 경기 일정 추가" />
                      <StepCard icon={MdOutlineEdit} title="일정 수정" description="경기 날짜, 시간, 장소 변경" />
                      <StepCard icon={MdOutlineGroup} title="참가자 관리" description="경기 참가자 추가/제거" />
                      <StepCard icon={MdOutlineDeleteOutline} title="경기 삭제" description="경기 일정 완전 삭제" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineAddCircle} title="일정 추가" description="이번주 특별 일정 등록" />
                      <StepCard icon={MdOutlineEdit} title="일정 수정" description="등록된 일정 정보 변경" />
                      <StepCard icon={MdOutlineDeleteOutline} title="일정 삭제" description="불필요한 일정 제거" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineEmail} title="이메일 발송" description="회원들에게 이메일 알림 전송" />
                      <StepCard icon={MdOutlineSms} title="SMS 발송" description="긴급 알림 SMS 전송" />
                      <StepCard icon={MdOutlineDescription} title="알림 템플릿" description="알림 메시지 템플릿 관리" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineAdminPanelSettings} title="슈퍼 관리자 전용" description="상세한 회원 활동 통계 분석" />
                      <StepCard icon={MdOutlineInsights} title="참여도 분석" description="회원별 경기 참여도 및 활동 패턴" />
                      <StepCard icon={MdOutlineTrendingUp} title="트렌드 분석" description="시간별, 월별 활동 트렌드" />
                    </VStack>
                  </TabPanel>
                  <TabPanel px={0}>
                    <VStack spacing={1} align="stretch">
                      <StepCard icon={MdOutlineSportsSoccer} title="경기 현황" description="실시간 경기 진행 상황 관리" />
                      <StepCard icon={MdOutlineGroups} title="선수 배치" description="포지션별 선수 배치 및 교체" />
                      <StepCard icon={MdOutlineScoreboard} title="스코어 관리" description="경기 점수 및 결과 입력" />
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              <Card variant="tight" boxShadow="none" bg="brand.50" borderColor="brand.100" _dark={{ bg: 'brand.900', borderColor: 'brand.700' }}>
                <Text fontSize="sm" color="brand.700" _dark={{ color: 'brand.200' }} fontWeight="semibold" textAlign="center">
                  <Icon as={MdOutlineInfo} boxSize="14px" mr={1} verticalAlign="-2px" />
                  운영 팁: 수정 후 백/프론트 재시작으로 즉시 반영
                </Text>
              </Card>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
