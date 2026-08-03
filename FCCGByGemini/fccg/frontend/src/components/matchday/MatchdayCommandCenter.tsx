import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  Grid,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Progress,
  SimpleGrid,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import type { User } from '../../store/auth';

export interface MatchdayGame {
  date?: string;
  time?: string;
  location?: string;
  eventType?: string;
}

interface MatchdayCommandCenterProps {
  game?: MatchdayGame | null;
  user: User | null;
  voteRate: number;
  votedCount: number;
  totalMembers: number;
  userVoted: boolean;
  votePeriod?: string;
  onOpenSchedule: () => void;
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'SUPER CAPTAIN',
  ADMIN: 'TEAM MANAGER',
  MEMBER: 'FIRST TEAM',
  GUEST: 'GUEST PLAYER',
};

function getGameCountdown(dateValue?: string) {
  if (!dateValue) return { label: 'NEXT MATCH', detail: '일정 확정 대기' };
  const gameDate = new Date(dateValue);
  if (Number.isNaN(gameDate.getTime())) return { label: 'NEXT MATCH', detail: '일정 확인 중' };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate()).getTime();
  const days = Math.round((target - today) / 86_400_000);

  if (days === 0) return { label: 'MATCH DAY', detail: '오늘, 우리가 뛰는 날' };
  if (days > 0) return { label: `D-${days}`, detail: '다음 경기까지' };
  return { label: 'RECENT MATCH', detail: '최근 경기' };
}

function formatGameDate(dateValue?: string) {
  if (!dateValue) return '일정 확정 대기';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '일정 확인 중';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function PlayerPassport({
  user,
  isOpen,
  onClose,
}: {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}) {
  const attendance = Math.round(user.attendance || 0);
  const voteAttendance = Math.round(user.voteAttendance || 0);
  const gameCount = user.gameDetails?.participated || 0;
  const voteStreak = user.voteDetails?.participated || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: 'sm', md: 'md' }}>
      <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.700" />
      <ModalContent bg="transparent" boxShadow="none" mx={4}>
        <ModalCloseButton color="white" zIndex={2} />
        <ModalBody p={0}>
          <Box
            position="relative"
            overflow="hidden"
            borderRadius="28px"
            color="white"
            bg="linear-gradient(150deg, #05152d 0%, #063a82 52%, #0878d8 100%)"
            boxShadow="0 28px 70px rgba(0, 36, 90, 0.52)"
            border="1px solid"
            borderColor="whiteAlpha.300"
            p={{ base: 6, md: 8 }}
            _before={{
              content: '""',
              position: 'absolute',
              inset: '-35%',
              background: 'radial-gradient(circle, rgba(71,174,255,.38) 0%, transparent 55%)',
              transform: 'translate(35%, -30%)',
            }}
          >
            <Flex position="relative" justify="space-between" align="start">
              <Box>
                <Text fontSize="xs" letterSpacing="0.28em" color="cyan.200" fontWeight="800">
                  FC CHAL-GGYEO
                </Text>
                <Text mt={1} fontSize="sm" color="whiteAlpha.700">
                  OFFICIAL PLAYER PASSPORT
                </Text>
              </Box>
              <Icon as={FiShield} boxSize={8} color="cyan.200" />
            </Flex>

            <Flex position="relative" mt={8} align="center" gap={5}>
              <Avatar
                size="xl"
                name={user.name}
                src={user.avatarUrl}
                border="3px solid"
                borderColor="cyan.200"
                bg="blue.700"
              />
              <Box>
                <Badge bg="cyan.300" color="blue.950" borderRadius="full" px={3} py={1} fontSize="10px">
                  {roleLabel[user.role] || 'FIRST TEAM'}
                </Badge>
                <Text fontSize={{ base: '3xl', md: '4xl' }} lineHeight="1" fontWeight="900" mt={3}>
                  {user.name}
                </Text>
                <Text color="whiteAlpha.700" mt={1} fontSize="sm">
                  MEMBER NO. {String(user.id).padStart(3, '0')}
                </Text>
              </Box>
            </Flex>

            <SimpleGrid position="relative" columns={2} spacing={3} mt={8}>
              {[
                ['경기 출석률', `${attendance}%`],
                ['투표 참여율', `${voteAttendance}%`],
                ['참여 경기', `${gameCount} MATCH`],
                ['참여 투표', `${voteStreak} VOTE`],
              ].map(([label, value]) => (
                <Box key={label} bg="whiteAlpha.120" border="1px solid" borderColor="whiteAlpha.200" borderRadius="xl" p={4}>
                  <Text fontSize="xs" color="whiteAlpha.650">{label}</Text>
                  <Text fontWeight="900" fontSize="xl" mt={1}>{value}</Text>
                </Box>
              ))}
            </SimpleGrid>

            <Box position="relative" mt={6}>
              <Flex justify="space-between" fontSize="xs" mb={2}>
                <Text color="whiteAlpha.700">SEASON ACTIVITY</Text>
                <Text fontWeight="800">{Math.round((attendance + voteAttendance) / 2)}%</Text>
              </Flex>
              <Progress
                value={(attendance + voteAttendance) / 2}
                size="sm"
                borderRadius="full"
                bg="whiteAlpha.200"
                sx={{ '& > div': { background: 'linear-gradient(90deg, #42e8ff, #9dffbd)' } }}
              />
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function MatchdayCommandCenter({
  game,
  user,
  voteRate,
  votedCount,
  totalMembers,
  userVoted,
  votePeriod,
  onOpenSchedule,
}: MatchdayCommandCenterProps) {
  const passport = useDisclosure();
  const countdown = getGameCountdown(game?.date);

  return (
    <>
      <Box
        w="full"
        maxW="1400px"
        mx="auto"
        px={{ base: 2, md: 4, lg: 6 }}
        pt={{ base: 5, md: 8 }}
      >
        <Box
          position="relative"
          overflow="hidden"
          borderRadius={{ base: '22px', md: '30px' }}
          color="white"
          bg="linear-gradient(125deg, #031329 0%, #06366f 48%, #056dc4 100%)"
          boxShadow="0 24px 64px rgba(3, 41, 91, 0.30)"
          border="1px solid"
          borderColor="whiteAlpha.200"
          p={{ base: 5, md: 8, lg: 10 }}
          _before={{
            content: '""',
            position: 'absolute',
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'linear-gradient(to right, transparent, black 45%, black)',
          }}
          _after={{
            content: '""',
            position: 'absolute',
            w: '460px',
            h: '460px',
            right: '-160px',
            top: '-260px',
            borderRadius: 'full',
            bg: 'cyan.300',
            filter: 'blur(90px)',
            opacity: 0.22,
          }}
        >
          <Flex position="relative" zIndex={1} justify="space-between" align="center" mb={{ base: 6, md: 8 }}>
            <HStack spacing={3}>
              <Flex w={10} h={10} borderRadius="14px" bg="whiteAlpha.180" align="center" justify="center" border="1px solid" borderColor="whiteAlpha.300">
                <Icon as={FiShield} boxSize={5} color="cyan.200" />
              </Flex>
              <Box>
                <Text fontSize="xs" letterSpacing="0.24em" color="cyan.200" fontWeight="900">
                  MATCHDAY OS
                </Text>
                <Text fontSize="sm" color="whiteAlpha.700">FC CHAL-GGYEO COMMAND CENTER</Text>
              </Box>
            </HStack>
            <Badge bg="green.300" color="green.950" borderRadius="full" px={3} py={1.5} fontSize="10px" letterSpacing="0.08em">
              ● LIVE
            </Badge>
          </Flex>

          <Grid position="relative" zIndex={1} templateColumns={{ base: '1fr', lg: '1.45fr .8fr .9fr' }} gap={{ base: 6, lg: 7 }}>
            <VStack align="stretch" spacing={5} justify="space-between">
              <Box>
                <Text color="cyan.200" fontWeight="900" fontSize={{ base: '4xl', md: '6xl' }} lineHeight="0.95" letterSpacing="-0.04em">
                  {countdown.label}
                </Text>
                <Text color="whiteAlpha.650" fontSize="sm" mt={2}>{countdown.detail}</Text>
              </Box>

              <Box>
                <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight="900" letterSpacing="-0.035em">
                  {game?.eventType || 'NEXT TEAM SCHEDULE'}
                </Text>
                <HStack mt={4} spacing={5} flexWrap="wrap" color="whiteAlpha.850">
                  <HStack>
                    <Icon as={FiCalendar} color="cyan.200" />
                    <Text fontWeight="700">{formatGameDate(game?.date)}</Text>
                  </HStack>
                  {game?.time && (
                    <HStack>
                      <Icon as={FiClock} color="cyan.200" />
                      <Text>{game.time}</Text>
                    </HStack>
                  )}
                  <HStack>
                    <Icon as={FiMapPin} color="cyan.200" />
                    <Text>{game?.location || '장소 확정 대기'}</Text>
                  </HStack>
                </HStack>
              </Box>

              <Button
                alignSelf="start"
                rightIcon={<FiArrowRight />}
                bg="white"
                color="blue.900"
                borderRadius="full"
                px={6}
                _hover={{ bg: 'cyan.100', transform: 'translateY(-2px)' }}
                onClick={onOpenSchedule}
              >
                일정·투표 확인
              </Button>
            </VStack>

            <Box
              bg="blackAlpha.230"
              border="1px solid"
              borderColor="whiteAlpha.250"
              borderRadius="24px"
              p={5}
              backdropFilter="blur(12px)"
            >
              <Flex justify="space-between" align="start">
                <Box>
                  <Text fontSize="xs" color="whiteAlpha.650" letterSpacing="0.12em">VOTE STATUS</Text>
                  <Text fontWeight="800" mt={1}>다음 경기 투표</Text>
                </Box>
                <Icon as={userVoted ? FiCheckCircle : FiActivity} color={userVoted ? 'green.200' : 'orange.200'} boxSize={5} />
              </Flex>
              <Flex justify="center" py={5}>
                <CircularProgress value={voteRate} size="124px" thickness="8px" color="cyan.300" trackColor="whiteAlpha.200">
                  <CircularProgressLabel>
                    <Text fontSize="2xl" fontWeight="900">{voteRate}%</Text>
                    <Text fontSize="10px" color="whiteAlpha.650">{votedCount}/{totalMembers}명</Text>
                  </CircularProgressLabel>
                </CircularProgress>
              </Flex>
              <Divider borderColor="whiteAlpha.250" />
              <Flex mt={4} justify="space-between" align="center">
                <Box>
                  <Text fontSize="10px" color="whiteAlpha.600">VOTING PERIOD</Text>
                  <Text fontSize="xs" mt={1}>{votePeriod || '일정 확인 중'}</Text>
                </Box>
                <Badge colorScheme={userVoted ? 'green' : 'orange'} borderRadius="full" px={2.5} py={1}>
                  {userVoted ? '참여 완료' : '참여 필요'}
                </Badge>
              </Flex>
            </Box>

            <Box
              bg="white"
              color="blue.950"
              borderRadius="24px"
              p={5}
              boxShadow="0 14px 35px rgba(0,0,0,.16)"
              cursor={user ? 'pointer' : 'default'}
              transition="transform .2s ease"
              _hover={user ? { transform: 'translateY(-3px)' } : undefined}
              onClick={user ? passport.onOpen : undefined}
            >
              <Flex justify="space-between" align="start">
                <Avatar size="lg" name={user?.name || 'FC'} src={user?.avatarUrl} bg="blue.700" color="white" />
                <Icon as={FiUser} color="blue.500" />
              </Flex>
              <Text mt={5} fontSize="xs" color="blue.500" fontWeight="900" letterSpacing="0.12em">
                PLAYER PASSPORT
              </Text>
              <Text fontSize="2xl" fontWeight="900" mt={1}>{user?.name || '로그인 선수'}</Text>
              <Text color="gray.500" fontSize="sm">{user ? (roleLabel[user.role] || 'FIRST TEAM') : '프로필 확인'}</Text>

              <SimpleGrid columns={2} spacing={2} mt={5}>
                <Box bg="blue.50" borderRadius="xl" p={3}>
                  <Text fontSize="10px" color="gray.500">경기 출석</Text>
                  <Text fontSize="lg" fontWeight="900">{Math.round(user?.attendance || 0)}%</Text>
                </Box>
                <Box bg="cyan.50" borderRadius="xl" p={3}>
                  <Text fontSize="10px" color="gray.500">투표 참여</Text>
                  <Text fontSize="lg" fontWeight="900">{Math.round(user?.voteAttendance || 0)}%</Text>
                </Box>
              </SimpleGrid>
              <HStack mt={4} color="blue.600" fontSize="xs" fontWeight="800">
                <Text>{user ? '선수 카드 열기' : '로그인이 필요합니다'}</Text>
                {user && <FiArrowRight />}
              </HStack>
            </Box>
          </Grid>
        </Box>
      </Box>

      {user && <PlayerPassport user={user} isOpen={passport.isOpen} onClose={passport.onClose} />}
    </>
  );
}
