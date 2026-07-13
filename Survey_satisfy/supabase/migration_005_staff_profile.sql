-- Supabase SQL Editor에서 실행: 담당자 프로필 + 설문 시작일

alter table public.platform_users
  add column if not exists business text not null default '';

alter table public.platform_users
  add column if not exists sub_business text not null default '';

alter table public.platform_users
  add column if not exists program_type text not null default '';

alter table public.surveys
  add column if not exists starts_at timestamptz;
