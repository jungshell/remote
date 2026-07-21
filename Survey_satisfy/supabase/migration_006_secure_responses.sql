-- migration_006: 응답 데이터 보안 강화
-- 응답 제출·조회·수정을 모두 서버 라우트(서비스 롤)로 이전했으므로,
-- anon 키로 가능했던 전체 응답 열람/수정/직접 삽입 경로를 차단합니다.
-- Supabase SQL Editor에 붙여넣어 실행하세요.

-- 기존 정책 제거: "phone_last4 is not null" 조건은 본인 확인이 아니라 사실상 전체 공개였음
drop policy if exists "responses_read_own_by_phone" on public.survey_responses;
drop policy if exists "responses_update_own_by_phone" on public.survey_responses;
drop policy if exists "responses_public_insert" on public.survey_responses;

-- upsert(on conflict) 기반 원자적 중복 방지를 위해 부분 unique 인덱스를 일반 unique 인덱스로 교체.
-- Postgres 기본(NULLS DISTINCT)에 따라 phone_last4가 null인 익명 응답은 제약을 받지 않습니다.
drop index if exists idx_survey_responses_survey_phone;
create unique index if not exists idx_survey_responses_survey_phone
  on public.survey_responses(survey_id, phone_last4);
