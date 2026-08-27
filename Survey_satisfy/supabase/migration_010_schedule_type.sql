-- migration_010: 일정조사 유형 추가 (가용시간 조사 / 확정 일정 참석 확인)
-- Supabase SQL Editor에서 실행하세요.

alter table public.schedule_polls
  add column if not exists poll_type text not null default 'availability'
  check (poll_type in ('availability', 'confirm'));

-- 기존 데이터는 모두 가용시간 조사(availability)로 유지됩니다.
