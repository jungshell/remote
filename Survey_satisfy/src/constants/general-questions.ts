import { getCommonKpiQuestions } from "@/constants/common-kpi-questions";
import { getQuestionsByIds } from "@/constants/question-pool";
import type { ProgramType, Question, RespondentType } from "@/types/platform";

/**
 * 설문 문항 구성 (PRD v2 §6):
 * 1) 유형별 핵심·선택 문항 → 2) 공통 고정 문항(참여횟수·경로·연령·성별·전반만족·추천·서술)을 마지막에 배치.
 * 연령·성별은 개인 응답자(person/both)에게만 포함됩니다.
 */
export function buildSurveyQuestions(
  programType: ProgramType,
  respondentType: RespondentType,
  selectedTypeQuestionIds: string[],
): Question[] {
  const typeQuestions = getQuestionsByIds(programType, selectedTypeQuestionIds);
  const common = getCommonKpiQuestions(respondentType);
  return [...typeQuestions, ...common];
}
