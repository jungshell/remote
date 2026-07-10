import type { ProgramType, ProgramTypeCode, Question, RespondentType } from "@/types/platform";
import { getProgramTypeCode } from "@/lib/surveys/program-type";

interface PoolEntry {
  cat: string;
  q: string;
  type?: "scale5" | "nps" | "text";
  required?: boolean;
}

function buildPool(code: ProgramTypeCode, programType: ProgramType, entries: PoolEntry[]): Question[] {
  return entries.map((entry, index) => {
    const scale = entry.type === "nps" ? "nps" : entry.type === "text" ? "text" : "likert5";
    const locked = entry.cat === "전반적 만족도" || entry.cat === "NPS";
    const id =
      entry.cat === "NPS"
        ? `${code}_nps`
        : entry.cat === "전반적 만족도"
          ? `${code}_satisfaction`
          : `${code}_${index + 1}`;

    return {
      id,
      group: "유형",
      category: entry.cat,
      type: programType,
      label: entry.q,
      scale,
      required: entry.required ?? scale !== "text",
      kpiIncluded: scale === "likert5",
      locked,
      orderNo: index + 1,
    };
  });
}

const eduEntries: PoolEntry[] = [
  { cat: "강의 시간", q: "프로그램 운영 시간을 잘 지켰다." },
  { cat: "강의 시간", q: "강의 시간이 적절하게 배분되었다." },
  { cat: "강의 준비", q: "강사의 강의자료는 내용을 이해하는 데 도움이 되었다." },
  { cat: "강의 준비", q: "사전 안내(일정·장소·내용 등)가 충분하게 제공되었다." },
  { cat: "강의 내용", q: "강의 내용의 구성이 우수하였다." },
  { cat: "강의 내용", q: "교육 내용이 실무에 적용할 수 있을 만큼 유익하였다." },
  { cat: "강의 기법", q: "강사는 내용을 이해하기 쉽게 설명하였다." },
  { cat: "강의 기법", q: "강사는 수강생이 적극 참여할 수 있도록 관심을 갖고 지도하였다." },
  { cat: "강의 운영", q: "강의 운영방식이 체계적이었다." },
  { cat: "강의 운영", q: "교육 장소 및 시설 환경이 학습에 적합하였다." },
  { cat: "강의 효과", q: "본 프로그램 수강이 자기계발에 도움이 되었다." },
  { cat: "강의 효과", q: "교육 목표 또는 기대했던 학습 성과를 달성하였다." },
  { cat: "서비스 품질", q: "담당자의 안내와 행정 지원이 친절하고 충분하였다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 담당자의 응대가 신속하고 적절하였다." },
  { cat: "전반적 만족도", q: "이 프로그램에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 프로그램을 주변에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "특강 전반에 관한 소감 및 개선 의견을 자유롭게 작성해 주십시오.", type: "text", required: false },
  { cat: "서술형", q: "향후 참여하고 싶은 교육 주제나 건의 사항을 작성해 주세요.", type: "text", required: false },
];

const prodEntries: PoolEntry[] = [
  { cat: "운영 프로세스", q: "사업 신청·선발·진행 절차가 체계적이었다." },
  { cat: "운영 프로세스", q: "사업 관련 정보와 안내가 충분하게 제공되었다." },
  { cat: "제작 지원", q: "제작 지원 내용(장비·공간·멘토링 등)이 우리 팀의 필요에 부합하였다." },
  { cat: "제작 지원", q: "제작 지원 규모(기간·범위)가 적절하였다." },
  { cat: "사업화 지원", q: "사업화 연계(투자·유통·판로 등) 지원이 실질적으로 도움이 되었다." },
  { cat: "사업화 지원", q: "본 사업 참여가 매출 증대 또는 사업 성장에 기여하였다." },
  { cat: "서비스 품질", q: "담당자의 응대가 친절하고 적극적이었다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 처리가 신속하고 적절하였다." },
  { cat: "서비스 품질", q: "담당자가 필요한 정보를 충분히 제공하였다." },
  { cat: "전반적 만족도", q: "이 지원사업에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 사업을 주변 기업에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "가장 만족한 지원 내용 및 향후 필요한 지원 분야를 작성해 주세요.", type: "text", required: false },
];

const fundEntries: PoolEntry[] = [
  { cat: "운영 프로세스", q: "지원사업 신청·심사·지급 절차가 체계적이었다." },
  { cat: "운영 프로세스", q: "지원 관련 정보와 안내가 충분하게 제공되었다." },
  { cat: "자금 지원", q: "지원 금액 규모가 사업 추진에 적절하였다." },
  { cat: "자금 지원", q: "지원금 집행 절차가 편리하고 명확하였다." },
  { cat: "마케팅 지원", q: "마케팅 지원 내용(홍보·전시·판로 등)이 실질적으로 도움이 되었다." },
  { cat: "마케팅 지원", q: "본 사업 참여가 브랜드 인지도 향상 또는 매출 증대에 기여하였다." },
  { cat: "서비스 품질", q: "담당자의 응대가 친절하고 적극적이었다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 처리가 신속하고 적절하였다." },
  { cat: "서비스 품질", q: "담당자가 필요한 정보를 충분히 제공하였다." },
  { cat: "전반적 만족도", q: "이 지원사업에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 사업을 주변 기업에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "지원사업의 가장 만족한 점과 개선이 필요한 점을 작성해 주세요.", type: "text", required: false },
];

const spaceEntries: PoolEntry[] = [
  { cat: "입주 지원", q: "입주 신청 및 선발 절차가 체계적이고 공정하였다." },
  { cat: "입주 지원", q: "입주 관련 안내와 행정 지원이 충분하였다." },
  { cat: "공간·장비", q: "공간(사무실·작업실 등)의 규모와 환경이 업무에 적합하였다." },
  { cat: "공간·장비", q: "장비·시설(음향·영상·IT 인프라 등)의 구비 수준이 만족스러웠다." },
  { cat: "공간·장비", q: "시설 청결 및 안전관리가 잘 이루어졌다." },
  { cat: "입주 프로그램", q: "입주 기업 대상 교육·멘토링·네트워킹 프로그램이 유익하였다." },
  { cat: "입주 프로그램", q: "투자·판로·사업화 연계 지원이 실질적으로 도움이 되었다." },
  { cat: "서비스 품질", q: "담당자의 응대가 친절하고 적극적이었다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 처리가 신속하고 적절하였다." },
  { cat: "입주 효과", q: "입주를 통해 기업 성장 및 사업화에 실질적인 도움을 받았다." },
  { cat: "전반적 만족도", q: "이 입주·인프라 지원에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 시설·인프라를 주변에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "입주 운영 전반에 관한 소감 및 개선 의견을 작성해 주세요.", type: "text", required: false },
];

const eventEntries: PoolEntry[] = [
  { cat: "행사 구성", q: "행사 구성 및 프로그램 내용이 유익하였다." },
  { cat: "행사 구성", q: "행사 진행 시간 및 타임테이블이 적절하였다." },
  { cat: "운영 환경", q: "행사 장소 및 시설 환경이 적합하였다." },
  { cat: "운영 환경", q: "행사에 대한 사전 홍보·안내가 충분하게 이루어졌다." },
  { cat: "네트워킹", q: "행사를 통해 유익한 인적 네트워크를 형성할 수 있었다." },
  { cat: "네트워킹", q: "행사에서 만난 참가자·기업과 협력 가능성을 발견하였다." },
  { cat: "서비스 품질", q: "행사 운영진(스태프)의 응대가 친절하고 적절하였다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 처리가 신속하고 적절하였다." },
  { cat: "서비스 품질", q: "이 행사가 지역 문화예술·산업 발전에 기여한다고 생각한다." },
  { cat: "전반적 만족도", q: "이 행사에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 행사를 주변에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "행사 전반에 관한 소감 및 개선 의견을 자유롭게 작성해 주십시오.", type: "text", required: false },
];

const contestEntries: PoolEntry[] = [
  { cat: "공모 안내", q: "공모전 안내(자격·일정·심사기준 등)가 충분하고 명확하였다." },
  { cat: "공모 안내", q: "접수 절차가 편리하고 불편함이 없었다." },
  { cat: "심사 과정", q: "심사 기준이 명확하고 공정하게 운영되었다." },
  { cat: "심사 과정", q: "심사 결과 통보가 신속하고 충분한 피드백과 함께 제공되었다." },
  { cat: "지원 프로그램", q: "선발 후 제공된 지원(멘토링·교육·네트워킹 등)이 유익하였다." },
  { cat: "지원 프로그램", q: "선발 후 사업화·후속 연계 지원이 실질적으로 도움이 되었다." },
  { cat: "서비스 품질", q: "담당자의 응대가 친절하고 적극적이었다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 처리가 신속하고 적절하였다." },
  { cat: "전반적 만족도", q: "이 공모전·선발 과정에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 공모전을 주변에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "공모전 운영 전반에 관한 소감 및 개선 의견을 작성해 주세요.", type: "text", required: false },
];

const livingEntries: PoolEntry[] = [
  { cat: "사전 안내", q: "사업 목적과 참여 방법에 대한 안내가 충분하고 명확하였다." },
  { cat: "사전 안내", q: "참여 신청 절차가 편리하고 불편함이 없었다." },
  { cat: "현장 운영", q: "현장 서비스(실증·테스트·체험 등)가 체계적으로 운영되었다." },
  { cat: "현장 운영", q: "현장 운영 일정과 진행이 원활하였다." },
  { cat: "참여 경험", q: "내 의견과 아이디어가 사업에 실질적으로 반영되었다." },
  { cat: "참여 경험", q: "현장 참여를 통해 새로운 기술·서비스를 경험할 수 있었다." },
  { cat: "실증 효과", q: "이 사업이 지역 문제 해결 또는 생활 편의 향상에 기여한다고 생각한다." },
  { cat: "실증 효과", q: "사업의 실증 결과물이 실생활에 유용하게 활용될 것으로 기대된다." },
  { cat: "서비스 품질", q: "담당자의 응대가 친절하고 적극적이었다." },
  { cat: "서비스 품질", q: "문의·건의 사항에 대한 처리가 신속하고 적절하였다." },
  { cat: "전반적 만족도", q: "이 사업에 대해 전반적으로 만족한다.", required: true },
  { cat: "NPS", q: "이 사업을 주변에 추천하시겠습니까? (0~10점)", type: "nps", required: true },
  { cat: "서술형", q: "사업 전반에 관한 소감 및 개선 의견을 자유롭게 작성해 주십시오.", type: "text", required: false },
];

export const questionPoolByType: Record<ProgramType, Question[]> = {
  "교육·인력양성형": buildPool("edu", "교육·인력양성형", eduEntries),
  "제작·사업화 지원형": buildPool("prod", "제작·사업화 지원형", prodEntries),
  "자금·마케팅 지원형": buildPool("fund", "자금·마케팅 지원형", fundEntries),
  "입주·인프라형": buildPool("space", "입주·인프라형", spaceEntries),
  "행사·네트워킹형": buildPool("event", "행사·네트워킹형", eventEntries),
  "공모전·선발형": buildPool("contest", "공모전·선발형", contestEntries),
  "스마트시티·리빙랩·현장서비스형": buildPool("living", "스마트시티·리빙랩·현장서비스형", livingEntries),
};

export function getQuestionPool(programType: ProgramType): Question[] {
  return questionPoolByType[programType] ?? [];
}

export function getDefaultSelectedQuestionIds(programType: ProgramType): string[] {
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

const ORG_TYPES: ProgramTypeCode[] = ["prod", "fund", "space", "contest"];
const PERSON_TYPES: ProgramTypeCode[] = ["edu", "event", "living"];

export function resolveRespondentTypeForProgram(programType: ProgramType): RespondentType {
  const code = getProgramTypeCode(programType);
  if (ORG_TYPES.includes(code) && PERSON_TYPES.includes(code)) {
    return "both";
  }
  if (ORG_TYPES.includes(code)) {
    return "org";
  }
  if (PERSON_TYPES.includes(code)) {
    return "person";
  }
  return "both";
}
