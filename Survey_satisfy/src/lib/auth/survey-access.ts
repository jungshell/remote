import type { AuthUser } from "@/lib/auth/types";

interface SurveyAccessRow {
  owner_user_id?: string | null;
  business?: string | null;
  sub_business?: string | null;
  division?: string | null;
}

/** 관리자는 전체, 담당자는 본인 소유 또는 동일 사업 설문만 */
export function canAccessSurvey(user: AuthUser, survey: SurveyAccessRow) {
  if (user.role === "admin") {
    return true;
  }

  if (survey.owner_user_id && survey.owner_user_id === user.id) {
    return true;
  }

  const business = user.business?.trim() ?? "";
  const subBusiness = user.subBusiness?.trim() ?? "";

  if (!business || !subBusiness) {
    return false;
  }

  return survey.business === business && survey.sub_business === subBusiness;
}

export function staffSurveyScopeMissing(user: AuthUser) {
  return user.role !== "admin" && (!user.business?.trim() || !user.subBusiness?.trim());
}
