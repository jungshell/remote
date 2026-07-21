-- Supabase SQL Editor에서 실행: 담당자별 설문 문항 템플릿
-- (찾기 쉬운 루트 복사본 — 원본: supabase/migration_006_survey_templates.sql)

create table if not exists public.survey_templates (
  id                      uuid primary key default gen_random_uuid(),
  owner_user_id           uuid not null references public.platform_users(id) on delete cascade,
  name                    text not null,
  division                text not null default '',
  business                text not null default '',
  sub_business            text not null default '',
  program_type            text not null default '',
  respondent_type         text not null default 'both'
    check (respondent_type in ('org', 'person', 'both')),
  selected_question_ids   jsonb not null default '[]'::jsonb,
  custom_questions        jsonb not null default '[]'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_survey_templates_owner
  on public.survey_templates(owner_user_id);

create index if not exists idx_survey_templates_business
  on public.survey_templates(owner_user_id, business, sub_business, program_type);

alter table public.survey_templates enable row level security;
