-- migration_009: 위원 일정조사(가용시간 취합) — 총괄관리자 전용 기능
-- Supabase SQL Editor에서 실행하세요.

-- 일정조사 (관리자가 후보 날짜·시간대를 정해 배포)
create table if not exists public.schedule_polls (
  id             text primary key,
  title          text not null,
  description    text,
  created_by     uuid references public.platform_users(id) on delete set null,
  dates          jsonb not null default '[]'::jsonb,      -- ["2026-08-01", ...]
  time_slots     jsonb not null default '[]'::jsonb,      -- [{"id":"am","label":"오전 10~11"}, ...]
  include_lunch  boolean not null default false,
  include_dinner boolean not null default false,
  status         text not null default '진행중'
    check (status in ('진행중', '종료')),
  deadline       timestamptz,
  created_at     timestamptz not null default now()
);

-- 위원 응답 (이름 + 가능한 날짜·시간대·식사 여부)
create table if not exists public.schedule_responses (
  id              uuid primary key default gen_random_uuid(),
  poll_id         text not null references public.schedule_polls(id) on delete cascade,
  respondent_name text not null,
  selections      jsonb not null default '[]'::jsonb,
  -- 예: [{"date":"2026-08-01","slots":["am","pm"],"lunch":true,"dinner":false}]
  note            text,
  submitted_at    timestamptz not null default now()
);

create index if not exists idx_schedule_responses_poll
  on public.schedule_responses(poll_id);

-- 같은 조사에 동일 이름은 1건(재제출 시 수정) — upsert 대상
create unique index if not exists idx_schedule_responses_poll_name
  on public.schedule_responses(poll_id, respondent_name);

-- RLS: 앱 서버(service_role)로만 접근 (anon 직접 접근 차단)
alter table public.schedule_polls enable row level security;
alter table public.schedule_responses enable row level security;
