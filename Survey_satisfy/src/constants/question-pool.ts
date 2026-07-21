import type { ProgramType, ProgramTypeCode, Question, QuestionTier, RespondentType } from "@/types/platform";
import { getProgramTypeCode } from "@/lib/surveys/program-type";

/**
 * 사업유형별 문항 풀 (PRD v2 §5 — 4개 부서 취합 기반).
 * core = 핵심 문항(기본 선택), optional(extended) = 담당자가 체크로 추가.
 */
interface PoolEntry {
  cat: string;
  q: string;
  type?: "scale5" | "text" | "choice";
  options?: string[];
  required?: boolean;
  tier?: QuestionTier;
}

function buildPool(code: ProgramTypeCode, programType: ProgramType, entries: PoolEntry[]): Question[] {
  return entries.map((entry, index) => {
    const scale = entry.type === "text" ? "text" : entry.type === "choice" ? "choice" : "likert5";

    return {
      id: `${code}_${index + 1}`,
      group: "유형",
      category: entry.cat,
      type: programType,
      label: entry.q,
      scale,
      required: entry.required ?? scale !== "text",
      kpiIncluded: false,
      locked: false,
      tier: entry.tier ?? "core",
      options: entry.options,
      orderNo: index + 1,
    };
  });
}

/** ── 교육·인력양성형 ── */
const eduEntries: PoolEntry[] = [
  { cat: "운영", q: "프로그램 운영 시간과 일정이 적절했습니까?", tier: "core" },
  { cat: "강의준비", q: "강의 커리큘럼이 만족스러웠습니까?", tier: "core" },
  { cat: "강의준비", q: "강사의 강의자료와 내용 구성이 우수했습니까?", tier: "core" },
  { cat: "강의기법", q: "강사는 내용을 이해하기 쉽게 설명하고 적극 지도했습니까?", tier: "core" },
  { cat: "강의운영", q: "강의 운영방식이 체계적이었습니까?", tier: "core" },
  { cat: "환경", q: "교육 장소 및 시설 환경은 적절했습니까?", tier: "core" },
  { cat: "효과", q: "본 프로그램이 자기계발 또는 실무에 도움이 되었습니까?", tier: "core" },
  { cat: "서비스", q: "담당자의 안내와 응대가 친절하고 충분했습니까?", tier: "core" },
  { cat: "재참여", q: "교육 이후 동일 분야 교육에 지속 참여 의향이 있습니까?", tier: "core" },
  { cat: "서술", q: "향후 듣고 싶은 교육 주제나 건의 사항을 작성해 주세요.", type: "text", tier: "core" },
  { cat: "효과", q: "교육 수료 후 진로 및 학습 목표 달성에 도움이 되었습니까?", tier: "extended" },
  { cat: "효과", q: "실습 활동이 실무 역량 강화에 도움이 되었습니까?", tier: "extended" },
  { cat: "효과", q: "해당 산업 분야 진출을 위한 유용한 정보와 인사이트를 얻었습니까?", tier: "extended" },
];

/** ── 인턴십형 — 교육생 ── */
const internStudentEntries: PoolEntry[] = [
  { cat: "운영", q: "인턴십 운영 계획(일정·과업·역할)이 전문적으로 수립되었습니까?", tier: "core" },
  { cat: "연계", q: "인턴십 내용이 나의 전공 및 진로와 연계되어 설계되었습니까?", tier: "core" },
  { cat: "지도", q: "전담 지도자의 피드백이 정기적으로 이루어졌습니까?", tier: "core" },
  { cat: "환경", q: "근무환경(시간·공간·안전 등)이 적절하고 만족스러웠습니까?", tier: "core" },
  { cat: "효과", q: "실무 경험을 통해 역량과 업무스킬이 향상되었습니까?", tier: "core" },
  { cat: "소통", q: "기업 담당자의 태도가 우호적이고 소통이 원활했습니까?", tier: "core" },
  { cat: "지원", q: "지원금이 명확하게 안내되고 지급되었습니까?", tier: "core" },
  { cat: "취업", q: "향후 해당 인턴기업에서 취업 제의가 온다면 취업 의향이 있습니까?", tier: "core" },
  { cat: "추천", q: "본 인턴십 프로그램에 만족하며 지인에게 추천할 의향이 있습니까?", tier: "core" },
  { cat: "환경", q: "질문·애로사항을 자유롭게 표현하고 해결할 수 있는 환경이었습니까?", tier: "extended" },
  { cat: "안전", q: "부적절한 언행·차별 발생 시 보고·상담 창구가 있었습니까?", tier: "extended" },
  { cat: "서술", q: "인턴십 기간 중 가장 기억에 남는 경험은 무엇입니까?", type: "text", tier: "extended" },
  { cat: "서술", q: "인턴십을 통해 취업 준비에 가장 도움이 된 부분은 무엇입니까?", type: "text", tier: "extended" },
];

/** ── 인턴십형 — 참여기업 ── */
const internCompanyEntries: PoolEntry[] = [
  { cat: "지원", q: "인턴십 운영을 위한 기관의 사전 안내와 행정 지원이 충분했습니까?", tier: "core" },
  { cat: "역량", q: "인턴 학생의 전공 역량이 기업 업무에 적합했습니까?", tier: "core" },
  { cat: "효과", q: "인턴십을 통해 기업 업무에 실질적인 도움을 받았습니까?", tier: "core" },
  { cat: "서비스", q: "인턴십 운영 관련 문의·건의 사항에 대한 기관의 처리가 신속했습니까?", tier: "core" },
  { cat: "취업", q: "우수 인턴 학생에게 취업을 제의할 의향이 있습니까?", tier: "core" },
  { cat: "추천", q: "향후 본 인턴십 프로그램에 재참여하거나 타 기업에 추천할 의향이 있습니까?", tier: "core" },
  { cat: "서술", q: "인턴십 운영 중 가장 어려웠던 점 또는 개선이 필요한 부분은 무엇입니까?", type: "text", tier: "extended" },
];

/** ── 제작·사업화 / 자금·마케팅 지원형 ──
 * choice 선택지는 PRD에 미정의라 기본값을 임시 지정 — 부서 확정안 나오면 교체
 */
const SUPPORT_FIELD_OPTIONS = ["제작 지원", "사업화 지원", "자금 지원", "마케팅·판로 지원", "멘토링·컨설팅", "기타"];

const prodEntries: PoolEntry[] = [
  { cat: "기초", q: "지원받은 분야는 무엇입니까?", type: "choice", options: SUPPORT_FIELD_OPTIONS, tier: "core" },
  { cat: "기초", q: "지원받은 분야 중 가장 만족한 분야는 무엇입니까?", type: "choice", options: SUPPORT_FIELD_OPTIONS, tier: "core" },
  {
    cat: "기초",
    q: "가장 만족하는 이유는 무엇입니까?",
    type: "choice",
    options: ["지원 내용의 실질적 도움", "충분한 지원 규모", "체계적인 운영·행정", "담당자의 적극적 지원", "기타"],
    tier: "core",
  },
  {
    cat: "기초",
    q: "가장 만족하지 않는 이유는 무엇입니까?",
    type: "choice",
    options: ["지원 내용 부족", "지원 규모 부족", "운영·행정 절차 불편", "안내·소통 부족", "기타"],
    tier: "core",
  },
  { cat: "적합성", q: "지원 내용이 귀사의 필요에 부합했습니까?", tier: "core" },
  { cat: "규모", q: "지원 규모(금액·기간 등)는 적절했습니까?", tier: "core" },
  { cat: "운영", q: "지원사업 운영 프로세스(신청·진행·행정)가 체계적이었습니까?", tier: "core" },
  { cat: "서비스", q: "담당자의 응대가 친절하고 적극적이었습니까?", tier: "core" },
  { cat: "효과", q: "이번 지원이 기업 성장에 실질적으로 기여했습니까?", tier: "core" },
  { cat: "멘토링", q: "멘토링 전문가의 전문성과 매칭에 만족하셨습니까?", tier: "core" },
  { cat: "효과", q: "IR Deck 등 결과물이 투자 유치에 실질적으로 도움이 되었습니까?", tier: "extended" },
  {
    cat: "기초",
    q: "글로벌 진출 지원 시 진출한 해외지역은 어디입니까?",
    type: "choice",
    options: ["동남아시아", "중국·일본", "북미", "유럽", "기타"],
    tier: "extended",
  },
];

/** ── 입주·인프라형 ── */
const spaceEntries: PoolEntry[] = [
  { cat: "공간", q: "입주 공간 및 공용시설 환경이 업무에 적합했습니까?", tier: "core" },
  { cat: "시설", q: "시설 관리(청결·보안·유지보수)가 만족스러웠습니까?", tier: "core" },
  { cat: "행정", q: "입주 관련 안내와 행정지원이 충분했습니까?", tier: "core" },
  { cat: "프로그램", q: "네트워킹 및 연계 프로그램(멘토링·액셀러레이팅 등)이 도움이 되었습니까?", tier: "core" },
  { cat: "소통", q: "운영기관 담당자와의 소통이 원활하고 적극적이었습니까?", tier: "core" },
  { cat: "효과", q: "입주를 통해 기업 운영이 안정적으로 성장했습니까?", tier: "core" },
  { cat: "인프라", q: "장비·테스트베드 등 인프라 구축 수준이 만족스러웠습니까?", tier: "core" },
  { cat: "효과", q: "입주기간 동안 기업 운영·조직 관리 측면에서 긍정적인 변화가 있었습니까?", tier: "extended" },
  { cat: "인프라", q: "스타트업에게 필요한 기본적 창업 인프라가 잘 갖춰져 있습니까?", tier: "extended" },
  { cat: "고용", q: "(대표자) 고용환경 지원이 신규인력 채용에 도움이 되었습니까?", tier: "extended" },
  { cat: "고용", q: "(근로자) 고용환경 지원이 귀하의 근속유지에 도움이 되었습니까?", tier: "extended" },
];

/** ── 행사·네트워킹형 ── */
const eventEntries: PoolEntry[] = [
  { cat: "내용", q: "행사 구성 및 내용이 유익했습니까?", tier: "core" },
  { cat: "운영", q: "행사 진행 시간과 장소·환경은 적절했습니까?", tier: "core" },
  { cat: "안내", q: "행사에 대한 사전 안내가 충분했습니까?", tier: "core" },
  { cat: "서비스", q: "행사 운영진의 응대가 친절하고 적절했습니까?", tier: "core" },
  { cat: "네트워킹", q: "행사를 통해 유익한 네트워킹 기회를 얻었습니까?", tier: "core" },
  { cat: "기여", q: "이 행사가 지역 산업·문화 발전에 기여한다고 생각하십니까?", tier: "core" },
  { cat: "내용", q: "선배기업 특강 및 토크콘서트가 유익했습니까?", tier: "extended" },
  { cat: "네트워킹", q: "네트워킹 시간이 참여기업 간 교류에 충분했습니까?", tier: "extended" },
  { cat: "공연", q: "공연이 문화예술 향유 증진에 기여한다고 생각하십니까?", tier: "extended" },
  { cat: "전시", q: "콘텐츠가 다양하게 전시되었습니까?", tier: "extended" },
  { cat: "전시", q: "가장 인상 깊었던 콘텐츠나 기업명을 작성해 주세요.", type: "text", tier: "extended" },
];

/** ── 시설운영형 ── */
const facilityEntries: PoolEntry[] = [
  { cat: "접수", q: "예약·접수 절차가 편리하고 원활했습니까?", tier: "core" },
  { cat: "정책", q: "대관 이용정책(운영규정·무료 여부 등)이 합리적이었습니까?", tier: "core" },
  { cat: "환경", q: "시설 상태(청결·온도·배치 등)가 만족스러웠습니까?", tier: "core" },
  { cat: "장비", q: "장비·음향·조명 등 사용 환경이 만족스러웠습니까?", tier: "core" },
  { cat: "안전", q: "안전관리가 잘 이루어졌습니까?", tier: "core" },
  { cat: "서비스", q: "담당자의 응대와 문제 해결이 적절했습니까?", tier: "core" },
  { cat: "효과", q: "시설 이용이 본인의 사용 목적 달성에 도움이 되었습니까?", tier: "core" },
  { cat: "효과", q: "시설 사용을 통한 결과물을 활용할 예정입니까?", tier: "extended" },
  { cat: "접근", q: "시설 접근성(위치·교통·주차 등)이 편리했습니까?", tier: "extended" },
];

/** ── 수요조사 (만족도 점수 미반영) ──
 * choice 선택지는 PRD에 미정의라 기본값을 임시 지정 — 부서 확정안 나오면 교체
 */
const demandEntries: PoolEntry[] = [
  {
    cat: "수요",
    q: "희망하는 사업·프로그램 분야는 무엇입니까?",
    type: "choice",
    options: ["교육·인력양성", "제작·사업화 지원", "자금·마케팅 지원", "입주·인프라", "행사·네트워킹", "기타"],
    tier: "core",
  },
  {
    cat: "수요",
    q: "선호하는 지원 방식은 무엇입니까?",
    type: "choice",
    options: ["직접 자금 지원", "교육·멘토링", "공간·장비 지원", "판로·마케팅 지원", "네트워킹", "기타"],
    tier: "core",
  },
  {
    cat: "수요",
    q: "적정하다고 생각하는 지원 규모는 어느 정도입니까?",
    type: "choice",
    options: ["1천만원 미만", "1천만~3천만원", "3천만~5천만원", "5천만~1억원", "1억원 이상"],
    tier: "core",
  },
  { cat: "서술", q: "기타 의견이나 건의 사항을 자유롭게 작성해 주세요.", type: "text", tier: "core" },
];

export const questionPoolByType: Record<ProgramType, Question[]> = {
  "교육·인력양성형": buildPool("edu", "교육·인력양성형", eduEntries),
  "인턴십형(교육생)": buildPool("intern_student", "인턴십형(교육생)", internStudentEntries),
  "인턴십형(참여기업)": buildPool("intern_company", "인턴십형(참여기업)", internCompanyEntries),
  "제작·사업화/자금·마케팅 지원형": buildPool("prod", "제작·사업화/자금·마케팅 지원형", prodEntries),
  "입주·인프라형": buildPool("space", "입주·인프라형", spaceEntries),
  "행사·네트워킹형": buildPool("event", "행사·네트워킹형", eventEntries),
  "시설운영형": buildPool("facility", "시설운영형", facilityEntries),
  "수요조사": buildPool("demand", "수요조사", demandEntries),
};

export function getQuestionPool(programType: ProgramType): Question[] {
  return questionPoolByType[programType] ?? [];
}

/** 유형 풀에서 핵심 문항(core)만 — 공통 고정 문항은 별도 자동 포함 */
export function getDefaultSelectedQuestionIds(programType: ProgramType): string[] {
  return getQuestionPool(programType)
    .filter((question) => question.tier === "core")
    .map((question) => question.id);
}

export function getAllTypeQuestionIds(programType: ProgramType): string[] {
  return getQuestionPool(programType).map((question) => question.id);
}

export function getQuestionsByIds(programType: ProgramType, ids: string[]): Question[] {
  const pool = getQuestionPool(programType);
  const idSet = new Set(ids);
  return pool.filter((question) => idSet.has(question.id));
}

export function groupQuestionsByCategory(questions: Question[]) {
  const groups = new Map<string, Question[]>();

  for (const question of questions) {
    const key = question.category ?? question.group;
    const current = groups.get(key) ?? [];
    current.push(question);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}

const ORG_TYPES: ProgramTypeCode[] = ["intern_company", "prod", "space"];
const PERSON_TYPES: ProgramTypeCode[] = ["edu", "intern_student", "event", "facility"];

export function resolveRespondentTypeForProgram(programType: ProgramType): RespondentType {
  const code = getProgramTypeCode(programType);
  if (ORG_TYPES.includes(code)) {
    return "org";
  }
  if (PERSON_TYPES.includes(code)) {
    return "person";
  }
  return "both";
}
