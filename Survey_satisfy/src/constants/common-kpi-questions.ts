import type { Question, RespondentType } from "@/types/platform";

/**
 * 공통 고정 문항 (PRD v2 §4) — 모든 설문의 마지막에 자동 배치.
 * ID를 고정해 본부·유형·연도 취합 시 동일 지표로 비교할 수 있게 합니다.
 * 연령대·성별은 개인 응답자(person/both)에게만 노출됩니다.
 */
export const COMMON_KPI_QUESTIONS: Question[] = [
  {
    id: "common_repeat",
    group: "공통",
    category: "공통 고정",
    label: "이 사업에 참여한 것은 몇 번째입니까?",
    scale: "choice",
    required: true,
    kpiIncluded: false,
    locked: true,
    tier: "core",
    options: ["첫 참여", "2회", "3회 이상"],
    orderNo: 1,
  },
  {
    id: "common_path",
    group: "공통",
    category: "공통 고정",
    label: "참여 경로는 무엇입니까?",
    scale: "choice",
    required: true,
    kpiIncluded: false,
    locked: true,
    tier: "core",
    options: ["홈페이지", "SNS·인스타그램", "문자", "포스터", "온라인커뮤니티", "기타"],
    orderNo: 2,
  },
  {
    id: "common_age",
    group: "공통",
    category: "공통 고정",
    label: "연령대는 어떻게 되십니까?",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    locked: true,
    tier: "core",
    options: ["10대", "20대", "30대", "40대", "50대 이상"],
    orderNo: 3,
  },
  {
    id: "common_gender",
    group: "공통",
    category: "공통 고정",
    label: "성별은 어떻게 되십니까?",
    scale: "choice",
    required: false,
    kpiIncluded: false,
    locked: true,
    tier: "core",
    options: ["남", "여", "응답하지 않음"],
    orderNo: 4,
  },
  {
    id: "common_satisfaction",
    group: "공통",
    category: "공통 고정",
    label: "전반적인 만족도는 어떠십니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 5,
  },
  {
    id: "common_recommend",
    group: "공통",
    category: "공통 고정",
    label: "이 사업을 주변에 추천하시겠습니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 6,
  },
  {
    id: "common_opinion",
    group: "공통",
    category: "공통 고정",
    label: "개선 의견이나 건의 사항을 자유롭게 작성해 주세요.",
    scale: "text",
    required: false,
    kpiIncluded: false,
    locked: true,
    tier: "core",
    orderNo: 7,
  },
];

/** 개인 응답자에게만 묻는 문항 (PRD target: person) */
const PERSON_ONLY_IDS = new Set(["common_age", "common_gender"]);

export const COMMON_KPI_QUESTION_IDS = COMMON_KPI_QUESTIONS.map((question) => question.id);

export function getCommonKpiQuestions(respondentType: RespondentType = "both"): Question[] {
  if (respondentType === "org") {
    return COMMON_KPI_QUESTIONS.filter((question) => !PERSON_ONLY_IDS.has(question.id));
  }

  return COMMON_KPI_QUESTIONS;
}
