-- Supabase SQL Editor에서 실행: 회원·세션 테이블

create table if not exists public.platform_users (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  password_hash   text not null,
  name            text not null,
  division        text not null,
  role            text not null default 'staff'
    check (role in ('staff', 'admin')),
  status          text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz not null default now(),
  approved_at     timestamptz,
  approved_by     uuid references public.platform_users(id)
);

create index if not exists idx_platform_users_status
  on public.platform_users(status);

create index if not exists idx_platform_users_role
  on public.platform_users(role);

create table if not exists public.user_sessions (
  token           text primary key,
  user_id         uuid not null references public.platform_users(id) on delete cascade,
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_user_sessions_user_id
  on public.user_sessions(user_id);

create index if not exists idx_user_sessions_expires_at
  on public.user_sessions(expires_at);

alter table public.platform_users enable row level security;
alter table public.user_sessions enable row level security;
