-- migration_008: 담당자 다중 사업 지원
-- 한 담당자가 여러 사업(사업명·유형·세부사업)을 맡을 수 있도록 배열 컬럼 추가.
-- 기존 단일 필드(business/sub_business/program_type)는 "대표 사업"으로 유지(businesses[0]).
-- Supabase SQL Editor에서 실행하세요.

alter table public.platform_users
  add column if not exists businesses jsonb not null default '[]'::jsonb;

-- 기존 단일 사업 정보를 배열로 백필 (businesses가 비어있고 사업명이 있는 경우)
update public.platform_users
set businesses = jsonb_build_array(
  jsonb_build_object(
    'business', coalesce(business, ''),
    'subBusiness', coalesce(sub_business, ''),
    'programType', coalesce(program_type, '')
  )
)
where (businesses is null or businesses = '[]'::jsonb)
  and coalesce(business, '') <> '';
