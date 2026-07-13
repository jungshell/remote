# 문항 마스터 구조

담당자가 쉽게 만들고, 본부·연도 단위로 취합할 수 있도록 문항을 계층으로 구분합니다.

## 계층

| 계층 | 설명 | 선택 |
|------|------|------|
| 일반사항 | 참여 경로, 기관/개인 속성 | 응답자 유형에 따라 자동 |
| **공통 KPI** | 전 사업 동일 ID (`common_*`) | **고정(필수)** |
| 유형 기본세트 (core) | 사업유형별 핵심 문항 | 생성 시 기본 선택 |
| 유형 확장 (extended) | 세부·서술·중복 성향 문항 | 필요 시만 추가 |
| 교육 지침 | 교육형의 강의 시간~효과 문항 | 교육형 기본세트에 포함 |

## 공통 KPI (취합 기준)

- `common_satisfaction` 전반 만족
- `common_process` 안내·절차
- `common_manager` 담당 응대
- `common_fit` 기대 부합
- `common_growth` 성장 도움
- `common_rejoin` 재참여 의향
- `common_nps` 추천(NPS)
- `common_opinion` 개선 의견(서술)

대시보드·경영평가 Excel의 만족도/NPS는 이 ID를 우선 사용합니다.

## 부서·사업별 “현재 설문” 반영 상태

| 출처 | 반영 여부 |
|------|-----------|
| PRD 7개 사업유형 문항 풀 | ✅ 유형 풀로 반영 (기본/확장 재분류) |
| 초기 플랫폼 공통 8문항 + 교육 지침 | ✅ 공통 KPI·교육 지침으로 재통합 |
| 각 부서·사업의 **실제 진행 중 설문지 분석 결과물** | ❌ 저장소·문서에 산출물 없음 — **미반영** |

부서별 실제 문항을 주시면(시트·PDF·목록), 유형 풀에 매핑해 기본/확장에 반영할 수 있습니다.

## 파일

- `src/constants/common-kpi-questions.ts`
- `src/constants/question-pool.ts`
- `src/constants/general-questions.ts`
- 설문 생성 UI: `src/components/manager/SurveyCreator.tsx`
