import type { Question } from "@/types/platform";

/**
 * 전 사업 공통 KPI 문항.
 * ID를 고정해 본부·유형·연도 취합 시 동일 지표로 비교할 수 있게 합니다.
 */
export const COMMON_KPI_QUESTIONS: Question[] = [
  {
    id: "common_satisfaction",
    group: "공통",
    category: "공통 KPI",
    label: "본 사업에 전반적으로 만족하십니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 1,
  },
  {
    id: "common_process",
    group: "공통",
    category: "공통 KPI",
    label: "사업 안내와 신청 절차는 편리했습니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 2,
  },
  {
    id: "common_manager",
    group: "공통",
    category: "공통 KPI",
    label: "담당자의 안내와 응대에 만족하십니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 3,
  },
  {
    id: "common_fit",
    group: "공통",
    category: "공통 KPI",
    label: "지원 내용이 신청 목적과 기대에 부합했습니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 4,
  },
  {
    id: "common_growth",
    group: "공통",
    category: "공통 KPI",
    label: "본 사업이 본인 또는 기업의 성장에 도움이 되었습니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 5,
  },
  {
    id: "common_rejoin",
    group: "공통",
    category: "공통 KPI",
    label: "향후 진흥원 사업에 다시 참여할 의향이 있습니까?",
    scale: "likert5",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 6,
  },
  {
    id: "common_nps",
    group: "공통",
    category: "공통 KPI",
    label: "본 사업을 동료 또는 타 기업·참여자에게 추천하시겠습니까? (0~10점)",
    scale: "nps",
    required: true,
    kpiIncluded: true,
    locked: true,
    tier: "core",
    orderNo: 7,
  },
  {
    id: "common_opinion",
    group: "공통",
    category: "공통 KPI",
    label: "개선이 필요한 점이나 추가 의견을 자유롭게 적어 주십시오.",
    scale: "text",
    required: false,
    kpiIncluded: false,
    locked: true,
    tier: "core",
    orderNo: 8,
  },
];

export const COMMON_KPI_QUESTION_IDS = COMMON_KPI_QUESTIONS.map((question) => question.id);

export function getCommonKpiQuestions(): Question[] {
  return COMMON_KPI_QUESTIONS;
}
