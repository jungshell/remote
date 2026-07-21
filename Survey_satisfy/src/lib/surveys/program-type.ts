import type { ProgramType, ProgramTypeCode } from "@/types/platform";

export const PROGRAM_TYPE_CODES: Record<ProgramType, ProgramTypeCode> = {
  "교육·인력양성형": "edu",
  "인턴십형(교육생)": "intern_student",
  "인턴십형(참여기업)": "intern_company",
  "제작·사업화/자금·마케팅 지원형": "prod",
  "입주·인프라형": "space",
  "행사·네트워킹형": "event",
  "시설운영형": "facility",
  "수요조사": "demand",
};

export const PROGRAM_TYPE_LABELS: Record<ProgramTypeCode, ProgramType> = Object.fromEntries(
  Object.entries(PROGRAM_TYPE_CODES).map(([label, code]) => [code, label]),
) as Record<ProgramTypeCode, ProgramType>;

export function getProgramTypeCode(type: ProgramType): ProgramTypeCode {
  return PROGRAM_TYPE_CODES[type];
}

export const DEMAND_PROGRAM_TYPE: ProgramType = "수요조사";

/** 수요조사는 만족도·추천 점수 집계에서 제외 (PRD v2) */
export function isDemandProgramType(type: string) {
  return type === DEMAND_PROGRAM_TYPE;
}
