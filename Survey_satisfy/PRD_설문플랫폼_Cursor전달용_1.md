# 충남콘텐츠진흥원 통합 설문 플랫폼 — PRD (Product Requirements Document)

> 이 문서는 Cursor AI에게 전달하는 개발 기획서입니다.
> Claude와 사전 설계를 완료한 내용을 그대로 구현합니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 충남콘텐츠진흥원 통합 설문 플랫폼 |
| 목적 | 기관 내 사업별 만족도 조사를 표준화하고, 결과를 경영평가에 자동 반영 |
| 사용자 | 내부 담당자(설문 생성·관리), 외부 응답자(설문 참여) |
| 기술 스택 | Python, Streamlit, SQLite |
| 배포 환경 | 로컬 실행 또는 Streamlit Cloud |

---

## 2. 사업 유형 정의 (7개)

| 코드 | 유형명 | 주요 대상 | 핵심 측정 포인트 |
|------|--------|-----------|-----------------|
| `edu` | 교육·인력양성형 | 교육생, 수강자 | 강의 품질, 학습 효과 |
| `prod` | 제작·사업화 지원형 | 참여 기업 | 제작 지원 적절성, 사업화 기여 |
| `fund` | 자금·마케팅 지원형 | 참여 기업 | 자금 규모 적절성, 마케팅 효과 |
| `space` | 입주·인프라형 | 입주 기업, 이용자 | 공간·장비 환경, 입주 지원 서비스 |
| `event` | 행사·네트워킹형 | 참가자, 일반도민 | 행사 구성, 네트워킹 기회 |
| `contest` | 공모전·선발형 | 지원자, 참가자 | 심사 공정성, 선발 프로세스 |
| `living` | 스마트시티·리빙랩·현장서비스형 | 주민, 참여자 | 현장 참여 경험, 실증 효과 |

---

## 3. 데이터 구조 (SQLite)

### 테이블 1: surveys (설문 메타)
```sql
CREATE TABLE surveys (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    dept        TEXT NOT NULL,
    biz_type    TEXT NOT NULL,  -- edu/prod/fund/space/event/contest/living
    respondent  TEXT NOT NULL,  -- org / person / both
    created_at  TEXT DEFAULT (datetime('now')),
    status      TEXT DEFAULT 'active'  -- active / closed
);
```

### 테이블 2: questions (문항)
```sql
CREATE TABLE questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id   INTEGER REFERENCES surveys(id),
    category    TEXT NOT NULL,
    question    TEXT NOT NULL,
    q_type      TEXT NOT NULL,  -- scale5 / nps / text
    is_required INTEGER DEFAULT 1,
    order_no    INTEGER NOT NULL
);
```

### 테이블 3: responses (응답 세션)
```sql
CREATE TABLE responses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id       INTEGER REFERENCES surveys(id),
    session_id      TEXT NOT NULL,
    respondent_type TEXT,
    submitted_at    TEXT DEFAULT (datetime('now'))
);
```

### 테이블 4: answers (문항별 응답값)
```sql
CREATE TABLE answers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER REFERENCES responses(id),
    question_id INTEGER REFERENCES questions(id),
    score       INTEGER,
    text_answer TEXT
);
```

---

## 4. 일반사항 문항 (공통)

```python
GENERAL_COMMON = [
    {"id": "cc1", "text": "사업(교육)명", "type": "text"},
    {"id": "cc2", "text": "참여 경로", "type": "choice",
     "options": ["홈페이지", "페이스북·인스타그램", "문자", "포스터", "온라인커뮤니티", "기타"]},
]

GENERAL_ORG = [
    {"id": "o1", "text": "기관(기업)명", "type": "text"},
    {"id": "o2", "text": "업종·분야", "type": "choice",
     "options": ["콘텐츠", "IT", "제조", "문화예술", "기타"]},
    {"id": "o3", "text": "소재지", "type": "choice",
     "options": ["충남 소재", "충남 외 소재"]},
    {"id": "o4", "text": "종업원 수", "type": "choice",
     "options": ["1~4인", "5~9인", "10~29인", "30인 이상"]},
    {"id": "o5", "text": "설립 연도 또는 업력", "type": "text"},
    {"id": "o6", "text": "응답자 직위", "type": "choice",
     "options": ["대표", "임원", "팀장", "실무자", "기타"]},
]

GENERAL_PERSON = [
    {"id": "p1", "text": "거주지", "type": "choice",
     "options": ["충남", "충남 외"]},
    {"id": "p2", "text": "성별", "type": "choice",
     "options": ["남", "여", "응답하지 않음"]},
    {"id": "p3", "text": "연령대", "type": "choice",
     "options": ["10대", "20대", "30대", "40대", "50대 이상"]},
]
```

---

## 5. 사업유형별 문항 풀

```python
QUESTION_POOL = {

    # ── 교육·인력양성형 ──────────────────────────────────────────
    "edu": [
        {"cat": "강의 시간",    "q": "프로그램 운영 시간을 잘 지켰다.",                               "type": "scale5"},
        {"cat": "강의 시간",    "q": "강의 시간이 적절하게 배분되었다.",                               "type": "scale5"},
        {"cat": "강의 준비",    "q": "강사의 강의자료는 내용을 이해하는 데 도움이 되었다.",            "type": "scale5"},
        {"cat": "강의 준비",    "q": "사전 안내(일정·장소·내용 등)가 충분하게 제공되었다.",            "type": "scale5"},
        {"cat": "강의 내용",    "q": "강의 내용의 구성이 우수하였다.",                                 "type": "scale5"},
        {"cat": "강의 내용",    "q": "교육 내용이 실무에 적용할 수 있을 만큼 유익하였다.",             "type": "scale5"},
        {"cat": "강의 기법",    "q": "강사는 내용을 이해하기 쉽게 설명하였다.",                        "type": "scale5"},
        {"cat": "강의 기법",    "q": "강사는 수강생이 적극 참여할 수 있도록 관심을 갖고 지도하였다.",  "type": "scale5"},
        {"cat": "강의 운영",    "q": "강의 운영방식이 체계적이었다.",                                  "type": "scale5"},
        {"cat": "강의 운영",    "q": "교육 장소 및 시설 환경이 학습에 적합하였다.",                    "type": "scale5"},
        {"cat": "강의 효과",    "q": "본 프로그램 수강이 자기계발에 도움이 되었다.",                    "type": "scale5"},
        {"cat": "강의 효과",    "q": "교육 목표 또는 기대했던 학습 성과를 달성하였다.",                 "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자의 안내와 행정 지원이 친절하고 충분하였다.",                "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 담당자의 응대가 신속하고 적절하였다.",     "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 프로그램에 대해 전반적으로 만족한다.",                         "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 프로그램을 주변에 추천하시겠습니까? (0~10점)",                "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "특강 전반에 관한 소감 및 개선 의견을 자유롭게 작성해 주십시오.", "type": "text"},
        {"cat": "서술형",       "q": "향후 참여하고 싶은 교육 주제나 건의 사항을 작성해 주세요.",      "type": "text"},
    ],

    # ── 제작·사업화 지원형 ───────────────────────────────────────
    "prod": [
        {"cat": "운영 프로세스","q": "사업 신청·선발·진행 절차가 체계적이었다.",                        "type": "scale5"},
        {"cat": "운영 프로세스","q": "사업 관련 정보와 안내가 충분하게 제공되었다.",                     "type": "scale5"},
        {"cat": "제작 지원",    "q": "제작 지원 내용(장비·공간·멘토링 등)이 우리 팀의 필요에 부합하였다.", "type": "scale5"},
        {"cat": "제작 지원",    "q": "제작 지원 규모(기간·범위)가 적절하였다.",                         "type": "scale5"},
        {"cat": "사업화 지원",  "q": "사업화 연계(투자·유통·판로 등) 지원이 실질적으로 도움이 되었다.", "type": "scale5"},
        {"cat": "사업화 지원",  "q": "본 사업 참여가 매출 증대 또는 사업 성장에 기여하였다.",            "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자의 응대가 친절하고 적극적이었다.",                           "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 처리가 신속하고 적절하였다.",                "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자가 필요한 정보를 충분히 제공하였다.",                        "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 지원사업에 대해 전반적으로 만족한다.",                          "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 사업을 주변 기업에 추천하시겠습니까? (0~10점)",                "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "가장 만족한 지원 내용 및 향후 필요한 지원 분야를 작성해 주세요.", "type": "text"},
    ],

    # ── 자금·마케팅 지원형 ───────────────────────────────────────
    "fund": [
        {"cat": "운영 프로세스","q": "지원사업 신청·심사·지급 절차가 체계적이었다.",                     "type": "scale5"},
        {"cat": "운영 프로세스","q": "지원 관련 정보와 안내가 충분하게 제공되었다.",                      "type": "scale5"},
        {"cat": "자금 지원",    "q": "지원 금액 규모가 사업 추진에 적절하였다.",                          "type": "scale5"},
        {"cat": "자금 지원",    "q": "지원금 집행 절차가 편리하고 명확하였다.",                           "type": "scale5"},
        {"cat": "마케팅 지원",  "q": "마케팅 지원 내용(홍보·전시·판로 등)이 실질적으로 도움이 되었다.",  "type": "scale5"},
        {"cat": "마케팅 지원",  "q": "본 사업 참여가 브랜드 인지도 향상 또는 매출 증대에 기여하였다.",   "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자의 응대가 친절하고 적극적이었다.",                            "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 처리가 신속하고 적절하였다.",                 "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자가 필요한 정보를 충분히 제공하였다.",                         "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 지원사업에 대해 전반적으로 만족한다.",                           "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 사업을 주변 기업에 추천하시겠습니까? (0~10점)",                 "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "지원사업의 가장 만족한 점과 개선이 필요한 점을 작성해 주세요.",    "type": "text"},
    ],

    # ── 입주·인프라형 ────────────────────────────────────────────
    "space": [
        {"cat": "입주 지원",    "q": "입주 신청 및 선발 절차가 체계적이고 공정하였다.",                   "type": "scale5"},
        {"cat": "입주 지원",    "q": "입주 관련 안내와 행정 지원이 충분하였다.",                          "type": "scale5"},
        {"cat": "공간·장비",    "q": "공간(사무실·작업실 등)의 규모와 환경이 업무에 적합하였다.",         "type": "scale5"},
        {"cat": "공간·장비",    "q": "장비·시설(음향·영상·IT 인프라 등)의 구비 수준이 만족스러웠다.",    "type": "scale5"},
        {"cat": "공간·장비",    "q": "시설 청결 및 안전관리가 잘 이루어졌다.",                            "type": "scale5"},
        {"cat": "입주 프로그램","q": "입주 기업 대상 교육·멘토링·네트워킹 프로그램이 유익하였다.",        "type": "scale5"},
        {"cat": "입주 프로그램","q": "투자·판로·사업화 연계 지원이 실질적으로 도움이 되었다.",            "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자의 응대가 친절하고 적극적이었다.",                            "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 처리가 신속하고 적절하였다.",                 "type": "scale5"},
        {"cat": "입주 효과",    "q": "입주를 통해 기업 성장 및 사업화에 실질적인 도움을 받았다.",         "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 입주·인프라 지원에 대해 전반적으로 만족한다.",                   "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 시설·인프라를 주변에 추천하시겠습니까? (0~10점)",               "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "입주 운영 전반에 관한 소감 및 개선 의견을 작성해 주세요.",          "type": "text"},
    ],

    # ── 행사·네트워킹형 ──────────────────────────────────────────
    "event": [
        {"cat": "행사 구성",    "q": "행사 구성 및 프로그램 내용이 유익하였다.",                          "type": "scale5"},
        {"cat": "행사 구성",    "q": "행사 진행 시간 및 타임테이블이 적절하였다.",                         "type": "scale5"},
        {"cat": "운영 환경",    "q": "행사 장소 및 시설 환경이 적합하였다.",                               "type": "scale5"},
        {"cat": "운영 환경",    "q": "행사에 대한 사전 홍보·안내가 충분하게 이루어졌다.",                  "type": "scale5"},
        {"cat": "네트워킹",     "q": "행사를 통해 유익한 인적 네트워크를 형성할 수 있었다.",               "type": "scale5"},
        {"cat": "네트워킹",     "q": "행사에서 만난 참가자·기업과 협력 가능성을 발견하였다.",              "type": "scale5"},
        {"cat": "서비스 품질",  "q": "행사 운영진(스태프)의 응대가 친절하고 적절하였다.",                  "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 처리가 신속하고 적절하였다.",                  "type": "scale5"},
        {"cat": "서비스 품질",  "q": "이 행사가 지역 문화예술·산업 발전에 기여한다고 생각한다.",           "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 행사에 대해 전반적으로 만족한다.",                                "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 행사를 주변에 추천하시겠습니까? (0~10점)",                       "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "행사 전반에 관한 소감 및 개선 의견을 자유롭게 작성해 주십시오.",    "type": "text"},
    ],

    # ── 공모전·선발형 ────────────────────────────────────────────
    "contest": [
        {"cat": "공모 안내",    "q": "공모전 안내(자격·일정·심사기준 등)가 충분하고 명확하였다.",          "type": "scale5"},
        {"cat": "공모 안내",    "q": "접수 절차가 편리하고 불편함이 없었다.",                              "type": "scale5"},
        {"cat": "심사 과정",    "q": "심사 기준이 명확하고 공정하게 운영되었다.",                          "type": "scale5"},
        {"cat": "심사 과정",    "q": "심사 결과 통보가 신속하고 충분한 피드백과 함께 제공되었다.",         "type": "scale5"},
        {"cat": "지원 프로그램","q": "선발 후 제공된 지원(멘토링·교육·네트워킹 등)이 유익하였다.",         "type": "scale5"},
        {"cat": "지원 프로그램","q": "선발 후 사업화·후속 연계 지원이 실질적으로 도움이 되었다.",          "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자의 응대가 친절하고 적극적이었다.",                             "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 처리가 신속하고 적절하였다.",                  "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 공모전·선발 과정에 대해 전반적으로 만족한다.",                    "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 공모전을 주변에 추천하시겠습니까? (0~10점)",                     "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "공모전 운영 전반에 관한 소감 및 개선 의견을 작성해 주세요.",         "type": "text"},
    ],

    # ── 스마트시티·리빙랩·현장서비스형 ──────────────────────────
    "living": [
        {"cat": "사전 안내",    "q": "사업 목적과 참여 방법에 대한 안내가 충분하고 명확하였다.",           "type": "scale5"},
        {"cat": "사전 안내",    "q": "참여 신청 절차가 편리하고 불편함이 없었다.",                         "type": "scale5"},
        {"cat": "현장 운영",    "q": "현장 서비스(실증·테스트·체험 등)가 체계적으로 운영되었다.",          "type": "scale5"},
        {"cat": "현장 운영",    "q": "현장 운영 일정과 진행이 원활하였다.",                                "type": "scale5"},
        {"cat": "참여 경험",    "q": "내 의견과 아이디어가 사업에 실질적으로 반영되었다.",                  "type": "scale5"},
        {"cat": "참여 경험",    "q": "현장 참여를 통해 새로운 기술·서비스를 경험할 수 있었다.",            "type": "scale5"},
        {"cat": "실증 효과",    "q": "이 사업이 지역 문제 해결 또는 생활 편의 향상에 기여한다고 생각한다.","type": "scale5"},
        {"cat": "실증 효과",    "q": "사업의 실증 결과물이 실생활에 유용하게 활용될 것으로 기대된다.",     "type": "scale5"},
        {"cat": "서비스 품질",  "q": "담당자의 응대가 친절하고 적극적이었다.",                             "type": "scale5"},
        {"cat": "서비스 품질",  "q": "문의·건의 사항에 대한 처리가 신속하고 적절하였다.",                  "type": "scale5"},
        {"cat": "전반적 만족도","q": "이 사업에 대해 전반적으로 만족한다.",                                "type": "scale5", "required": True},
        {"cat": "NPS",          "q": "이 사업을 주변에 추천하시겠습니까? (0~10점)",                       "type": "nps",    "required": True},
        {"cat": "서술형",       "q": "사업 전반에 관한 소감 및 개선 의견을 자유롭게 작성해 주십시오.",    "type": "text"},
    ],
}
```

---

## 6. 화면 설계 (Streamlit 페이지 구성)

### 페이지 1: 설문 생성 (담당자용)
```
사이드바 메뉴: [설문 생성] [설문 관리] [결과 대시보드] [경영평가 내보내기]

[설문 생성 화면]
1. 기본 정보
   - 사업명 (text input)
   - 부서명 (selectbox: 벤처창업본부 / AI콘텐츠본부 / 사업총괄실 / 미래산업본부 / 기타)
   - 사업유형 (radio 7개)
   - 응답자 유형 (radio: 기관 / 개인 / 기관+개인)

2. 문항 선택 (체크박스)
   - 해당 유형 문항 풀 카테고리별 표시
   - 전반적 만족도 + NPS: 필수 고정 (체크 해제 불가)

3. 담당자 추가 문항
   - "문항 추가" 버튼 → text input 행 추가 (최대 5개)

4. [설문 생성] 버튼
   - DB 저장 → 설문 URL 생성 → 복사 버튼 표시
```

### 페이지 2: 설문 응답 (외부용)
```
URL: ?survey_id=N

1. 일반사항 (응답자 유형에 따라 기관/개인 분기)
2. 만족도 문항 — 5점 척도 라디오버튼
   ① 전혀 그렇지 않다  ② 그렇지 않다  ③ 보통이다  ④ 그렇다  ⑤ 매우 그렇다
3. NPS — 슬라이더 0~10
4. 서술형 — text_area
5. [제출] 버튼 (session_id 기준 중복 제출 방지)
```

### 페이지 3: 결과 대시보드 (담당자용)
```
[사업 선택 드롭다운]

KPI 카드: 응답 인원 / 만족도 평균(5점) / NPS

카테고리별 평균 막대 차트 (Plotly)
문항별 상세 점수 테이블
응답자 분포 파이차트 (연령대·소재지·업종)
서술형 응답 목록
```

### 페이지 4: 경영평가 내보내기
```
[사업 선택 멀티셀렉트]

미리보기 테이블:
사업명 | 사업유형 | 응답인원 | 만족도평균(5점) | NPS | 전체평균

[Excel 다운로드] [Word 다운로드] 버튼
```

---

## 7. 점수 계산 로직

```python
# 5점 만점 평균
def calc_satisfaction(survey_id, db_conn):
    query = """
        SELECT AVG(a.score) as avg_score
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN responses r ON a.response_id = r.id
        WHERE r.survey_id = ? AND q.q_type = 'scale5'
    """
    result = db_conn.execute(query, (survey_id,)).fetchone()
    return round(result[0], 2) if result[0] else 0.0

# NPS 계산
def calc_nps(survey_id, db_conn):
    query = """
        SELECT a.score
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN responses r ON a.response_id = r.id
        WHERE r.survey_id = ? AND q.q_type = 'nps'
    """
    scores = [row[0] for row in db_conn.execute(query, (survey_id,)).fetchall()]
    if not scores:
        return 0
    promoters  = len([s for s in scores if s >= 9]) / len(scores) * 100
    detractors = len([s for s in scores if s <= 6]) / len(scores) * 100
    return round(promoters - detractors, 1)

# 카테고리별 평균
def calc_by_category(survey_id, db_conn):
    query = """
        SELECT q.category, AVG(a.score) as avg_score, COUNT(*) as cnt
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN responses r ON a.response_id = r.id
        WHERE r.survey_id = ? AND q.q_type = 'scale5'
        GROUP BY q.category
        ORDER BY q.order_no
    """
    return db_conn.execute(query, (survey_id,)).fetchall()
```

---

## 8. 파일 구조

```
survey_platform/
├── app.py                  # Streamlit 메인 + 사이드바 라우팅
├── pages/
│   ├── 1_설문생성.py
│   ├── 2_설문응답.py
│   ├── 3_결과대시보드.py
│   └── 4_경영평가내보내기.py
├── db/
│   └── survey.db           # SQLite (자동 생성)
├── utils/
│   ├── db.py               # DB 초기화 + 공통 쿼리
│   ├── calc.py             # 만족도·NPS 계산 함수
│   ├── export_excel.py     # openpyxl 내보내기
│   └── export_word.py      # python-docx 내보내기
├── data/
│   └── question_pool.py    # 위 섹션 5 내용 그대로
├── requirements.txt
└── README.md
```

---

## 9. requirements.txt

```
streamlit>=1.32.0
pandas>=2.0.0
plotly>=5.18.0
openpyxl>=3.1.0
python-docx>=1.1.0
```

---

## 10. Cursor 첫 번째 프롬프트 (복사해서 사용)

```
이 PRD를 기반으로 충남콘텐츠진흥원 통합 설문 플랫폼을 Streamlit + SQLite로 구현해줘.

아래 순서로 파일 1개씩 완성하고, 각각 확인 후 다음으로 넘어가줘:
1. survey_platform/ 폴더 구조 생성 + requirements.txt
2. utils/db.py — DB 초기화 및 테이블 생성 함수
3. data/question_pool.py — 7개 사업유형 문항 풀 데이터
4. app.py — 사이드바 메뉴 라우팅
5. pages/1_설문생성.py

한 번에 전체를 만들지 말고 파일 단위로 완성 후 반드시 확인을 받고 진행해줘.
```

---

## 11. 주의사항

- **파일 1개씩 완성 후 `streamlit run app.py`로 확인**하고 다음 파일 진행
- **DB 경로** — `db/survey.db` 상대경로 고정
- **URL 파라미터** — `st.query_params`로 `survey_id` 전달
- **중복 응답 방지** — `st.session_state`에 UUID 저장, 제출 후 완료 화면 전환
- **사내 공유** — `streamlit run app.py --server.address=0.0.0.0` 후 사내 IP로 접근
