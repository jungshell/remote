import type { SurveyAnswer } from "@/types/platform";

export function isLikertScore(value: unknown): value is number {
  return typeof value === "number" && value >= 1 && value <= 5;
}

export function isNpsScore(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 10;
}

/** PRD 기준: 5점 척도 문항 평균 (1~5) */
export function calculateAverageSatisfaction(answers: SurveyAnswer[]) {
  const likertScores = answers.map((answer) => answer.value).filter(isLikertScore);

  if (likertScores.length === 0) {
    return 0;
  }

  const sum = likertScores.reduce((total, score) => total + score, 0);
  return Math.round((sum / likertScores.length) * 100) / 100;
}

export function calculateNps(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const promoters = values.filter((value) => value >= 9).length;
  const detractors = values.filter((value) => value <= 6).length;

  return Math.round(((promoters - detractors) / values.length) * 100);
}

export function calculateResponseRate(responseCount: number, targetResponses: number) {
  if (targetResponses <= 0) {
    return 0;
  }

  return Math.round((responseCount / targetResponses) * 1000) / 10;
}

export function calculateKpiAchievement(actual: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.round((actual / target) * 1000) / 10;
}

export function extractNpsValues(rows: SurveyAnswer[][]) {
  return rows
    .map((answers) => answers.find((answer) => isNpsScore(answer.value))?.value)
    .filter((value): value is number => typeof value === "number");
}
