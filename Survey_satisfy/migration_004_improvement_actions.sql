-- Supabase SQL Editor에서 실행: 개선과제 테이블

create table if not exists public.improvement_actions (
  id                    uuid primary key default gen_random_uuid(),
  survey_id             text not null references public.surveys(id) on delete cascade,
  title                 text not null,
  source                text not null default 'manual'
    check (source in ('manual', 'low_score', 'opinion')),
  owner_name            text not null default '',
  due_date              date,
  status                text not null default '등록'
    check (status in ('등록', '진행중', '완료', '보류')),
  related_question_id   text,
  related_question_label text,
  memo                  text not null default '',
  division              text not null,
  year                  integer not null default extract(year from now()),
  created_by            uuid references public.platform_users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_improvement_actions_survey_id
  on public.improvement_actions(survey_id);

create index if not exists idx_improvement_actions_division
  on public.improvement_actions(division);

create index if not exists idx_improvement_actions_year
  on public.improvement_actions(year);

create index if not exists idx_improvement_actions_status
  on public.improvement_actions(status);

alter table public.improvement_actions enable row level security;
