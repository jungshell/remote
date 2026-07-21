export type Division =
  | "경영혁신본부"
  | "사업총괄실"
  | "AI콘텐츠본부"
  | "미래산업본부"
  | "벤처창업본부";

export type ProgramType =
  | "교육·인력양성형"
  | "인턴십형(교육생)"
  | "인턴십형(참여기업)"
  | "제작·사업화/자금·마케팅 지원형"
  | "입주·인프라형"
  | "행사·네트워킹형"
  | "시설운영형"
  | "수요조사";

export type ProgramTypeCode =
  | "edu"
  | "intern_student"
  | "intern_company"
  | "prod"
  | "space"
  | "event"
  | "facility"
  | "demand";

export type RespondentType = "org" | "person" | "both";

export type UserRole =
  | "응답자"
  | "사업담당자"
  | "본부관리자"
  | "총괄관리자"
  | "조회전용";

export type SurveyStatus = "작성중" | "진행중" | "종료";

export type QuestionScale = "likert5" | "nps" | "text" | "choice";

export type QuestionGroup = "일반" | "공통" | "지침" | "유형" | "커스텀";

/** 기본세트(core)는 생성 시 기본 선택, extended는 필요 시만 추가 */
export type QuestionTier = "core" | "extended";

export interface Project {
  id: string;
  year: number;
  division: Division;
  business: string;
  subBusiness: string;
  round: number;
  type: ProgramType;
  manager: string;
  targetResponses: number;
}

export interface Question {
  id: string;
  group: QuestionGroup;
  category?: string;
  type?: ProgramType;
  label: string;
  scale: QuestionScale;
  required: boolean;
  kpiIncluded: boolean;
  locked?: boolean;
  tier?: QuestionTier;
  options?: string[];
  orderNo?: number;
}

export interface SurveyRecord {
  id: string;
  title: string;
  year: number;
  division: Division;
  business: string;
  subBusiness: string;
  round: number;
  programType: ProgramType;
  respondentType: RespondentType;
  targetResponses: number;
  status: SurveyStatus;
  endsAt?: string | null;
  questions: Question[];
}

export interface SurveyAnswer {
  questionId: string;
  value: string | number;
}

export interface SurveyResponse {
  surveyId: string;
  phoneLast4: string;
  submittedAt: string;
  answers: SurveyAnswer[];
}

export interface DashboardSummary {
  totalSatisfaction: number;
  kpiTarget: number;
  kpiAchievement: number;
  totalResponses: number;
  responseRate: number;
  nps: number;
}
