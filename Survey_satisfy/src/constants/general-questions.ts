import { getCommonKpiQuestions } from "@/constants/common-kpi-questions";
import { getQuestionsByIds } from "@/constants/question-pool";
import type { ProgramType, Question, RespondentType } from "@/types/platform";
import { getProgramTypeCode } from "@/lib/surveys/program-type";

const PARTICIPATION_PATH: Question = {
  id: "cc2",
  group: "일반",
  category: "일반사항",
  label: "참여 경로",
  scale: "choice",
  required: false,
  kpiIncluded: false,
  options: ["홈페이지", "페이스북·인스타그램", "문자", "포스터", "온라인커뮤니티", "기타"],
  orderNo: 1,
};

const BUSINESS_NAME: Question = {
  id: "cc1",
  group: "일반",
  category: "일반사항",
  label: "사업(교육)명",
  scale: "text",
  required: false,
  kpiIncluded: false,
  orderNo: 0,
};

const ORG_QUESTIONS: Question[] = [
  {
    id: "o1",
    group: "일반",
    category: "기관 정보",
    label: "기관(기업)명",
    scale: "text",
    required: false,
    kpiIncluded: false,
    orderNo: 2,
  },
  {
    id: "o2",
    group: "일반",
    category: "기관 정보",
    label: "업종·분야",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["콘텐츠", "IT", "제조", "문화예술", "기타"],
    orderNo: 3,
  },
  {
    id: "o3",
    group: "일반",
    category: "기관 정보",
    label: "소재지",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["충남 소재", "충남 외 소재"],
    orderNo: 4,
  },
  {
    id: "o4",
    group: "일반",
    category: "기관 정보",
    label: "종업원 수",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["1~4인", "5~9인", "10~29인", "30인 이상"],
    orderNo: 5,
  },
  {
    id: "o5",
    group: "일반",
    category: "기관 정보",
    label: "설립 연도 또는 업력",
    scale: "text",
    required: false,
    kpiIncluded: false,
    orderNo: 6,
  },
  {
    id: "o6",
    group: "일반",
    category: "기관 정보",
    label: "응답자 직위",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["대표", "임원", "팀장", "실무자", "기타"],
    orderNo: 7,
  },
];

const PERSON_QUESTIONS: Question[] = [
  {
    id: "p1",
    group: "일반",
    category: "개인 정보",
    label: "거주지",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["충남", "충남 외"],
    orderNo: 2,
  },
  {
    id: "p2",
    group: "일반",
    category: "개인 정보",
    label: "성별",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["남", "여", "응답하지 않음"],
    orderNo: 3,
  },
  {
    id: "p3",
    group: "일반",
    category: "개인 정보",
    label: "연령대",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    options: ["10대", "20대", "30대", "40대", "50대 이상"],
    orderNo: 4,
  },
];

const ORG_PROGRAM_CODES = new Set(["prod", "fund", "space", "contest"]);
const PERSON_PROGRAM_CODES = new Set(["edu", "event", "living"]);

export function getGeneralQuestions(programType: ProgramType, respondentType: RespondentType): Question[] {
  const code = getProgramTypeCode(programType);
  const questions: Question[] = [BUSINESS_NAME, PARTICIPATION_PATH];

  const includeOrg = respondentType === "org" || respondentType === "both" || ORG_PROGRAM_CODES.has(code);
  const includePerson = respondentType === "person" || respondentType === "both" || PERSON_PROGRAM_CODES.has(code);

  if (includeOrg) {
    questions.push(...ORG_QUESTIONS);
  }

  if (includePerson) {
    questions.push(...PERSON_QUESTIONS);
  }

  return questions;
}

export function buildSurveyQuestions(
  programType: ProgramType,
  respondentType: RespondentType,
  selectedTypeQuestionIds: string[],
  customQuestions: Question[] = [],
): Question[] {
  const general = getGeneralQuestions(programType, respondentType);
  const commonKpi = getCommonKpiQuestions();
  const typeQuestions = getQuestionsByIds(programType, selectedTypeQuestionIds);
  const customs = customQuestions
    .filter((question) => question.group === "커스텀" || question.id.startsWith("custom_"))
    .map((question, index) => ({
      ...question,
      group: "커스텀" as const,
      orderNo: question.orderNo ?? index + 1,
    }));
  return [...general, ...commonKpi, ...typeQuestions, ...customs];
}
