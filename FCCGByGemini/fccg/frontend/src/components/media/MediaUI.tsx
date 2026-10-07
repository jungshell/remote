import React from 'react';
import { AspectRatio, Box, Flex, HStack, Icon, Text, Tooltip, type BoxProps } from '@chakra-ui/react';
import { MdPlayArrow } from 'react-icons/md';

// 회원 미디어 영역(사진·동영상·홈 하이라이트) 공통 조각. 썸네일이 주인공이고 메타는 짧게 둔다.

// 미디어 카드: 고정 비율 썸네일 + 오버레이 슬롯 + 짧은 메타 영역
export const MediaCard: React.FC<{
  media: React.ReactNode;
  ratio?: number;
  overlay?: React.ReactNode;
  mediaProps?: BoxProps;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ media, ratio = 16 / 9, overlay, mediaProps, onClick, children }) => (
  <Box
    className="fccg-matchday"
    bg="white"
    borderRadius="xl"
    border="1px solid"
    borderColor="gray.200"
    overflow="hidden"
    cursor="pointer"
    onClick={onClick}
    transition="border-color .2s ease, box-shadow .2s ease"
    _hover={{ borderColor: 'brand.200', boxShadow: '0 10px 24px rgba(10, 27, 51, 0.08)' }}
    sx={{
      '& .fccg-media-img': { transition: 'transform .45s cubic-bezier(.16,1,.3,1)' },
      '&:hover .fccg-media-img': { transform: 'scale(1.03)' },
      '@media (prefers-reduced-motion: reduce)': { '&:hover .fccg-media-img': { transform: 'none' } },
    }}
  >
    <Box position="relative" bg="gray.100" {...mediaProps}>
      <AspectRatio ratio={ratio}>
        <Box overflow="hidden">{media}</Box>
      </AspectRatio>
      {overlay}
    </Box>
    <Box px={4} pt={3} pb={3.5}>{children}</Box>
  </Box>
);

// 아이콘 + 숫자 (툴팁으로 의미 설명)
export const MediaStat: React.FC<{ icon: React.ElementType; value: React.ReactNode; label: string; iconColor?: string }> = ({ icon, value, label, iconColor = 'gray.400' }) => (
  <Tooltip label={label} fontSize="11px" bg="matchday.navy" color="white" borderRadius="md" px={2} py={1}>
    <HStack spacing={1} cursor="default" color="gray.500">
      <Icon as={icon} boxSize="14px" color={iconColor} />
      <Text fontSize="xs" fontWeight="600" lineHeight="1">{value}</Text>
    </HStack>
  </Tooltip>
);

// 썸네일 위 재생 표시 (동영상 카드)
export const PlayOverlay: React.FC<{ size?: number }> = ({ size = 52 }) => (
  <Flex position="absolute" inset={0} align="center" justify="center" pointerEvents="none">
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg="whiteAlpha.900"
      color="matchday.navy"
      align="center"
      justify="center"
      boxShadow="0 6px 18px rgba(0, 0, 0, 0.25)"
    >
      <Icon as={MdPlayArrow} boxSize={`${Math.round(size * 0.55)}px`} ml="2px" />
    </Flex>
  </Flex>
);

// 영상 poster: 플레이어가 준비/재생되기 전 16:9 영역을 채우는 썸네일 + 재생 표시 (+ 선택 상태 문구)
export const VideoPoster: React.FC<{ videoId: string; status?: string } & BoxProps> = ({ videoId, status, ...rest }) => (
  <Box position="absolute" inset={0} bg="matchday.navy" overflow="hidden" {...rest}>
    <Box
      as="img"
      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
      alt=""
      aria-hidden="true"
      position="absolute"
      inset={0}
      w="100%"
      h="100%"
      objectFit="cover"
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
    <Box position="absolute" inset={0} bgGradient="linear(to-t, rgba(10,27,51,0.55), rgba(10,27,51,0.05))" />
    <PlayOverlay size={64} />
    {status && (
      <Text position="absolute" left={0} right={0} bottom={3} textAlign="center" fontSize="xs" fontWeight="700" color="whiteAlpha.900">
        {status}
      </Text>
    )}
  </Box>
);

// 썸네일 위 작은 정보 칩 (사진 장수 등)
export const MediaChip: React.FC<BoxProps> = (props) => (
  <Box
    position="absolute"
    px={2}
    py="2px"
    borderRadius="sm"
    bg="blackAlpha.700"
    color="white"
    fontSize="11px"
    fontWeight="700"
    lineHeight="1.5"
    {...props}
  />
);
