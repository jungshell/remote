-- 보안 강화: 응답 RLS 잠금 + 설문 소유자 + 응답 수정 토큰
-- Supabase SQL Editor에서 실행

-- 1) 설문 소유자
alter table public.surveys
  add column if not exists owner_user_id uuid references public.platform_users(id) on delete set null;

create index if not exists idx_surveys_owner_user_id
  on public.surveys(owner_user_id);

-- 2) 응답 수정 토큰 (뒤4자리만으로 타 응답 조회·변조 방지)
alter table public.survey_responses
  add column if not exists edit_token text;

create index if not exists idx_survey_responses_edit_token
  on public.survey_responses(survey_id, edit_token)
  where edit_token is not null;

-- 3) 위험한 anon RLS 정책 제거 후 재생성
drop policy if exists "responses_read_own_by_phone" on public.survey_responses;
drop policy if exists "responses_update_own_by_phone" on public.survey_responses;
drop policy if exists "responses_public_insert" on public.survey_responses;

-- anon/authenticated 클라이언트는 응답 테이블 직접 접근 불가
-- (앱 서버 service_role로만 읽고 씀)
-- create policy는 if not exists를 지원하지 않으므로 재실행 안전을 위해 먼저 drop
drop policy if exists "responses_deny_all_client" on public.survey_responses;
create policy "responses_deny_all_client"
  on public.survey_responses
  for all
  using (false)
  with check (false);

-- 진행중 설문 공개 조회는 유지
-- surveys_public_read_active 정책은 그대로 둠
