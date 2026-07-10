-- 기존 DB에 아래를 SQL Editor에서 실행하세요 (이미 컬럼이 있으면 건너뜀).

alter table public.surveys
  add column if not exists year integer not null default extract(year from now());

alter table public.surveys
  add column if not exists round integer not null default 1;

alter table public.surveys
  add column if not exists respondent_type text not null default 'both'
    check (respondent_type in ('org', 'person', 'both'));

alter table public.surveys
  alter column status set default '작성중';

-- 기존 status check 제약이 있으면 제거 후 단순화 (선택)
alter table public.surveys drop constraint if exists surveys_status_check;
alter table public.surveys
  add constraint surveys_status_check
  check (status in ('작성중', '진행중', '종료'));
