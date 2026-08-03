import { 
  Box, 
  Flex, 
  Text, 
  HStack, 
  VStack, 
  Button, 
  Input, 
  Badge, 
  IconButton, 
  Image, 
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useToast,
  Divider,
  Textarea,
  Select,
  Tooltip
} from '@chakra-ui/react';
import { 
  useState, 
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';
import { 
  EditIcon,
  DeleteIcon,
  ArrowUpIcon,
  CheckIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons';
import { AiFillHeart } from 'react-icons/ai';
import { useAuthStore } from '../store/auth';
import { getApiUrl } from '../config/api';
import { useDesktopPagedLayout } from '../hooks/useDesktopPagedLayout';

// YouTube API 설정
const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const PLAYLIST_ID = 'PLQ5o2f7efzlZ-RDG64h4Oj_5pXt0g6q3b';

const videoViewFormatter = new Intl.NumberFormat('ko-KR');
const formatVideoViewCount = (value: number = 0) =>
  videoViewFormatter.format(Math.max(0, value));

const VIDEO_BADGE_PRESETS = [
  {
    threshold: 400,
    emoji: '🎬',
    gradient: 'linear-gradient(120deg, rgba(0,210,255,0.95), rgba(146,141,255,0.92))',
    shadow: '0 10px 24px rgba(0,210,255,0.35)'
  },
  {
    threshold: 120,
    emoji: '🔥',
    gradient: 'linear-gradient(120deg, rgba(255,94,98,0.95), rgba(255,149,0,0.9))',
    shadow: '0 8px 20px rgba(255,94,98,0.35)'
  },
  {
    threshold: 40,
    emoji: '⚡',
    gradient: 'linear-gradient(120deg, rgba(76,81,191,0.92), rgba(115,103,240,0.9))',
    shadow: '0 6px 18px rgba(76,81,191,0.3)'
  },
  {
    threshold: 0,
    emoji: '✨',
    gradient: 'linear-gradient(120deg, rgba(15,23,42,0.85), rgba(30,41,59,0.78))',
    shadow: '0 4px 12px rgba(15,23,42,0.35)'
  }
] as const;

const getVideoClickBadgeStyle = (count: number) => {
  for (const preset of VIDEO_BADGE_PRESETS) {
    if (count >= preset.threshold) return preset;
  }
  return VIDEO_BADGE_PRESETS[VIDEO_BADGE_PRESETS.length - 1];
};

const getVideoKey = (item: any) => item?.videoId || item?.id;

/** ISO publishedAt 기준 상대시간 (날짜-only 문자열 파싱 시 자정→N시간 전 오류 방지) */
const formatVideoRelativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const ms = Date.now() - date.getTime();
  if (ms < 0) return '방금 전';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  if (h < 24) return `${h}시간 전`;
  if (days === 1) return '1일 전';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
};

const formatVideoUploadLabel = (iso?: string | null) => {
  if (!iso) return '업로드: 날짜 없음';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '업로드: 날짜 없음';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];
  return `업로드: ${year}. ${month}. ${day}. (${weekday})`;
};

export default function VideoGalleryPage() {
  const { user } = useAuthStore();
  const [sort, setSort] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const isDesktopPaged = useDesktopPagedLayout();
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [newComment, setNewComment] = useState('');
  const toast = useToast();
  const fetchedVideoKeysRef = useRef<Set<string>>(new Set());

  const saveItemsToStorage = useCallback((list: any[]) => {
    try {
      localStorage.setItem('videoItems', JSON.stringify(list));
    } catch (e) {
      console.error('동영상 저장 실패:', e);
    }
  }, []);

  const fetchVideoViewStats = useCallback(async (videoKeys: string[]) => {
    if (!videoKeys || videoKeys.length === 0) return;
    try {
      const sanitizedKeys = Array.from(new Set(videoKeys.filter(Boolean)));
      if (sanitizedKeys.length === 0) return;
      const url = await getApiUrl(`/videos/view-stats?ids=${encodeURIComponent(sanitizedKeys.join(','))}`);
      const response = await fetch(url);
      if (!response.ok) return;
      const payload = await response.json();
      const stats: Record<string, number> = payload?.data || {};
      // 앱 내 클릭수만 별도 보관 — 카드에 보이는 viewCount(유튜브 조회수)는 덮지 않음
      setItems(prev => {
        const updated = prev.map(item => {
          const key = getVideoKey(item);
          if (key && typeof stats[key] === 'number') {
            return { ...item, appClickCount: stats[key] };
          }
          return item;
        });
        saveItemsToStorage(updated);
        return updated;
      });
    } catch (error) {
      console.error('동영상 클릭수 동기화 실패:', error);
    }
  }, [saveItemsToStorage]);

  const incrementVideoView = useCallback(async (videoKey?: string) => {
    if (!videoKey) return;
    // 앱 클릭만 증가 (유튜브 조회수 viewCount는 유지)
    setItems(prev => {
      const updated = prev.map(item => {
        if (getVideoKey(item) === videoKey) {
          return { ...item, appClickCount: (item.appClickCount || 0) + 1 };
        }
        return item;
      });
      saveItemsToStorage(updated);
      return updated;
    });

    try {
      const url = await getApiUrl(`/videos/${videoKey}/view`);
      await fetch(url, { method: 'POST' });
    } catch (error) {
      console.error('동영상 클릭수 업데이트 실패:', error);
    }
  }, [saveItemsToStorage]);

  // 초기 로드: localStorage를 먼저 표시한 뒤, YouTube에서 항상 최신 동기화
  useEffect(() => {
    let initialStoredItems: any[] = [];
    const stored = localStorage.getItem('videoItems');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialStoredItems = parsed.map(item => ({
            ...item,
            viewCount: typeof item.viewCount === 'number' ? item.viewCount : 0
          }));
          setItems(initialStoredItems);
        }
      } catch (e) { console.warn('videoItems 파싱 실패:', e); }
    }

    if (!YT_API_KEY) return;

    // contentDetails.videoPublishedAt = 실제 영상 게시 시각 (snippet.publishedAt은 재생목록 추가 시각)
    fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${PLAYLIST_ID}&key=${YT_API_KEY}`)
      .then(res => res.json())
      .then(async (data: {
        items?: {
          snippet: { resourceId: { videoId: string }, title: string, publishedAt: string };
          contentDetails?: { videoPublishedAt?: string };
        }[];
      }) => {
        if (data.items && data.items.length > 0) {
          const fetchedVideoItems = data.items
            .filter(item => {
              const title = item.snippet.title.toLowerCase();
              return !title.includes('deleted video') && 
                     !title.includes('private video') && 
                     !title.includes('unavailable') &&
                     item.snippet.title.trim() !== '';
            })
            .map((item, index) => {
              // 실제 업로드 시각 우선, 없으면 재생목록 추가 시각
              const publishedAt =
                item.contentDetails?.videoPublishedAt || item.snippet.publishedAt;
              const publishedDate = new Date(publishedAt);
              const formattedDate = Number.isNaN(publishedDate.getTime())
                ? ''
                : publishedDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    weekday: 'short',
                  });
              
              // 제목에서 매치/자체 정보 추출
              const title = item.snippet.title;
              let eventBadge = null;
              let eventType = '매치';
              
              if (title.includes('매치') || title.includes('match')) {
                eventBadge = '매치';
                eventType = '매치';
              } else if (title.includes('자체') || title.includes('연습') || title.includes('practice')) {
                eventBadge = '자체';
                eventType = '자체';
              }
              
              return {
                id: `video_${index + 1}`,
                type: 'video',
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                date: formattedDate,
                publishedAt,
                author: 'tony jung',
                likes: 0,
                comments: 0,
                badge: eventBadge,
                label: '동영상',
                tags: ['경기', '하이라이트'],
                description: item.snippet.title,
                eventType: eventType,
                thumbnail: `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/maxresdefault.jpg`,
                isLiked: false,
                commentsList: [],
                viewCount: 0
              };
            });

          // 기존 로컬 데이터(좋아요/댓글/조회수/코멘트)를 videoId 기준으로 최대한 유지
          const storedByVideoId = new Map(
            initialStoredItems
              .filter(item => !!item?.videoId)
              .map(item => [item.videoId, item])
          );

          const merged = fetchedVideoItems.map((item) => {
            const prev = storedByVideoId.get(item.videoId);
            if (!prev) return item;
            return {
              ...item,
              // 좋아요/조회수는 아래에서 유튜브 statistics로 덮어씀
              isLiked: prev.isLiked ?? item.isLiked,
              commentsList: prev.commentsList ?? item.commentsList,
              // 앱 내 댓글 수는 로컬 유지 (카드에는 유튜브 댓글수 표시)
              comments: Array.isArray(prev.commentsList) ? prev.commentsList.length : (prev.comments ?? 0),
            };
          });

          // 유튜브 실제 좋아요·조회수·댓글수 조회 (읽기 전용 — 앱→유튜브 숫자 쓰기는 API 불가)
          const ids = merged.map((v) => v.videoId).filter(Boolean);
          let withStats = merged;
          if (ids.length > 0) {
            try {
              const statsRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(',')}&key=${YT_API_KEY}`
              );
              const statsData = await statsRes.json();
              const byId = new Map(
                (statsData.items || []).map((v: { id: string; statistics?: Record<string, string> }) => [
                  v.id,
                  {
                    likes: Number(v.statistics?.likeCount || 0),
                    viewCount: Number(v.statistics?.viewCount || 0),
                    youtubeCommentCount: Number(v.statistics?.commentCount || 0),
                  },
                ])
              );
              withStats = merged.map((item) => {
                const s = byId.get(item.videoId);
                if (!s) return item;
                return {
                  ...item,
                  likes: s.likes,
                  viewCount: s.viewCount,
                  youtubeCommentCount: s.youtubeCommentCount,
                  statsFromYoutube: true,
                };
              });
            } catch (e) {
              console.warn('유튜브 statistics 조회 실패:', e);
            }
          }

          setItems(withStats);
          saveItemsToStorage(withStats);
        }
      })
      .catch((error) => {
        console.error('유튜브 API 오류:', error);
        toast({
          title: '오류',
          description: '동영상을 불러오는 중 오류가 발생했습니다.',
          status: 'error',
          duration: 3000,
        });
      });
  }, [toast, saveItemsToStorage]);

  // 정렬된 아이템들
  const sortedItems = useMemo(() => {
    const sorted = [...items];
    
    switch (sort) {
      case 'latest':
        sorted.sort((a, b) => new Date(b.publishedAt || b.date).getTime() - new Date(a.publishedAt || a.date).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.publishedAt || a.date).getTime() - new Date(b.publishedAt || b.date).getTime());
        break;
      case 'likes':
        sorted.sort((a, b) => b.likes - a.likes);
        break;
      case 'comments':
        sorted.sort((a, b) => b.comments - a.comments);
        break;
    }
    
    return sorted;
  }, [items, sort]);

  const videosPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / videosPerPage));
  const visibleItems = useMemo(
    () =>
      isDesktopPaged
        ? sortedItems.slice((currentPage - 1) * videosPerPage, currentPage * videosPerPage)
        : sortedItems,
    [currentPage, isDesktopPaged, sortedItems],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, isDesktopPaged]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  // 아이템 클릭 처리
  const handleItemClick = useCallback((item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
    incrementVideoView(getVideoKey(item));
  }, [incrementVideoView]);

  // 좋아요: 앱→유튜브 숫자 쓰기는 API로 불가. 유튜브 영상으로 이동해 직접 좋아요
  const handleLikeToggle = useCallback((item: any) => {
    if (item?.videoId) {
      window.open(`https://www.youtube.com/watch?v=${item.videoId}`, '_blank', 'noopener,noreferrer');
    }
    toast({
      title: '유튜브에서 좋아요',
      description: '앱 내 좋아요/조회수는 유튜브에 올릴 수 없습니다. 유튜브 페이지에서 좋아요를 눌러 주세요. (표시 숫자는 유튜브 통계입니다)',
      status: 'info',
      duration: 4500,
      isClosable: true,
    });
  }, [toast]);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const pendingKeys = items
      .map(item => getVideoKey(item))
      .filter((key): key is string => !!key && !fetchedVideoKeysRef.current.has(key));
    if (pendingKeys.length === 0) return;
    pendingKeys.forEach(key => fetchedVideoKeysRef.current.add(key));
    fetchVideoViewStats(pendingKeys);
  }, [items, fetchVideoViewStats]);

  // 댓글 추가
  const handleAddComment = useCallback((text: string) => {
    if (!user || !selectedItem || !text.trim()) return;

    const newComment = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      author: user.name,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedItems = items.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          comments: item.comments + 1,
          commentsList: [...item.commentsList, newComment]
        };
      }
      return item;
    });

    setItems(updatedItems);
    try { localStorage.setItem('videoItems', JSON.stringify(updatedItems)); } catch {}
    
    const updatedSelectedItem = updatedItems.find(item => item.id === selectedItem.id);
    setSelectedItem(updatedSelectedItem);
  }, [user, selectedItem, items]);

  // 댓글 편집
  const handleEditComment = useCallback((commentIndex: number, newText: string) => {
    if (!selectedItem || !newText.trim()) return;

    const updatedComments = [...selectedItem.commentsList];
    updatedComments[commentIndex] = {
      ...updatedComments[commentIndex],
      text: newText.trim()
    };

    const updatedItems = items.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          commentsList: updatedComments
        };
      }
      return item;
    });

    setItems(updatedItems);
    try { localStorage.setItem('videoItems', JSON.stringify(updatedItems)); } catch {}
    
    const updatedSelectedItem = updatedItems.find(item => item.id === selectedItem.id);
    setSelectedItem(updatedSelectedItem);
    setEditingCommentIndex(null);
    setEditCommentText('');
  }, [selectedItem, items]);

  // 댓글 삭제
  const handleDeleteComment = useCallback((commentIndex: number) => {
    if (!selectedItem) return;

    const updatedComments = selectedItem.commentsList.filter((_: any, index: number) => index !== commentIndex);

    const updatedItems = items.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          comments: item.comments - 1,
          commentsList: updatedComments
        };
      }
      return item;
    });

    setItems(updatedItems);
    
    const updatedSelectedItem = updatedItems.find(item => item.id === selectedItem.id);
    setSelectedItem(updatedSelectedItem);
  }, [selectedItem, items]);

  return (
    <Box
      minH="100vh"
      bg="#f7f9fb"
      w="100%"
      pt="18mm"
      overflowY={isDesktopPaged ? 'hidden' : 'visible'}
      h={isDesktopPaged ? '100vh' : 'auto'}
    >
      {/* 상단 컨트롤 영역 */}
      <Box px={{ base: 2, md: 4, lg: 6 }} pt={10} pb={4} w="100%" maxW="1400px" mx="auto">
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ base: 'stretch', md: 'center' }} justify="space-between" mb={1.5}>
          {/* 필터 탭 */}
          <HStack spacing={2} flexWrap="wrap">
            
          </HStack>

          {/* 정렬 및 업로드 */}
          <HStack spacing={2}>
            <Select size="sm" value={sort} onChange={(e) => setSort(e.target.value)} w="100px">
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="likes">좋아요순</option>
              <option value="comments">댓글순</option>
            </Select>

          </HStack>
        </Flex>
      </Box>

      {/* 갤러리 그리드 */}
      <Box px={{ base: 2, md: 4, lg: 6 }} pb={10} w="100%" maxW="1400px" mx="auto">
        {sortedItems.length === 0 && (
          <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" p={8} textAlign="center">
            <Text color="gray.600" fontWeight="medium" mb={2}>
              표시할 동영상이 없습니다
            </Text>
            <Text color="gray.500" fontSize="sm">
              {!YT_API_KEY
                ? 'VITE_YOUTUBE_API_KEY가 없어 YouTube 재생목록을 불러오지 못했습니다. frontend/.env.local을 확인한 뒤 개발 서버를 재시작하세요.'
                : 'YouTube 재생목록을 불러오는 중이거나, 동기화에 실패했습니다. 잠시 후 새로고침해 주세요.'}
            </Text>
          </Box>
        )}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
          {visibleItems.map((item) => (
            <Box 
              key={item.id} 
              bg="white" 
              borderRadius="2xl" 
              boxShadow="md" 
              overflow="hidden" 
              position="relative" 
              _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }} 
              transition="all 0.2s"
              cursor="pointer"
              onClick={() => handleItemClick(item)}
            >
              {/* 썸네일/라벨/뱃지 */}
              <Box position="relative">
                <Image 
                  src={item.thumbnail} 
                  alt={item.label} 
                  w="100%" 
                  h="200px" 
                  objectFit="cover" 
                />
              </Box>

              {/* 정보 영역 */}
              <Box px={4} pt={0} pb={0}>
                <VStack align="start" spacing={0} w="full">
                  {/* 1행+2행 묶음: 간격 최소화 */}
                  <VStack align="start" spacing={0} w="full" mt="-2">
                    {/* 1행: 유튜브 제목 / 우측 유튜브 좋아요·댓글·조회수 */}
                    <Flex w="full" align="center" gap={2}>
                      <Text fontSize="sm" fontWeight="bold" noOfLines={2} flex={1} minW={0}>
                        {item.title || '제목 없음'}
                      </Text>
                      <HStack spacing={3} ml="auto" flexShrink={0}>
                        <Tooltip label={`유튜브 좋아요 ${item.likes}개`} fontSize="10px" bg="gray.800" color="white" borderRadius="md" px={2} py={1}>
                          <HStack spacing={1} cursor="default">
                            <AiFillHeart color="#e53e3e" size={16} />
                            <Text fontSize="sm" color="gray.600">{item.likes}</Text>
                          </HStack>
                        </Tooltip>
                        <Tooltip label={`유튜브 댓글 ${item.youtubeCommentCount ?? item.comments}개`} fontSize="10px" bg="gray.800" color="white" borderRadius="md" px={2} py={1}>
                          <HStack spacing={1} cursor="default">
                            <Text fontSize="sm">💬</Text>
                            <Text fontSize="sm" color="gray.600">{item.youtubeCommentCount ?? item.comments}</Text>
                          </HStack>
                        </Tooltip>
                        <Tooltip label={`유튜브 조회수 ${formatVideoViewCount(item.viewCount || 0)}회`} fontSize="10px" bg="gray.800" color="white" borderRadius="md" px={2} py={1}>
                          <HStack spacing={1} cursor="default">
                            <Text fontSize="sm">⚡</Text>
                            <Text fontSize="sm" color="gray.600">
                              {formatVideoViewCount(item.viewCount || 0)}
                            </Text>
                          </HStack>
                        </Tooltip>
                      </HStack>
                    </Flex>
                  </VStack>

                  {/* 3행: 업로드 날짜+요일 / 우측 상대시간 — 반드시 ISO publishedAt 사용 */}
                  <Flex w="full" align="center" mt="-3" mb="0.5">
                    <Text fontSize="xs" color="gray.500">
                      {formatVideoUploadLabel(item.publishedAt)}
                    </Text>
                    <Text fontSize="xs" color="gray.500" ml="auto">
                      {formatVideoRelativeTime(item.publishedAt)}
                    </Text>
                  </Flex>
                </VStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
        {isDesktopPaged && totalPages > 1 && (
          <HStack justify="center" spacing={2} mt={5}>
            <IconButton
              aria-label="이전 동영상 페이지"
              icon={<ChevronLeftIcon />}
              size="sm"
              variant="outline"
              isDisabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            />
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <Button
                key={page}
                size="sm"
                minW="36px"
                bg={currentPage === page ? '#0057B8' : 'white'}
                color={currentPage === page ? 'white' : '#334155'}
                border="1px solid"
                borderColor={currentPage === page ? '#0057B8' : '#CBD5E1'}
                _hover={{ bg: currentPage === page ? '#003F86' : '#EFF6FF' }}
                onClick={() => setCurrentPage(page)}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </Button>
            ))}
            <IconButton
              aria-label="다음 동영상 페이지"
              icon={<ChevronRightIcon />}
              size="sm"
              variant="outline"
              isDisabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
            <Text ml={2} color="#64748B" fontSize="xs">
              {currentPage}/{totalPages} · 총 {sortedItems.length}개
            </Text>
          </HStack>
        )}
      </Box>

      {/* 상세 모달 */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>동영상 상세보기</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedItem && (
              <VStack spacing={4}>
                <Box position="relative" w="full">
                  <Box
                    as="iframe"
                    src={`https://www.youtube.com/embed/${selectedItem.videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                    w="100%"
                    h="450px"
                    borderRadius="md"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </Box>

                <VStack spacing={0} w="full" mt="-4">
                  {/* 1행: 왼쪽 제목, 오른쪽 좋아요/댓글 */}
                  <Flex justify="space-between" align="center" w="full" gap={4}>
                    <Text fontSize="md" fontWeight="bold" noOfLines={2} flex={1}>{selectedItem.title}</Text>
                    <HStack spacing={4} flexShrink={0}>
                      <HStack
                        spacing={1}
                        cursor="pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeToggle(selectedItem);
                        }}
                        title="유튜브에서 좋아요"
                      >
                        <AiFillHeart color="#e53e3e" size={16} />
                        <Text fontSize="sm">{selectedItem.likes}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.400">·</Text>
                      <HStack spacing={1} title="유튜브 댓글수">
                        <Text fontSize="sm">💬</Text>
                        <Text fontSize="sm">{selectedItem.youtubeCommentCount ?? selectedItem.comments}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.400">·</Text>
                      <HStack spacing={1} title="유튜브 조회수">
                        <Text fontSize="sm">⚡</Text>
                        <Text fontSize="sm">
                          {formatVideoViewCount(selectedItem.viewCount || 0)}
                        </Text>
                      </HStack>
                    </HStack>
                  </Flex>

                  <Divider />

                  {/* 댓글 목록: 댓글 내용, 업로드시점, 이름, 수정/삭제 버튼을 같은 행에 표시 */}
                  <VStack align="start" spacing={0} w="full">
                    {selectedItem.commentsList.map((comment: any, index: number) => (
                      <Box key={comment.id} w="full" mt={index === 0 ? 0 : "-5"}>
                        {editingCommentIndex === index ? (
                          <HStack spacing={2} flex={1}>
                            <Input
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              size="sm"
                              onKeyDown={(e: any) => {
                                if (e.key === 'Enter') {
                                  handleEditComment(index, editCommentText);
                                } else if (e.key === 'Escape') {
                                  setEditingCommentIndex(null);
                                  setEditCommentText('');
                                }
                              }}
                              autoFocus
                            />
                            <IconButton
                              aria-label="저장"
                              icon={<CheckIcon />}
                              size="xs"
                              colorScheme="green"
                              onClick={() => handleEditComment(index, editCommentText)}
                            />
                            <IconButton
                              aria-label="취소"
                              icon={<CloseIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => { setEditingCommentIndex(null); setEditCommentText(''); }}
                            />
                          </HStack>
                        ) : (
                          <Flex w="full" align="flex-start" wrap="wrap" gap={1.5}>
                            {/* 댓글 내용 - 줄바꿈 가능 */}
                            <Text 
                              fontSize="xs" 
                              color="gray.600"
                              fontWeight="bold"
                              wordBreak="break-word" 
                              whiteSpace="pre-wrap"
                              flex="1"
                              minW="0"
                            >
                              {comment.text}
                            </Text>
                            {/* 업로드시점, 이름, 수정/삭제 버튼 - 같은 행에 배치 */}
                            <HStack spacing={1.5} align="center" flexShrink={0}>
                              <Text fontSize="xs" color="gray.500">{(() => {
                                const d = new Date(comment.createdAt || new Date());
                                const now = new Date();
                                const ms = now.getTime() - d.getTime();
                                const m = Math.floor(ms / 60000);
                                const h = Math.floor(ms / 3600000);
                                const days = Math.floor(ms / 86400000);
                                if (m < 1) return '방금 전';
                                if (m < 60) return `${m}분 전`;
                                if (h < 24) return `${h}시간 전`;
                                if (days === 1) return '1일 전';
                                if (days < 7) return `${days}일 전`;
                                if (days < 30) return `${Math.floor(days / 7)}주 전`;
                                if (days < 365) return `${Math.floor(days / 30)}개월 전`;
                                return `${Math.floor(days / 365)}년 전`;
                              })()}</Text>
                              <Text fontSize="xs" color="gray.600" fontWeight="bold">{comment.author}</Text>
                              {(user?.name === comment.author || user?.role === 'SUPER_ADMIN') && (
                                <HStack spacing={0.5}>
                                  <IconButton 
                                    aria-label="댓글 수정" 
                                    icon={<Text fontSize="10px" color="#004ea8">✎</Text>} 
                                    size="xs" 
                                    bg="white"
                                    borderColor="#004ea8"
                                    borderWidth="1px"
                                    color="#004ea8"
                                    _hover={{ bg: "blue.50" }}
                                    onClick={() => { setEditingCommentIndex(index); setEditCommentText(comment.text); }} 
                                    h="20px"
                                    minW="20px"
                                    p={0}
                                  />
                                  <IconButton 
                                    aria-label="댓글 삭제" 
                                    icon={<DeleteIcon color="#004ea8" boxSize="10px" />} 
                                    size="xs" 
                                    bg="white"
                                    borderColor="#004ea8"
                                    borderWidth="1px"
                                    color="#004ea8"
                                    _hover={{ bg: "blue.50" }}
                                    onClick={() => handleDeleteComment(index)} 
                                    h="20px"
                                    minW="20px"
                                    p={0}
                                  />
                                </HStack>
                              )}
                            </HStack>
                          </Flex>
                        )}
                      </Box>
                    ))}

                    {/* 댓글 입력: 심플 디자인 */}
                    <HStack spacing={1} w="full" mt={0} mb="0.5">
                      <Input 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)} 
                        placeholder="댓글 입력..."
                        onKeyDown={(e: any) => {
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleAddComment(newComment);
                            setNewComment('');
                          }
                        }}
                        h="28px"
                        fontSize="xs"
                        px={2}
                        py={1}
                      />
                      <IconButton 
                        aria-label="등록" 
                        icon={<ArrowUpIcon />} 
                        size="xs"
                        bg="#004ea8"
                        color="white"
                        _hover={{ bg: "#00397a" }}
                        onClick={() => { handleAddComment(newComment); setNewComment(''); }} 
                        h="28px"
                        minW="28px"
                      />
                    </HStack>
                  </VStack>
                </VStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
