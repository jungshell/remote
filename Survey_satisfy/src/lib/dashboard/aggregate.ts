import { calculateAverageSatisfaction, calculateResponseRate, isLikertScore } from "@/lib/kpi";
import { isDemandProgramType } from "@/lib/surveys/program-type";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question, SurveyAnswer } from "@/types/platform";

export interface DashboardMetrics {
  responseCount: number;
  targetResponses: number;
  responseRate: number;
  satisfaction: number;
  /** 공통 고정 문항 "추천 의향" 평균 (5점) */
  recommendation: number;
}

export interface DivisionChartPoint {
  name: string;
  satisfaction: number;
  responseCount: number;
}

export interface ProgramTypeChartPoint {
  name: string;
  satisfaction: number;
  responseCount: number;
}

export interface CategoryChartPoint {
  name: string;
  satisfaction: number;
  responseCount: number;
}

const RECOMMEND_QUESTION_ID = "common_recommend";

export interface YearChartPoint {
  name: string;
  year: number;
  satisfaction: number;
  responseCount: number;
  recommendation: number;
  responseRate: number;
}

function parseAnswers(raw: unknown): SurveyAnswer[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (item): item is SurveyAnswer =>
      typeof item === "object" &&
      item !== null &&
      "questionId" in item &&
      "value" in item &&
      typeof (item as SurveyAnswer).questionId === "string",
  );
}

export function aggregateMetrics(rows: SurveyResponseRow[], targetResponses = 80): DashboardMetrics {
  // 수요조사 응답은 만족도·추천 점수 집계에서 제외 (PRD v2 §11)
  const scoredRows = rows.filter((row) => !isDemandProgramType(row.program_type));
  const groupedByResponse = scoredRows.map((row) => parseAnswers(row.answers));

  const recommendValues = groupedByResponse
    .map((answers) => answers.find((answer) => answer.questionId === RECOMMEND_QUESTION_ID)?.value)
    .filter(isLikertScore);
  const recommendation =
    recommendValues.length > 0
      ? Math.round((recommendValues.reduce((sum, value) => sum + value, 0) / recommendValues.length) * 100) / 100
      : 0;

  // 만족도: 응답별 전체 리커트(5점) 평균 — 리커트 응답이 없는 행(주관식만 답변 등)은 모수에서 제외
  const satisfactionValues = groupedByResponse
    .map((answers) => answers.filter((answer) => isLikertScore(answer.value)))
    .filter((answers) => answers.length > 0)
    .map((answers) => calculateAverageSatisfaction(answers));
  const satisfaction =
    satisfactionValues.length > 0
      ? Math.round((satisfactionValues.reduce((sum, value) => sum + value, 0) / satisfactionValues.length) * 100) / 100
      : 0;

  return {
    responseCount: rows.length,
    targetResponses,
    responseRate: calculateResponseRate(rows.length, targetResponses),
    satisfaction,
    recommendation,
  };
}

export function aggregateByDivision(rows: SurveyResponseRow[]): DivisionChartPoint[] {
  const buckets = new Map<string, SurveyResponseRow[]>();

  for (const row of rows) {
    const current = buckets.get(row.division) ?? [];
    current.push(row);
    buckets.set(row.division, current);
  }

  return Array.from(buckets.entries()).map(([name, group]) => ({
    name,
    satisfaction: aggregateMetrics(group).satisfaction,
    responseCount: group.length,
  }));
}

export function aggregateByProgramType(rows: SurveyResponseRow[]): ProgramTypeChartPoint[] {
  const buckets = new Map<string, SurveyResponseRow[]>();

  for (const row of rows) {
    const current = buckets.get(row.program_type) ?? [];
    current.push(row);
    buckets.set(row.program_type, current);
  }

  return Array.from(buckets.entries()).map(([name, group]) => ({
    name,
    satisfaction: aggregateMetrics(group).satisfaction,
    responseCount: group.length,
  }));
}

export function aggregateByCategory(rows: SurveyResponseRow[], questions: Question[]): CategoryChartPoint[] {
  const categoryById = new Map(questions.map((question) => [question.id, question.category ?? question.group]));
  const buckets = new Map<string, number[]>();

  for (const row of rows) {
    if (isDemandProgramType(row.program_type)) {
      continue;
    }

    for (const answer of parseAnswers(row.answers)) {
      if (!isLikertScore(answer.value)) {
        continue;
      }

      const category = categoryById.get(answer.questionId) ?? "기타";
      const current = buckets.get(category) ?? [];
      current.push(answer.value);
      buckets.set(category, current);
    }
  }

  return Array.from(buckets.entries()).map(([name, scores]) => ({
    name,
    satisfaction: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
    responseCount: scores.length,
  }));
}

/** 공통 고정 문항별 평균 (취합·사업 비교용) */
export function aggregateByCommonKpi(
  rows: SurveyResponseRow[],
  questions: Question[],
): CategoryChartPoint[] {
  const labelById = new Map(
    questions
      .filter((question) => question.id.startsWith("common_") && question.scale === "likert5")
      .map((question) => [question.id, question.label]),
  );

  if (labelById.size === 0) {
    const fallbackLabels: Record<string, string> = {
      common_satisfaction: "전반 만족",
      common_recommend: "추천 의향",
    };
    for (const [id, label] of Object.entries(fallbackLabels)) {
      labelById.set(id, label);
    }
  }

  const buckets = new Map<string, number[]>();

  for (const row of rows) {
    if (isDemandProgramType(row.program_type)) {
      continue;
    }

    for (const answer of parseAnswers(row.answers)) {
      if (!labelById.has(answer.questionId) || !isLikertScore(answer.value)) {
        continue;
      }

      const current = buckets.get(answer.questionId) ?? [];
      current.push(answer.value);
      buckets.set(answer.questionId, current);
    }
  }

  return Array.from(buckets.entries()).map(([id, scores]) => ({
    name: shortenLabel(labelById.get(id) ?? id),
    satisfaction: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100,
    responseCount: scores.length,
  }));
}

function shortenLabel(label: string) {
  return label.replace(/\?$/, "").replace(/하십니까$/, "").replace(/있습니까$/, "").slice(0, 18);
}

/** 연도별 만족도·응답 비교 (관리자 YoY) */
export function aggregateByYear(
  rows: SurveyResponseRow[],
  yearBySurveyId: Map<string, number>,
  targetByYear: Map<number, number>,
): YearChartPoint[] {
  const buckets = new Map<number, SurveyResponseRow[]>();

  for (const row of rows) {
    const year = yearBySurveyId.get(row.survey_id);
    if (!year) continue;
    const current = buckets.get(year) ?? [];
    current.push(row);
    buckets.set(year, current);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, group]) => {
      const target = targetByYear.get(year) ?? 80;
      const metrics = aggregateMetrics(group, target);
      return {
        name: `${year}`,
        year,
        satisfaction: metrics.satisfaction,
        responseCount: metrics.responseCount,
        recommendation: metrics.recommendation,
        responseRate: metrics.responseRate,
      };
    });
}

/** 주관식(text) 응답만 추출 */
export function extractTextOpinions(rows: SurveyResponseRow[], questions?: Question[]): string[] {
  const textIds = new Set(
    (questions ?? [])
      .filter((question) => question.scale === "text")
      .map((question) => question.id),
  );

  const opinions: string[] = [];

  for (const row of rows) {
    for (const answer of parseAnswers(row.answers)) {
      if (typeof answer.value !== "string") continue;
      const text = answer.value.trim();
      if (!text) continue;
      if (textIds.size > 0 && !textIds.has(answer.questionId) && !answer.questionId.includes("opinion")) {
        continue;
      }
      opinions.push(text);
    }
  }

  return opinions;
}
