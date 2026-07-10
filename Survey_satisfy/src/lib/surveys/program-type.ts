import type { ProgramType, ProgramTypeCode } from "@/types/platform";

export const PROGRAM_TYPE_CODES: Record<ProgramType, ProgramTypeCode> = {
  "교육·인력양성형": "edu",
  "제작·사업화 지원형": "prod",
  "자금·마케팅 지원형": "fund",
  "입주·인프라형": "space",
  "행사·네트워킹형": "event",
  "공모전·선발형": "contest",
  "스마트시티·리빙랩·현장서비스형": "living",
};

export const PROGRAM_TYPE_LABELS: Record<ProgramTypeCode, ProgramType> = Object.fromEntries(
  Object.entries(PROGRAM_TYPE_CODES).map(([label, code]) => [code, label]),
) as Record<ProgramTypeCode, ProgramType>;

export function getProgramTypeCode(type: ProgramType): ProgramTypeCode {
  return PROGRAM_TYPE_CODES[type];
}
