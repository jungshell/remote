import type { AuthUser } from "@/lib/auth/types";

interface SurveyAccessRow {
  owner_user_id?: string | null;
  business?: string | null;
  sub_business?: string | null;
  division?: string | null;
}

export interface BusinessPair {
  business: string;
  subBusiness: string;
}

/** 담당자가 맡은 (사업명, 세부사업) 쌍 목록 (businesses 배열 우선, 없으면 단일 필드) */
export function userBusinessPairs(user: AuthUser): BusinessPair[] {
  const pairs = (user.businesses ?? [])
    .map((item) => ({ business: item.business.trim(), subBusiness: item.subBusiness.trim() }))
    .filter((item) => item.business && item.subBusiness);

  if (pairs.length > 0) {
    return pairs;
  }

  const business = user.business?.trim() ?? "";
  const subBusiness = user.subBusiness?.trim() ?? "";
  return business && subBusiness ? [{ business, subBusiness }] : [];
}

/** DB `.in()` 필터용 사업명 목록 (중복 제거) */
export function userBusinessNames(user: AuthUser): string[] {
  return Array.from(new Set(userBusinessPairs(user).map((pair) => pair.business)));
}

/** 특정 (사업명, 세부사업)이 담당자 스코프에 속하는지 */
export function pairInScope(pairs: BusinessPair[], business?: string | null, subBusiness?: string | null) {
  const b = (business ?? "").trim();
  const s = (subBusiness ?? "").trim();
  return pairs.some((pair) => pair.business === b && pair.subBusiness === s);
}

/** 관리자는 전체, 담당자는 본인 소유 또는 담당 사업(다중) 설문만 */
export function canAccessSurvey(user: AuthUser, survey: SurveyAccessRow) {
  if (user.role === "admin") {
    return true;
  }

  if (survey.owner_user_id && survey.owner_user_id === user.id) {
    return true;
  }

  return pairInScope(userBusinessPairs(user), survey.business, survey.sub_business);
}

export function staffSurveyScopeMissing(user: AuthUser) {
  if (user.role === "admin") {
    return false;
  }
  return userBusinessPairs(user).length === 0;
}
