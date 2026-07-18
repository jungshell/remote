import {
  calculateAverageSatisfaction,
  calculateNps,
  calculateResponseRate,
  isLikertScore,
} from "@/lib/kpi";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question, SurveyAnswer } from "@/types/platform";

export interface DashboardMetrics {
  responseCount: number;
  targetResponses: number;
  responseRate: number;
  satisfaction: number;
  nps: number;
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

export interface YearChartPoint {
  name: string;
  year: number;
  satisfaction: number;
  responseCount: number;
  nps: number;
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

function isNpsQuestionId(questionId: string) {
  return questionId === "common_nps" || questionId.endsWith("_nps");
}

/** 취합용 만족도: 공통 KPI 리커트 우선, 없으면 전체 리커트 */
function satisfactionAnswersForAggregation(answers: SurveyAnswer[]): SurveyAnswer[] {
  const commonLikert = answers.filter(
    (answer) => answer.questionId.startsWith("common_") && isLikertScore(answer.value),
  );

  if (commonLikert.length > 0) {
    return commonLikert;
  }

  return answers.filter(
    (answer) => !isNpsQuestionId(answer.questionId) && isLikertScore(answer.value),
  );
}

export function aggregateMetrics(rows: SurveyResponseRow[], targetResponses = 80): DashboardMetrics {
  const groupedByResponse = rows.map((row) => parseAnswers(row.answers));
  const npsValues = groupedByResponse
    .map((answers) => answers.find((answer) => isNpsQuestionId(answer.questionId))?.value)
    .filter((value): value is number => typeof value === "number");

  const satisfactionValues = groupedByResponse.map((answers) =>
    calculateAverageSatisfaction(satisfactionAnswersForAggregation(answers)),
  );
  const satisfaction =
    satisfactionValues.length > 0
      ? Math.round((satisfactionValues.reduce((sum, value) => sum + value, 0) / satisfactionValues.length) * 100) / 100
      : 0;

  return {
    responseCount: rows.length,
    targetResponses,
    responseRate: calculateResponseRate(rows.length, targetResponses),
    satisfaction,
    nps: calculateNps(npsValues),
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

/** 공통 KPI 문항별 평균 (취합·사업 비교용) */
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
      common_process: "안내·절차",
      common_manager: "담당 응대",
      common_fit: "기대 부합",
      common_growth: "성장 도움",
      common_rejoin: "재참여 의향",
    };
    for (const [id, label] of Object.entries(fallbackLabels)) {
      labelById.set(id, label);
    }
  }

  const buckets = new Map<string, number[]>();

  for (const row of rows) {
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
        nps: metrics.nps,
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

