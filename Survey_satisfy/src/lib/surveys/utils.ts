import type { Division, ProgramType, Project, Question, RespondentType, SurveyRecord, SurveyStatus } from "@/types/platform";
import type { SurveyRow } from "@/lib/supabase/database.types";

export function parseQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((item): item is Question => {
    return (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "label" in item &&
      "scale" in item &&
      typeof (item as Question).id === "string"
    );
  });
}

export function generateSurveyId(subBusiness: string, round: number) {
  const slug = subBusiness
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `survey-${slug || "round"}-${round}-${suffix}`;
}

export function surveyRowToRecord(row: SurveyRow): SurveyRecord {
  return {
    id: row.id,
    title: row.title,
    year: row.year ?? new Date().getFullYear(),
    division: row.division as Division,
    business: row.business,
    subBusiness: row.sub_business,
    round: row.round ?? 1,
    programType: row.program_type as ProgramType,
    respondentType: (row.respondent_type as RespondentType) ?? "both",
    targetResponses: row.target_responses,
    status: row.status as SurveyStatus,
    endsAt: row.ends_at,
    questions: parseQuestions(row.custom_questions),
  };
}

export function surveyRecordToProject(record: SurveyRecord): Project {
  return {
    id: record.id,
    year: record.year,
    division: record.division,
    business: record.business,
    subBusiness: record.subBusiness,
    round: record.round,
    type: record.programType,
    manager: "사업담당자",
    targetResponses: record.targetResponses,
  };
}

export function normalizeSurveyStatus(status: string): SurveyStatus {
  if (status === "진행중" || status === "active") {
    return "진행중";
  }
  if (status === "종료" || status === "closed") {
    return "종료";
  }
  return "작성중";
}
