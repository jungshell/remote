export type PlatformRole = "staff" | "admin";

export type UserStatus = "pending" | "approved" | "rejected";

/** 담당자가 맡은 사업 1건 (사업명·세부사업·유형) */
export interface BusinessAssignment {
  business: string;
  subBusiness: string;
  programType: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  division: string;
  role: PlatformRole;
  status: UserStatus;
  /** 대표 사업(첫 번째) — 하위호환용 단일 필드 */
  business?: string;
  subBusiness?: string;
  programType?: string;
  /** 담당자가 맡은 전체 사업 목록 */
  businesses: BusinessAssignment[];
}

export interface PublicUser extends AuthUser {
  created_at?: string;
  approved_at?: string | null;
}

/** 임의 값(JSON)을 BusinessAssignment 배열로 정규화 */
export function parseBusinessAssignments(raw: unknown): BusinessAssignment[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: BusinessAssignment[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const business = typeof record.business === "string" ? record.business.trim() : "";
    const subBusiness = typeof record.subBusiness === "string" ? record.subBusiness.trim() : "";
    const programType = typeof record.programType === "string" ? record.programType.trim() : "";
    if (business || subBusiness || programType) {
      result.push({ business, subBusiness, programType });
    }
  }
  return result;
}

export function hasStaffSurveyProfile(user: AuthUser) {
  if (user.businesses.length > 0) {
    return user.businesses.some((item) => item.business.trim() && item.subBusiness.trim() && item.programType.trim());
  }
  return Boolean(user.business?.trim() && user.subBusiness?.trim() && user.programType?.trim());
}
