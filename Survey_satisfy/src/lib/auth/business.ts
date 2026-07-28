import { programTypes } from "@/constants/divisions";
import { parseBusinessAssignments, type BusinessAssignment } from "@/lib/auth/types";

const MAX_BUSINESSES = 20;

/**
 * 요청 body의 businesses(배열) 또는 단일 필드를 검증된 BusinessAssignment[]로 정규화.
 * 배열이 비어 있으면 단일 필드(business/subBusiness/programType)에서 1건 구성(하위호환).
 */
export function normalizeBusinessesInput(input: {
  businesses?: unknown;
  business?: string;
  subBusiness?: string;
  programType?: string;
}): { businesses: BusinessAssignment[]; error: string | null } {
  let list = parseBusinessAssignments(input.businesses);

  if (list.length === 0) {
    const business = (input.business ?? "").trim();
    const subBusiness = (input.subBusiness ?? "").trim();
    const programType = (input.programType ?? "").trim();
    if (business || subBusiness || programType) {
      list = [{ business, subBusiness, programType }];
    }
  }

  if (list.length === 0) {
    return { businesses: [], error: "담당 사업을 1개 이상 입력해 주세요." };
  }

  if (list.length > MAX_BUSINESSES) {
    return { businesses: [], error: `담당 사업은 최대 ${MAX_BUSINESSES}개까지 등록할 수 있습니다.` };
  }

  for (const item of list) {
    if (!item.business || !item.subBusiness || !item.programType) {
      return { businesses: [], error: "각 사업의 사업명·세부사업·사업유형을 모두 입력해 주세요." };
    }
    if (!programTypes.includes(item.programType as (typeof programTypes)[number])) {
      return { businesses: [], error: `올바르지 않은 사업유형입니다: ${item.programType}` };
    }
  }

  return { businesses: list, error: null };
}
