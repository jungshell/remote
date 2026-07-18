-- 보안 강화: 응답 RLS 잠금 + 설문 소유자 + 응답 수정 토큰
-- (루트 복사본 — 원본: supabase/migration_007_security.sql)

alter table public.surveys
  add column if not exists owner_user_id uuid references public.platform_users(id) on delete set null;

create index if not exists idx_surveys_owner_user_id
  on public.surveys(owner_user_id);

alter table public.survey_responses
  add column if not exists edit_token text;

create index if not exists idx_survey_responses_edit_token
  on public.survey_responses(survey_id, edit_token)
  where edit_token is not null;

drop policy if exists "responses_read_own_by_phone" on public.survey_responses;
drop policy if exists "responses_update_own_by_phone" on public.survey_responses;
drop policy if exists "responses_public_insert" on public.survey_responses;

create policy "responses_deny_all_client"
  on public.survey_responses
  for all
  using (false)
  with check (false);
