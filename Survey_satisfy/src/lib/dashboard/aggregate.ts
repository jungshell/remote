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
  return questionId.endsWith("_nps");
}

export function aggregateMetrics(rows: SurveyResponseRow[], targetResponses = 80): DashboardMetrics {
  const groupedByResponse = rows.map((row) => parseAnswers(row.answers));
  const npsValues = groupedByResponse
    .map((answers) => answers.find((answer) => isNpsQuestionId(answer.questionId))?.value)
    .filter((value): value is number => typeof value === "number");

  const satisfactionValues = groupedByResponse.map((answers) => calculateAverageSatisfaction(answers));
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
