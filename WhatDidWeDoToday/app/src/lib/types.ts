/**
 * 타입 정의 파일
 * 앱 전체에서 사용하는 공통 타입들을 정의합니다.
 */

export type DiaryEntry = {
  id: string;
  title: string;
  summary: string;
  timeline: string[];
  goodThingsByMember: Record<string, string[]>;
  quote: string;
  moodScore: number;
  imageUrls: string[];
  imagePrompts?: string[];
  imageCaptions?: string[];
  keywords?: string[];
  combinedImagePrompt?: string;
  combinedImageUrl?: string;
  /** 사용자가 직접 올린 그림 파일 URL (PDF/책용 표지·일러스트) */
  customImageUrl?: string;
  /** Storage 없을 때 붙여넣기 이미지용 data URL (용량 제한 있음) */
  customImageDataUrl?: string;
  date: string;
  location: string;
  weather: string;
  transcript?: string;
  transcriptPreview?: string;
  audioUrl?: string;
  members?: string[];
  photoUrls?: string[];
  createdAt?: string;
};

export type VoiceSegment = {
  text: string;
  speaker: string;
  startTime: number;
};

export type UploadedPhoto = {
  id: string;
  url: string;
  analysis: {
    tags?: string[];
    location?: string | null;
    activity?: string;
    people?: string[];
    caption?: string;
    title?: string;
    emotion?: string;
    photoDate?: string | null;
    photoTime?: string | null; // ISO 8601 형식 (예: "2026-01-17T10:30:00")
    photoLatitude?: number | null; // GPS 위도 (EXIF에서 추출)
    photoLongitude?: number | null; // GPS 경도 (EXIF에서 추출)
  };
};

export type FamilyProfile = {
  member: string;
  features: {
    gender?: string;
    age?: string;
    hasBeard?: boolean;
    hairColor?: string;
    hairStyle?: string;
    faceShape?: string;
    eyeSize?: string;
    glasses?: boolean;
    description?: string;
  };
  updatedAt?: string;
};

export type StatsData = {
  totalDiaries: number;
  totalKeywords: Record<string, number>;
  locations: Record<string, number>;
  moodScores: number[];
  members: Record<string, {
    count: number;
    totalMood: number;
    keywords: Record<string, number>;
  }>;
  timeline: Array<{
    date: string;
    title: string;
    mood: number;
    location: string;
  }>;
};

export type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  summary: string;
  location: string;
  weather: string;
  moodScore: number;
  quote?: string;
  keywords?: string[];
  createdAt: string;
};

export type TabType = "diary" | "stats" | "timeline" | "dashboard" | "album" | "map";

export type MapPlaceDiary = {
  id: string;
  date: string;
  title: string;
  quote?: string;
};

export type MapPlace = {
  location: string;
  diaryIds: string[];
  diaries: MapPlaceDiary[];
};
