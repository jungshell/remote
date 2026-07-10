-- Supabase SQL Editor에 붙여넣어 실행하세요.
-- 무료 tier: https://supabase.com/dashboard → SQL Editor

-- ─── surveys: 사업 담당자가 생성·운영하는 설문 ───
create table if not exists public.surveys (
  id              text primary key,
  title           text not null,
  division        text not null,
  business        text not null,
  sub_business    text not null,
  program_type    text not null,
  custom_questions jsonb not null default '[]'::jsonb,
  target_responses integer not null default 80,
  year            integer not null default extract(year from now()),
  round           integer not null default 1,
  respondent_type text not null default 'both'
    check (respondent_type in ('org', 'person', 'both')),
  status          text not null default '작성중'
    check (status in ('작성중', '진행중', '종료')),
  created_at      timestamptz not null default now(),
  ends_at         timestamptz
);

-- ─── survey_responses: 참여자 제출 답변 ───
create table if not exists public.survey_responses (
  id              uuid primary key default gen_random_uuid(),
  survey_id       text not null references public.surveys(id) on delete cascade,
  division        text not null,
  business        text not null,
  sub_business    text not null,
  program_type    text not null,
  phone_last4     text,
  answers         jsonb not null default '[]'::jsonb,
  submitted_at    timestamptz not null default now()
);

create index if not exists idx_survey_responses_survey_id
  on public.survey_responses(survey_id);

create index if not exists idx_survey_responses_division
  on public.survey_responses(division);

create index if not exists idx_survey_responses_sub_business
  on public.survey_responses(sub_business);

create index if not exists idx_survey_responses_program_type
  on public.survey_responses(program_type);

create unique index if not exists idx_survey_responses_survey_phone
  on public.survey_responses(survey_id, phone_last4)
  where phone_last4 is not null;

-- ─── RLS ───
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- 참여자: 진행 중인 설문 메타 조회
create policy "surveys_public_read_active"
  on public.surveys for select
  using (status = '진행중');

-- 참여자: 응답 제출 (insert only)
create policy "responses_public_insert"
  on public.survey_responses for insert
  with check (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id and s.status = '진행중'
    )
  );

-- 참여자: 본인 phone_last4로 기존 응답 조회 (수정용)
create policy "responses_read_own_by_phone"
  on public.survey_responses for select
  using (phone_last4 is not null);

-- 참여자: 본인 응답 수정
create policy "responses_update_own_by_phone"
  on public.survey_responses for update
  using (phone_last4 is not null)
  with check (phone_last4 is not null);
