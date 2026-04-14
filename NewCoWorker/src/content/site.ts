import type {
  DepartmentProgram,
  DepartmentBudget,
  FaqItem,
  FacilityInfo,
  GovernanceNode,
  GlossaryEntry,
  Headquarters,
  HistoryEntry,
  InstitutionalGoal,
  MainBusinessCategory,
  NavSection,
  OrgUnit,
  PortfolioMockSeries,
  PurposeProjectBudget,
  RegionHub,
  SupportProgramSummary2026,
  VideoClip,
  SectionSummary,
  SiteMeta,
  FundingStep,
} from "./types";

/**
 * 기관 표기 — 대외 공문·인사 규정과 동일하게 맞추세요.
 * officialName을 비우면 화면에는 parentLocalGovernment + shortName 조합으로 안내됩니다.
 */
export const institution = {
  officialName: "충남콘텐츠진흥원",
  shortName: "충콘진",
  parentLocalGovernment: "충청남도",
  traineeHonorific: "콘텐츠산업 진흥 실무자",
} as const;

export function getInstitutionDisplayName(): string {
  const formal = institution.officialName.trim();
  if (formal.length > 0) return formal;
  return `${institution.parentLocalGovernment} ${institution.shortName}`;
}

/** 화면 곳곳의 안내 문구 (신입사원·강사 기준 톤) */
export const ui = {
  introKicker: "신입사원 온보딩",
  summaryHeading: "이 파트에서 알아두면 좋아요",
  fundingFlowTitle: "출자출연기관과 자금·서비스 흐름",
  fundingFlowIntro:
    "도(지자체)-기관-도민의 관계를 단계별로 확인합니다.",
  fundingFlowCtaShow: "흐름 펼치기",
  fundingFlowCtaHide: "흐름 접기",
  identityPurposeLabel: "설립 취지 요약",
  budgetBlockTitle: "예산 항목별 비중 (1차 추경)",
  budgetBlockHint:
    "비중·금액은 원본 승인표와 대조하세요.",
  orgDeckTitle: "예산 항목별 운영 포인트",
  orgDeckHint:
    "PC는 호버, 모바일은 「목표 보기」로 확인합니다.",
  glossaryTitle: "온보딩용 용어집",
  glossaryLead:
    "회의·보고서에서 자주 쓰는 용어를 간단히 정리했습니다.",
  governanceLead: () =>
    `도청 주무부서·도의회 상임위·진흥원 내부 의회 대응(경영혁신본부)까지, “보고-협의” 흐름을 계층도로 이해합니다.`,
  organizationLead: () =>
    `2026년 1차 추경 기준 예산 구조(총계·기관운영·목적사업·반환금·예비비)를 차트로 보고, 본부별 실행 포인트를 카드로 확인합니다.`,
  organizationDataNotice:
    "예산·사업액은 내부 승인본과 반드시 대조하세요.",
  faqLead:
    "강의 중 자주 나오는 질문을 모았습니다. 예:",
  footerPrintHint:
    "교육 참고용으로 인쇄할 때는 브라우저의 인쇄 기능을 이용하세요. 배포 범위는 내부 규정에 따릅니다.",
  infographicVisionLine: "도민과 함께하는 정보문화 가치 창조",
  portfolioLegalHint:
    "정관 제3조·제4조의 콘텐츠·정보통신·문화 산업 지원 범위를 세 축으로 구분해 표시합니다.",
  dashboardNumericBanner: "공식 수치는 기획·재무 승인본을 따릅니다.",
  mediaAutoplayHint: "자동 재생 시 음소거로 시작될 수 있습니다. 플레이어에서 음소거 해제.",
  historyLead:
    "설립·정관 개정 등 주요 이벤트를 연도순으로 정리했습니다. 세부는 홈페이지 연혁·정관과 대조하세요.",
  orgChartLead: () =>
    `아래는 온보딩용 요약 직제입니다. 최신 조직도·팀 단위 명칭은 공식 페이지와 내부 인사 기준을 따릅니다.`,
  support2026Lead:
    "2026년 지원사업 설명회 자료 기준 요약입니다. 사업명·일정·세부 자격은 공고·안내서를 확인하세요.",
  support2026AsOfLabel: "요약 기준(내부 자료 반영 시 갱신)",
  mainBusinessLead:
    "사업안내 메뉴·2026 목적사업 구조를 범주별로 묶어 한눈에 봅니다. 세부는 「조직·사업」 슬라이드 예산표와 연결됩니다.",
  facilitiesLead:
    "대표 운영 시설의 역할을 요약했습니다. 주소·이용 안내는 내부 시설 목록·홈페이지와 대조하세요.",
} as const;

/** 단일 소스: 2026 주요업무보고·사업설명회 등 공식 자료 반영 시 이 파일을 갱신 */
export const siteMeta: SiteMeta = {
  title: `${getInstitutionDisplayName()} · 신입사원 기초 정보`,
  lastContentSync: "2026-03-25",
  lastContentSyncLabel:
    "2026년 1차 추경·정관 조항 반영 · 지원사업 설명회 요약은 내부 자료로 갱신",
};

/** 공식 조직도 페이지(외부) */
export const orgChartExternalUrl =
  "https://ccon.kr/bbs/content.php?co_id=org" as const;

export const navSections: NavSection[] = [
  { id: "media", label: "홍보영상" },
  { id: "vision", label: "비전·가치·목표" },
  { id: "history", label: "연혁" },
  { id: "identity", label: "기관 정체성 · 현황" },
  { id: "identityContext", label: "취지·출연 흐름" },
  { id: "orgChart", label: "조직도" },
  { id: "support2026", label: "2026 지원사업" },
  { id: "mainBusiness", label: "주요사업" },
  { id: "facilities", label: "운영시설" },
  { id: "portfolio", label: "산업 포트폴리오" },
  { id: "region", label: "시·군 네트워크" },
  { id: "mindset", label: "직무 마인드" },
  { id: "intro", label: "대시보드" },
  { id: "governance", label: "거버넌스" },
  { id: "organization", label: "조직·사업" },
  { id: "glossary", label: "용어" },
  { id: "faq", label: "FAQ" },
];

/** 비전 인포그래픽: 핵심 가치 흐름 */
export const visionValuesFlow = [
  {
    id: "growth",
    keyword: "성장",
    hint: "산업·인재 성장",
    lucide: "TrendingUp" as const,
  },
  {
    id: "fusion",
    keyword: "융합",
    hint: "기술·콘텐츠 결합",
    lucide: "Layers" as const,
  },
  {
    id: "coexist",
    keyword: "상생",
    hint: "지역·도민과 동행",
    lucide: "Handshake" as const,
  },
];

/** 비전 슬라이드 하단: 경영·연간 방향 카드(공식 문구는 기획·홈페이지와 대조) */
export const institutionalGoals: InstitutionalGoal[] = [
  {
    id: "g1",
    title: "목적사업 집행력",
    shortDescription: "핵심 사업·지역 특화 과제의 예산·일정 정합성 확보",
    lucide: "Target",
  },
  {
    id: "g2",
    title: "기관운영 안정",
    shortDescription: "이사회·내부통제·의회 대응 등 거버넌스 체계 유지",
    lucide: "Landmark",
  },
  {
    id: "g3",
    title: "도민 체감 성과",
    shortDescription: "지원·인프라·거점 운영이 지역 산업·일자리로 연결되도록 관리",
    lucide: "Users",
  },
  {
    id: "g4",
    title: "재무·반환 정확도",
    shortDescription: "반환금·예비비 등 집행·정산의 투명성과 보고 품질 강화",
    lucide: "LineChart",
  },
];

/** 산업 포트폴리오 차트 — 슬라이드별 사업 비중(개념도, 합계 100) */
export const portfolioMockSeries: PortfolioMockSeries[] = [
  {
    id: "content",
    title: "콘텐츠",
    chartKind: "bar",
    series: [
      { name: "기획·제작", value: 45 },
      { name: "유통·마케팅", value: 30 },
      { name: "글로벌", value: 25 },
    ],
  },
  {
    id: "ict",
    title: "ICT",
    chartKind: "bar",
    series: [
      { name: "기업·보육", value: 42 },
      { name: "기술지원", value: 33 },
      { name: "PoC·데모", value: 25 },
    ],
  },
  {
    id: "video",
    title: "영상",
    chartKind: "pie",
    series: [
      { name: "다큐·콘텐츠", value: 38 },
      { name: "홍보·캠페인", value: 37 },
      { name: "교육·아카이브", value: 25 },
    ],
  },
];

/** 15개 시·군 중 주요 거점(인포그래픽용 단순 좌표) */
export const regionHubs: RegionHub[] = [
  { id: "cheonan", label: "천안", x: 0.52, y: 0.22, keywords: ["게임", "e스포츠"] },
  { id: "asan", label: "아산", x: 0.48, y: 0.3, keywords: ["ICT", "SW"] },
  { id: "seosan", label: "서산", x: 0.22, y: 0.38, keywords: ["영상", "촬영"] },
  { id: "dangjin", label: "당진", x: 0.28, y: 0.18, keywords: ["스마트제조", "ICT"] },
  { id: "gyeryong", label: "계룡", x: 0.42, y: 0.34, keywords: ["행정", "연계"] },
  { id: "gongju", label: "공주", x: 0.35, y: 0.52, keywords: ["역사콘텐츠"] },
  { id: "boryeong", label: "보령", x: 0.18, y: 0.55, keywords: ["관광", "축제 IP"] },
  { id: "buyeo", label: "부여", x: 0.32, y: 0.68, keywords: ["문화유산"] },
  { id: "seocheon", label: "서천", x: 0.25, y: 0.78, keywords: ["로컬 미디어"] },
  { id: "cheongyang", label: "청양", x: 0.4, y: 0.72, keywords: ["농콘텐츠"] },
  { id: "hongseong", label: "홍성", x: 0.35, y: 0.42, keywords: ["메타·XR"] },
  { id: "yesan", label: "예산", x: 0.55, y: 0.48, keywords: ["제조 연계"] },
  { id: "taean", label: "태안", x: 0.12, y: 0.42, keywords: ["관광 영상"] },
  { id: "geumsan", label: "금산", x: 0.58, y: 0.62, keywords: ["인삼·브랜드"] },
  { id: "nonsan", label: "논산", x: 0.62, y: 0.4, keywords: ["교육·훈련"] },
];

/** 직무 마인드셋 타임라인 */
export const mindsetTimeline = {
  principles: [
    { id: "fair", keyword: "공정성", lucide: "Scale" as const },
    { id: "pro", keyword: "전문성", lucide: "BadgeCheck" as const },
  ],
  steps: [
    { id: "plan", label: "사업 기획", hint: "목표·지표 설계" },
    { id: "review", label: "공정한 심사", hint: "기준·절차 준수" },
    { id: "outcome", label: "성과 도출", hint: "도민 체감·보고" },
  ],
} as const;

export const institutionOverview = {
  legalBasis: [
    "충남콘텐츠진흥원 정관(목적·사업)",
    "충청남도 출자·출연기관 운영 관련 규정(내부 기준)",
  ],
  milestones: [
    { year: "2009", text: "정관 개정(2009.10.27.)" },
    { year: "2020", text: "정관 개정(2020.02.02.)" },
    { year: "2025", text: "정관 전문개정(2025.05.27.)" },
  ],
  keyWork: [
    "콘텐츠산업·정보통신산업·문화산업 육성 계획·시책 개발",
    "기업육성·기반조성·시설/장비 운영 및 지원",
    "정보 수집·조사·연구·보급",
    "국내외 교류·협력 및 정부사업 유치",
    "전문인력 양성·마케팅·투자(조합 결성)·창업지원",
  ],
  facilities: [
    "주요시설 항목은 내부 ‘시설 목록’ 기준으로 업데이트",
    "예: 콘텐츠기업지원센터, 글로벌게임센터, 메타버스지원센터 등",
  ],
} as const;

/** 전체 연혁(인포그래픽용 — 홈페이지 연혁 복사 후 이 배열로 통합 권장) */
export const institutionHistory: HistoryEntry[] = [
  {
    id: "h01",
    year: "2005",
    title: "충남콘텐츠진흥원 설립",
    detail: "지역 콘텐츠·정보통신 산업 육성을 위한 출연기관으로 출발",
  },
  {
    id: "h02",
    year: "2009",
    title: "정관 개정",
    detail: "2009.10.27. — 목적·사업 범위 등 정관 정비",
  },
  {
    id: "h03",
    year: "2020",
    title: "정관 개정",
    detail: "2020.02.02. — 운영 환경 변화 반영",
  },
  {
    id: "h04",
    year: "2024",
    title: "본부·실 체계 조정",
    detail: "사업 총괄·AI콘텐츠·미래산업·벤처창업 등 기능별 본부 운영(내부 직제와 대조)",
  },
  {
    id: "h05",
    year: "2025",
    title: "정관 전문개정",
    detail: "2025.05.27. — 최신 법·제도 및 사업 환경 반영",
  },
];

/** 온보딩용 요약 조직 트리(팀 단위는 공식 조직도 URL·내부 직제표로 확인) */
export const orgChartRoot: OrgUnit = {
  id: "root",
  label: "원장",
  subtitle: "경영 총괄",
  children: [
    {
      id: "biz-hq",
      label: "사업총괄실",
      subtitle: "사업 조정·성장위원회 등",
    },
    {
      id: "ai",
      label: "AI콘텐츠본부",
      subtitle: "영상·웹툰·음악·코리아랩",
    },
    {
      id: "future",
      label: "미래산업본부",
      subtitle: "게임·e스포츠·메타버스·기업지원센터",
    },
    {
      id: "venture",
      label: "벤처창업본부",
      subtitle: "창업·거점·스튜디오·IP",
    },
    {
      id: "mgmt",
      label: "경영혁신본부",
      subtitle: "기관운영·의회 대응·내부통제",
    },
  ],
};

/**
 * 2026 지원사업 설명회 요약 슬롯.
 * 실제 사업명·대상·일정은 설명회 PDF/요약본을 받는 대로 이 배열을 교체하세요.
 */
export const supportPrograms2026: SupportProgramSummary2026[] = [
  {
    id: "sp1",
    name: "지역특화콘텐츠 개발",
    audience: "시·군·제작사 등(공고 기준)",
    purpose: "지역 스토리·IP 기반 콘텐츠 기획·제작 지원",
    period: "연중 공고",
  },
  {
    id: "sp2",
    name: "충남 영상·영화산업 육성",
    audience: "영상 제작·인프라 활용 주체",
    purpose: "촬영·제작·유통 연계 강화",
    period: "분기별 과제",
  },
  {
    id: "sp3",
    name: "이스포츠 상설경기장·메카 조성",
    audience: "지자체·협회·기업",
    purpose: "e스포츠 거점 인프라·대회·육성",
    scaleNote: "예산 비중 큰 핵심 과제 — 세부는 사업설명서 참고",
  },
  {
    id: "sp4",
    name: "디지털·게임기업 육성",
    audience: "게임·SW 스타트업",
    purpose: "데모·보육·글로벌 연계",
  },
  {
    id: "sp5",
    name: "그린스타트업타운·스마트도시",
    audience: "창업기업·지자체 협력",
    purpose: "창업 거점·실증 공간 운영",
  },
  {
    id: "sp6",
    name: "창작스튜디오·IP 기획",
    audience: "창작자·제작사",
    purpose: "장비·공간·기획 개발 지원",
  },
];

/** 사업안내 범주형 요약(키워드 칩 — departmentPrograms2026와 메시지 정합) */
export const mainBusinessCategories: MainBusinessCategory[] = [
  {
    id: "mb1",
    title: "기획·조정",
    chips: ["성장위원회", "지역특화", "사업 총괄"],
    summary: "도·시군 정책과 연계한 과제 발굴·조정, 지역특화 콘텐츠 거점 사업을 총괄합니다.",
  },
  {
    id: "mb2",
    title: "콘텐츠·IP",
    chips: ["영상", "웹툰", "음악", "코리아랩"],
    summary: "영상·웹툰·음악 등 창작 인프라와 지역기반형 콘텐츠코리아랩으로 제작 역량을 키웁니다.",
  },
  {
    id: "mb3",
    title: "디지털·게임·e스포츠",
    chips: ["게임센터", "메타버스", "상설경기장", "투자조합"],
    summary: "게임·메타버스 지원센터, e스포츠 인프라, 기업유치·투자 연계로 미래 산업을 지원합니다.",
  },
  {
    id: "mb4",
    title: "창업·거점",
    chips: ["창조센터", "스타트업타운", "스튜디오", "스마트도시"],
    summary: "창업 보육·스튜디오·거점형 스마트도시 등 창업·실증 공간을 운영합니다.",
  },
];

/** 운영 시설(공개 가능한 명칭·역할 중심 — 주소는 내부 정책에 따름) */
export const facilitiesDetailed: FacilityInfo[] = [
  {
    id: "f1",
    name: "충남콘텐츠기업지원센터",
    role: "콘텐츠 스타트업 집적·멘토링·네트워킹",
    location: "천안(대표 거점 — 세부 주소는 내부 안내)",
  },
  {
    id: "f2",
    name: "충남글로벌게임센터",
    role: "게임 기업 육성·해외 진출 지원",
  },
  {
    id: "f3",
    name: "충남메타버스지원센터",
    role: "XR·메타버스 제작·실증 지원",
  },
  {
    id: "f4",
    name: "이스포츠 상설경기장(사업 연계)",
    role: "대회·육성·거점 인프라(사업 설명서 기준)",
  },
  {
    id: "f5",
    name: "창작스튜디오·음악창작소",
    role: "영상·음악 창작 장비·공간 제공",
  },
  {
    id: "f6",
    name: "그린스타트업타운 등 창업 거점",
    role: "창업기업 입주·실증·지자체 협력",
  },
];

export const sectionSummaries: SectionSummary[] = [
  {
    id: "intro",
    title: "환영",
    bullets: [
      `${getInstitutionDisplayName()}이 추구하는 역할과 사업 규모를 그림·숫자로 빠르게 짚어봅니다.`,
      "충콘진의 보고 체계와 예산 구조를 먼저 익혀 실무 문서를 읽는 속도를 높입니다.",
      "우측·하단 목차로 교육 시간대별 구간(탐색 → 거버넌스 → 사업)으로 바로 이동할 수 있습니다.",
    ],
  },
  {
    id: "identity",
    title: "기관 정체성",
    bullets: [
      "출연기관의 법적 성격과 충콘진의 설립 목적(정관 제3조)을 핵심 위주로 정리합니다.",
      "도의 출자·우리의 집행·도민에게 가는 성과라는 흐름을 하나의 그림으로 이해합니다.",
      "정관 제3조의2(용어 정의), 제4조(사업 범위)와 연결해 실무 맥락을 잡습니다.",
    ],
  },
  {
    id: "governance",
    title: "거버넌스",
    bullets: [
      "도청 주무부서와 어떤 안건으로 협의하는지, 도의회와는 어떤 주기·성격으로 연결되는지 봅니다.",
      "「왜 의회·도청에 보고해야 하는가」를 신입 입장에서 말로 풀어 설명할 수 있는 표현을 담았습니다.",
      "화면 크기에 맞춰 같은 내용을 가로·세로로 보여 주어 현장 시연이 수월합니다.",
    ],
  },
  {
    id: "organization",
    title: "조직·사업",
    bullets: [
      "2026년 1차 추경 기준으로 기관운영·목적사업·반환금·예비비 비중을 빠르게 파악합니다.",
      "목적사업의 규모와 구성 항목을 먼저 이해하면 부서 간 협업 문맥을 잡기 쉽습니다.",
      "대외 문서 작성 시에는 승인본 예산표(재무·기획)와 반드시 대조하세요.",
    ],
  },
  {
    id: "glossary",
    title: "용어",
    bullets: [
      "회의에서 나오는 행정·재무 용어를 짧게 정리해 같은 말이 반복될 때 오해를 줄입니다.",
      "정의가 바뀌면 총무·기획과 협의한 뒤 이 용어집을 함께 업데이트합니다.",
      "법적 판단이 필요하면 이 용어집 대신 정관·내부 규정과 법무 확인을 우선합니다.",
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    bullets: [
      "신입이 가장 많이 묻는 질문에 표준 답변 형태를 맞춰 두었습니다.",
      "해시 링크로 강의 자료나 메신저에 바로 붙여 설명을 재사용할 수 있습니다.",
      "새로운 질문이 정리되면 운영 담당과 상의해 항목을 추가합니다.",
    ],
  },
];

export const fundingFlowSteps: FundingStep[] = [
  {
    label: "지방자치단체의 출자",
    description:
      `${institution.parentLocalGovernment}가 자본금을 출자하고 설립 목적을 담은 정관에 따라 법인을 유지·감독합니다.`,
  },
  {
    label: `${institution.shortName}의 운영·집행`,
    description:
      "이사회 결의와 원장의 경영 아래 사업을 기획·집행하고, 내부 통제·성과관리 체계에 따라 운영합니다.",
  },
  {
    label: "도민을 위한 공공서비스",
    description:
      "문화·콘텐츠·산업·교육 등 정관이 정한 범위에서 공공성과 지역 균형을 고려한 서비스를 제공합니다.",
  },
];

export const governanceTree: GovernanceNode = {
  id: "root",
  label: institution.parentLocalGovernment,
  children: [
    {
      id: "exec",
      label: "도지사 소속 행정기관",
      subtitle: "문화체육관광국 문화정책과",
      children: [
        {
          id: "mct",
          label: "문화체육관광국 문화정책과",
          subtitle: "사업 지침·예산 협의·실적 점검",
        },
      ],
    },
    {
      id: "council",
      label: "도의회",
      subtitle: "의정 활동·예산·결산 심의",
      children: [
        {
          id: "committee",
          label: "행정문화위원회",
          subtitle: "소관 분야 안건 심사·질의",
        },
      ],
    },
    {
      id: "institute",
      label: getInstitutionDisplayName(),
      subtitle: "지방자치단체 출자 출연기관",
      children: [
        {
          id: "reporting",
          label: "보고·협의 채널",
          subtitle: "주요안건·실적·회계 공시 (의회 대응: 경영혁신본부)",
        },
      ],
    },
  ],
};

/** 단위: 억 원 — 당해 연도 예산서·주요업무 보고 표와 동일한 기준으로 기입 */
export const headquarters2026: Headquarters[] = [
  {
    id: "institution-operation",
    name: "기관운영",
    lucideIcon: "Landmark",
    budget2026BillionWon: 22.8,
    budgetSharePercent: 9.5,
    goals2026: [
      "이사회·내부 통제·경영관리 체계 안정화",
      "의회 대응·대외 보고 체계의 정합성 유지",
    ],
  },
  {
    id: "core-business",
    name: "목적사업",
    lucideIcon: "Sparkles",
    budget2026BillionWon: 208.26,
    budgetSharePercent: 86.6,
    goals2026: [
      "지역특화콘텐츠 개발, 이스포츠 상설경기장 운영 등 핵심 사업 집행",
      "기업지원·인력양성·창업·투자 연계를 통한 콘텐츠산업 경쟁력 강화",
    ],
  },
  {
    id: "refund",
    name: "반환금",
    lucideIcon: "Users",
    budget2026BillionWon: 7.58,
    budgetSharePercent: 3.2,
    goals2026: [
      "국·도비 정산 기준에 맞춘 반환 절차 이행",
      "집행 종료 사업의 정산·보고 정확도 확보",
    ],
  },
  {
    id: "reserve",
    name: "예비비",
    lucideIcon: "LineChart",
    budget2026BillionWon: 1.94,
    budgetSharePercent: 0.8,
    goals2026: [
      "예상치 못한 집행 수요 대응 여력 확보",
      "예비비 사용 사유·절차의 사전 통제",
    ],
    note: "총계 240.58억(단위: 억 원) 기준",
  },
];

export const departmentPrograms2026: DepartmentProgram[] = [
  {
    department: "경영혁신본부",
    programs: ["기관운영", "반환금", "예비비"],
  },
  {
    department: "사업총괄실",
    programs: ["지역특화콘텐츠 개발", "충남콘텐츠산업성장위원회 운영"],
  },
  {
    department: "AI콘텐츠본부",
    programs: [
      "충남 영상·영화산업 육성",
      "충남 웹툰산업 육성 및 활성화",
      "충남 음악창작소 운영",
      "지역기반형 콘텐츠코리아랩 운영",
    ],
  },
  {
    department: "미래산업본부",
    programs: [
      "충남 이스포츠 메카 조성",
      "충남 이스포츠 상설경기장 구축 지원",
      "충남 디지털·게임기업 육성",
      "충남글로벌게임센터 운영",
      "충남콘텐츠기업지원센터 운영",
      "충남메타버스지원센터 운영",
      "미래 게임 발굴 창작자 양성",
      "제1호 벤처투자조합 조성 및 운영",
      "기업유치인센티브 지원",
      "입주기업 환경개선",
    ],
  },
  {
    department: "벤처창업본부",
    programs: [
      "창조문화산업지원센터창업지원",
      "그린스타트업타운 운영",
      "천안시 거점형 스마트도시 조성",
      "창작스튜디오운영",
      "영화·드라마 IP 기획개발지원",
    ],
  },
];

/** 목적사업(208.26억) 내 본부별 비중 */
export const departmentBudgets2026: DepartmentBudget[] = [
  {
    department: "사업총괄실",
    budget2026BillionWon: 14.6,
    budgetSharePercentWithinPurpose: 7.0,
  },
  {
    department: "AI콘텐츠본부",
    budget2026BillionWon: 25.67,
    budgetSharePercentWithinPurpose: 12.3,
  },
  {
    department: "미래산업본부",
    budget2026BillionWon: 124.19,
    budgetSharePercentWithinPurpose: 59.6,
  },
  {
    department: "벤처창업본부",
    budget2026BillionWon: 43.8,
    budgetSharePercentWithinPurpose: 21.0,
  },
];

/** 목적사업 세부 예산 (단위: 억 원) */
export const purposeProjectBudgets2026: PurposeProjectBudget[] = [
  { id: "p01", department: "사업총괄실", project: "지역특화콘텐츠 개발", budget2026BillionWon: 14.45 },
  { id: "p02", department: "사업총괄실", project: "충남콘텐츠산업성장위원회 운영", budget2026BillionWon: 0.15 },

  { id: "p03", department: "AI콘텐츠본부", project: "충남 영상·영화산업 육성", budget2026BillionWon: 6.4 },
  { id: "p04", department: "AI콘텐츠본부", project: "충남 웹툰산업 육성 및 활성화", budget2026BillionWon: 1.3 },
  { id: "p05", department: "AI콘텐츠본부", project: "충남 음악창작소 운영", budget2026BillionWon: 8.0 },
  { id: "p06", department: "AI콘텐츠본부", project: "지역기반형 콘텐츠코리아랩 운영", budget2026BillionWon: 9.97 },

  { id: "p07", department: "미래산업본부", project: "충남 이스포츠 메카 조성", budget2026BillionWon: 5.4 },
  { id: "p08", department: "미래산업본부", project: "충남 이스포츠 상설경기장 구축 지원", budget2026BillionWon: 74.26 },
  { id: "p09", department: "미래산업본부", project: "충남 디지털·게임기업 육성", budget2026BillionWon: 5.3 },
  { id: "p10", department: "미래산업본부", project: "충남글로벌게임센터 운영", budget2026BillionWon: 20.6 },
  { id: "p11", department: "미래산업본부", project: "충남콘텐츠기업지원센터 운영", budget2026BillionWon: 7.9 },
  { id: "p12", department: "미래산업본부", project: "충남메타버스지원센터 운영", budget2026BillionWon: 7.88 },
  { id: "p13", department: "미래산업본부", project: "미래 게임 발굴 창작자 양성", budget2026BillionWon: 1.0 },
  { id: "p14", department: "미래산업본부", project: "제1호 벤처투자조합 조성 및 운영", budget2026BillionWon: 1.5 },
  { id: "p15", department: "미래산업본부", project: "기업유치인센티브 지원", budget2026BillionWon: 0.32 },
  { id: "p16", department: "미래산업본부", project: "입주기업 환경개선", budget2026BillionWon: 0.03 },

  { id: "p17", department: "벤처창업본부", project: "창조문화산업지원센터창업지원", budget2026BillionWon: 0.3 },
  { id: "p18", department: "벤처창업본부", project: "그린스타트업타운 운영", budget2026BillionWon: 24.94 },
  { id: "p19", department: "벤처창업본부", project: "천안시 거점형 스마트도시 조성", budget2026BillionWon: 16.94 },
  { id: "p20", department: "벤처창업본부", project: "창작스튜디오운영", budget2026BillionWon: 1.4 },
  { id: "p21", department: "벤처창업본부", project: "영화·드라마 IP 기획개발지원", budget2026BillionWon: 0.22 },
];

/** 유튜브 클립: 교육 중 “부분 재생” 용도 */
export const videoClips: VideoClip[] = [
  {
    id: "official-promo",
    title: "충남콘텐츠진흥원 오피셜 홍보영상",
    youtubeId: "PKo_TO9yP14",
    tags: ["media", "welcome", "intro"],
  },
  // 아래는 예시 슬롯입니다. 채널에서 추가할 영상 ID/타임스탬프를 주시면 확장합니다.
  {
    id: "clip-identity",
    title: "기관 역할/지원체계 소개 (추가 예정)",
    youtubeId: "PKo_TO9yP14",
    startSeconds: 0,
    tags: ["identity"],
  },
];

export const glossary: GlossaryEntry[] = [
  {
    term: "출연기관",
    definition:
      "지방자치단체가 출자/출연해 설립하고, 공익적 사업을 수행하는 법인입니다.",
  },
  {
    term: "출자",
    definition:
      "법인 설립을 위해 자본금을 납입하는 행위입니다.",
  },
  {
    term: "주무부서",
    definition:
      `${institution.shortName}의 정책 소관 부서는 충청남도 문화체육관광국 문화정책과이며, 예산·지침·실적 보고의 주된 협의 창구가 됩니다.`,
  },
  {
    term: "도의회·상임위",
    definition:
      "도의회는 조례·예산·결산 등을 심의하고, 상임위는 분야별 안건을 사전 검토합니다.",
  },
  {
    term: "사업비·본예산",
    definition:
      "특정 목적의 사업에 배정된 예산입니다.",
  },
  {
    term: "이사회",
    definition:
      "법인 경영의 중요 사항을 의결하는 기관으로, 정관이 정한 바에 따라 소집·의결됩니다.",
  },
  {
    term: "정관",
    definition:
      "법인의 목적·조직·운영 원칙을 적은 기본 규정입니다. 업무 판단이 필요할 때는 최신 정관과 내부 규정을 함께 확인합니다.",
  },
  {
    term: "설립 목적(정관 제3조)",
    definition:
      "충청남도를 정보통신·문화콘텐츠 등 첨단 고부가가치 산업의 중심도로 육성하기 위한 종합지원체계를 구축·운영하고, 벤처기업 육성과 콘텐츠·정보통신·문화산업의 경쟁력 강화에 기여하는 것을 목적으로 합니다.",
  },
];

export const faqItems: FaqItem[] = [
  {
    id: "faq-why-council",
    question: "왜 도의회 보고·자료 제출이 필요한가요?",
    answer:
      "도의회는 조례·예산·결산·주요 정책 등을 심의합니다. 본 기관은 공적 재원 기반 사업을 수행하므로, 의회 요구 범위 내에서 자료를 제출하고 실적을 설명해야 합니다. 실무 대응은 경영혁신본부 중심으로 진행됩니다.",
  },
  {
    id: "faq-budget",
    question: "본부 예산은 누가, 어떤 순서로 확정하나요?",
    answer:
      "도·본원의 예산 편성·심의 과정을 거쳐 확정됩니다. 신입사원은 먼저 주요업무보고·사업설명회 자료에 실린 본부별·사업별 규모를 숙지하고, 세부 집행·이체는 재무·기획 부서의 안내를 따르는 것이 안전합니다. 이 페이지의 숫자는 레이아웃 예시일 수 있으므로 원문과 반드시 대조하세요.",
  },
  {
    id: "faq-collab",
    question: "다른 본부와 협업은 어디서부터 맞추면 되나요?",
    answer:
      "같은 연도·같은 지표를 공유하는 사업부터 찾습니다. 본 페이지의 본부 카드와 예산 그래프로 상대 본부의 중점 과제와 규모를 파악한 뒤, 기획 단계에서 MR(회의실 예약) 또는 공식 협의 채널을 통해 담당자와 일정·역할을 조율하면 됩니다.",
  },
  {
    id: "faq-official-doc",
    question: "대외 제출·보도에 써도 되는 ‘공식’ 수치는 어디인가요?",
    answer:
      "대외 공문·여론 대응·보도자료에 쓰는 수치·명칭은 기획·홍보·재무가 배포한 승인본만 사용합니다. 온보딩용 웹 가이드는 교육 편의를 위한 것이며, 법적·회계적 효력이 있는 문서가 아닙니다.",
  },
];
