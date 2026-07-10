-- Supabase SQL Editor에서 실행: 샘플·데모 데이터 삭제
-- survey-demo 및 관련 응답을 제거합니다.

delete from public.survey_responses
where survey_id = 'survey-demo';

delete from public.surveys
where id = 'survey-demo';

-- 필요 시 아래 주석을 해제해 테스트 데이터 전체를 비울 수 있습니다.
-- delete from public.survey_responses;
-- delete from public.surveys;
