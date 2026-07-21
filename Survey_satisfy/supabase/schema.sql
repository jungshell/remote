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

-- upsert(on conflict) 기반 중복 방지용. NULLS DISTINCT라 익명 응답(null)은 제약 없음.
create unique index if not exists idx_survey_responses_survey_phone
  on public.survey_responses(survey_id, phone_last4);

-- ─── RLS ───
-- 응답 제출·조회·수정은 모두 서버 라우트(서비스 롤)에서 처리합니다.
-- anon 키에는 어떤 정책도 열지 않아 기본 거부(deny-all) 상태를 유지합니다.
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- 참여자: 진행 중인 설문 메타 조회
create policy "surveys_public_read_active"
  on public.surveys for select
  using (status = '진행중');
