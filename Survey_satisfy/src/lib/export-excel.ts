import * as XLSX from "xlsx";
import { aggregateMetrics } from "@/lib/dashboard/aggregate";
import type { SurveyResponseRow, SurveyRow } from "@/lib/supabase/database.types";

export interface ManagementExportRow {
  title: string;
  programType: string;
  division: string;
  responseCount: number;
  satisfaction: number;
  nps: number;
  targetResponses: number;
  responseRate: number;
}

export function buildManagementExportRows(surveys: SurveyRow[], responses: SurveyResponseRow[]): ManagementExportRow[] {
  return surveys.map((survey) => {
    const rows = responses.filter((row) => row.survey_id === survey.id);
    const metrics = aggregateMetrics(rows, survey.target_responses);

    return {
      title: survey.title,
      programType: survey.program_type,
      division: survey.division,
      responseCount: metrics.responseCount,
      satisfaction: metrics.satisfaction,
      nps: metrics.nps,
      targetResponses: survey.target_responses,
      responseRate: metrics.responseRate,
    };
  });
}

export function downloadManagementExcel(rows: ManagementExportRow[], filename: string) {
  const sheetRows = rows.map((row) => ({
    사업명: row.title,
    사업유형: row.programType,
    본부: row.division,
    응답인원: row.responseCount,
    "만족도평균(5점)": row.satisfaction,
    NPS: row.nps,
    목표응답수: row.targetResponses,
    "응답률(%)": row.responseRate,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "경영평가");
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
