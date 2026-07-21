import * as XLSX from "xlsx";
import { aggregateMetrics } from "@/lib/dashboard/aggregate";
import type { SurveyResponseRow, SurveyRow } from "@/lib/supabase/database.types";

export interface ManagementExportRow {
  title: string;
  year: number;
  round: number;
  business: string;
  subBusiness: string;
  programType: string;
  division: string;
  responseCount: number;
  satisfaction: number;
  recommendation: number;
  targetResponses: number;
  responseRate: number;
  commonSatisfaction: number | null;
  commonRecommend: number | null;
}

const COMMON_KPI_KEYS = ["common_satisfaction", "common_recommend"] as const;

type CommonKpiKey = (typeof COMMON_KPI_KEYS)[number];

function averageByQuestionId(responses: SurveyResponseRow[], questionId: string): number | null {
  const scores: number[] = [];

  for (const row of responses) {
    if (!Array.isArray(row.answers)) {
      continue;
    }

    for (const answer of row.answers) {
      if (
        typeof answer === "object" &&
        answer !== null &&
        "questionId" in answer &&
        "value" in answer &&
        (answer as { questionId: string }).questionId === questionId &&
        typeof (answer as { value: unknown }).value === "number"
      ) {
        const value = (answer as { value: number }).value;
        if (value >= 1 && value <= 5) {
          scores.push(value);
        }
      }
    }
  }

  if (scores.length === 0) {
    return null;
  }

  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
}

export function buildManagementExportRows(surveys: SurveyRow[], responses: SurveyResponseRow[]): ManagementExportRow[] {
  return surveys.map((survey) => {
    const rows = responses.filter((row) => row.survey_id === survey.id);
    const metrics = aggregateMetrics(rows, survey.target_responses);
    const kpiScores = Object.fromEntries(
      COMMON_KPI_KEYS.map((key) => [key, averageByQuestionId(rows, key)]),
    ) as Record<CommonKpiKey, number | null>;

    return {
      title: survey.title,
      year: survey.year ?? new Date().getFullYear(),
      round: survey.round ?? 1,
      business: survey.business,
      subBusiness: survey.sub_business,
      programType: survey.program_type,
      division: survey.division,
      responseCount: metrics.responseCount,
      satisfaction: metrics.satisfaction,
      recommendation: metrics.recommendation,
      targetResponses: survey.target_responses,
      responseRate: metrics.responseRate,
      commonSatisfaction: kpiScores.common_satisfaction,
      commonRecommend: kpiScores.common_recommend,
    };
  });
}

export function buildDivisionSummaryRows(rows: ManagementExportRow[]) {
  const buckets = new Map<string, ManagementExportRow[]>();

  for (const row of rows) {
    const current = buckets.get(row.division) ?? [];
    current.push(row);
    buckets.set(row.division, current);
  }

  return Array.from(buckets.entries()).map(([division, group]) => {
    const responseCount = group.reduce((sum, item) => sum + item.responseCount, 0);
    const targetResponses = group.reduce((sum, item) => sum + item.targetResponses, 0);
    const weightedSatisfaction =
      responseCount > 0
        ? Math.round(
            (group.reduce((sum, item) => sum + item.satisfaction * item.responseCount, 0) / responseCount) * 100,
          ) / 100
        : 0;
    const weightedRecommendation =
      responseCount > 0
        ? Math.round(
            (group.reduce((sum, item) => sum + item.recommendation * item.responseCount, 0) / responseCount) * 100,
          ) / 100
        : 0;

    return {
      본부: division,
      사업수: group.length,
      응답인원: responseCount,
      목표응답수: targetResponses,
      "만족도평균(5점)": weightedSatisfaction,
      "추천평균(5점)": weightedRecommendation,
      "응답률(%)": targetResponses > 0 ? Math.round((responseCount / targetResponses) * 1000) / 10 : 0,
    };
  });
}

/** 수식 인젝션 방지: Excel이 수식으로 해석하는 문자로 시작하는 텍스트는 ' 프리픽스로 강제 텍스트화 */
function sanitizeCell(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function downloadManagementExcel(rows: ManagementExportRow[], filename: string) {
  const detailRows = rows.map((row) => ({
    연도: row.year,
    회차: row.round,
    본부: sanitizeCell(row.division),
    사업: sanitizeCell(row.business),
    세부사업: sanitizeCell(row.subBusiness),
    사업명: sanitizeCell(row.title),
    사업유형: sanitizeCell(row.programType),
    응답인원: row.responseCount,
    목표응답수: row.targetResponses,
    "응답률(%)": row.responseRate,
    "만족도평균(5점)": row.satisfaction,
    "추천평균(5점)": row.recommendation,
    "공통_전반만족": row.commonSatisfaction ?? "",
    "공통_추천의향": row.commonRecommend ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), "사업별취합");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(buildDivisionSummaryRows(rows)),
    "본부요약",
  );
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
