# 문항 마스터 구조 (PRD v2 기준)

담당자가 쉽게 만들고, 본부·연도 단위로 취합할 수 있도록 문항을 계층으로 구분합니다.
문항풀은 4개 부서(벤처창업본부·AI콘텐츠본부·사업총괄실·미래산업본부) 취합 파일 기반입니다.

## 계층

| 계층 | 설명 | 선택 |
|------|------|------|
| 유형 핵심 (core) | 사업유형별 핵심 문항 | 생성 시 기본 선택 |
| 유형 선택 (extended) | 세부·서술 등 선택 문항 | 필요 시 체크로 추가 |
| **공통 고정** | 전 사업 동일 ID (`common_*`) — 설문 **마지막**에 자동 배치 | **고정(자동)** |

## 공통 고정 문항 (취합 기준)

- `common_repeat` 참여 횟수 (choice, 필수)
- `common_path` 참여 경로 (choice, 필수)
- `common_age` 연령대 (choice, 선택 · 개인 응답자만)
- `common_gender` 성별 (choice, 선택 · 개인 응답자만)
- `common_satisfaction` 전반 만족 (5점, 필수, KPI)
- `common_recommend` 추천 의향 (5점, 필수, KPI)
- `common_opinion` 개선 의견 (서술, 선택)

대시보드·경영평가 Excel의 만족도는 응답별 전체 리커트(5점) 평균, 추천은 `common_recommend` 평균을 사용합니다.

## 사업유형 (8개)

| 코드 | 유형명 | 주요 대상 | 핵심/선택 문항 수 |
|------|--------|-----------|-------------------|
| `edu` | 교육·인력양성형 | 교육생, 수강자 | 10 / 3 |
| `intern_student` | 인턴십형(교육생) | 인턴 참여 학생 | 9 / 4 |
| `intern_company` | 인턴십형(참여기업) | 인턴 수용 기업 담당자 | 6 / 1 |
| `prod` | 제작·사업화/자금·마케팅 지원형 | 참여 기업 | 10 / 2 |
| `space` | 입주·인프라형 | 입주 기업, 이용자 | 7 / 4 |
| `event` | 행사·네트워킹형 | 참가자, 일반도민 | 6 / 5 |
| `facility` | 시설운영형 | 시설 이용자 | 7 / 2 |
| `demand` | 수요조사 | 기업, 개인 | 4 / 0 |

## 수요조사(`demand`) 특례

- 응답은 저장되지만 **만족도·추천 점수 집계에서 제외**됩니다 (대시보드·Excel 취합 공통).

## 선택지 임시 지정 문항

PRD에 선택지가 정의되지 않아 임시 기본값을 넣은 choice 문항 — 부서 확정안이 나오면
`src/constants/question-pool.ts`에서 교체하세요.

- `prod`: 지원받은 분야 / 가장 만족한 분야 / 만족·불만족 이유 / 글로벌 진출 지역
- `demand`: 희망 분야 / 선호 지원 방식 / 적정 지원 규모

## 파일

- 공통 고정: `src/constants/common-kpi-questions.ts`
- 유형별 풀: `src/constants/question-pool.ts`
- 조합 로직(유형 문항 → 공통 고정 순서): `src/constants/general-questions.ts`
- 설문 생성 UI: `src/components/manager/SurveyCreator.tsx`
