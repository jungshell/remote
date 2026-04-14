export type SiteMeta = {
  title: string;
  /** PDF/내부 자료 반영 기준일 (ISO) */
  lastContentSync: string;
  /** 표시용 레이블 */
  lastContentSyncLabel: string;
};

export type NavSection = {
  id: string;
  label: string;
};

export type SectionSummary = {
  id: string;
  title: string;
  bullets: [string, string, string];
};

export type FundingStep = {
  label: string;
  description: string;
};

export type GovernanceNode = {
  id: string;
  label: string;
  subtitle?: string;
  children?: GovernanceNode[];
};

export type Headquarters = {
  id: string;
  name: string;
  lucideIcon: "Sparkles" | "Landmark" | "Users" | "Cpu" | "LineChart";
  budget2026BillionWon: number;
  budgetSharePercent: number;
  /** 2026 본부 핵심 목표 (툴팁) */
  goals2026: string[];
  note?: string;
};

export type DepartmentProgram = {
  department: string;
  programs: string[];
};

export type DepartmentBudget = {
  department: string;
  budget2026BillionWon: number;
  budgetSharePercentWithinPurpose: number;
};

export type PurposeProjectBudget = {
  id: string;
  department: string;
  project: string;
  budget2026BillionWon: number;
};

export type VideoClip = {
  id: string;
  title: string;
  youtubeId: string;
  startSeconds?: number;
  /** 어떤 페이지에서 쓰는지 */
  tags: Array<
    "welcome" | "intro" | "identity" | "governance" | "organization" | "glossary" | "faq" | "media"
  >;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type GlossaryEntry = {
  term: string;
  definition: string;
};

/** 인포그래픽용 단순화 지도 좌표(0–1, 좌상단 원점) */
export type RegionHub = {
  id: string;
  label: string;
  x: number;
  y: number;
  keywords: string[];
};

/** 산업 포트폴리오 카드 차트 시리즈(슬라이드용 개념 비중) */
export type PortfolioMockSeries = {
  id: "content" | "ict" | "video";
  title: string;
  chartKind: "bar" | "pie";
  series: { name: string; value: number }[];
};

/** 비전 슬라이드 하단 경영·연간 목표 카드 */
export type InstitutionalGoal = {
  id: string;
  title: string;
  shortDescription: string;
  lucide: "Target" | "LineChart" | "Users" | "Landmark";
};

/** 연혁 타임라인(홈페이지·정관 이력 등 단일 소스) */
export type HistoryEntry = {
  id: string;
  year: string;
  title: string;
  detail?: string;
};

/** 조직도 트리(본부→팀) */
export type OrgUnit = {
  id: string;
  label: string;
  subtitle?: string;
  children?: OrgUnit[];
};

/** 2026 지원사업 설명회 요약(자료 갱신 시 이 배열만 수정) */
export type SupportProgramSummary2026 = {
  id: string;
  name: string;
  audience: string;
  purpose: string;
  period?: string;
  scaleNote?: string;
};

/** 운영 시설 카드 */
export type FacilityInfo = {
  id: string;
  name: string;
  role: string;
  location?: string;
};

/** 주요사업 안내(범주 + 키워드 칩) */
export type MainBusinessCategory = {
  id: string;
  title: string;
  chips: string[];
  summary: string;
};
