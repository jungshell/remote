# 백그라운드 알림 스케줄링 설정 가이드

시스템이 꺼져도 지속적으로 알림을 받으려면 다음 중 하나의 방법을 사용하세요.

## 방법 1: Vercel Cron Jobs (권장 - Vercel 배포 시)

Vercel에 배포하면 자동으로 Cron Jobs가 작동합니다.

1. `.env.local`에 `CRON_SECRET` 추가:
```env
CRON_SECRET=your-random-secret-key-here
```

2. `vercel.json` 파일이 이미 생성되어 있습니다.
   - 매일 오전 9시에 자동으로 알림 체크
   - 스케줄 변경: `vercel.json`의 `schedule` 값 수정

3. Vercel에 배포:
```bash
vercel --prod
```

## 방법 2: 외부 Cron 서비스 사용 (로컬 개발 또는 다른 호스팅)

### cron-job.org 사용 (무료)

1. [cron-job.org](https://cron-job.org) 회원가입
2. 새 Cron Job 생성:
   - URL: `https://your-domain.com/api/cron/check-notifications`
   - Schedule: 매일 원하는 시간 (예: `0 9 * * *` = 매일 오전 9시)
   - Method: GET
   - Headers (선택사항):
     - `Authorization: Bearer your-cron-secret`

### EasyCron 사용

1. [EasyCron](https://www.easycron.com) 회원가입
2. 새 Job 생성:
   - URL: `https://your-domain.com/api/cron/check-notifications`
   - Schedule: 매일 실행
   - HTTP Method: GET

## 방법 3: Supabase Edge Functions + pg_cron (고급)

Supabase에서 직접 스케줄링하려면:

1. Supabase Dashboard > Database > Extensions
2. `pg_cron` 확장 활성화
3. SQL Editor에서:

```sql
SELECT cron.schedule(
  'check-subscription-notifications',
  '0 9 * * *', -- 매일 오전 9시
  $$
  SELECT net.http_post(
    url:='https://your-domain.com/api/cron/check-notifications',
    headers:='{"Authorization": "Bearer your-secret"}'::jsonb
  );
  $$
);
```

## 테스트

로컬에서 테스트하려면:

```bash
curl http://localhost:3000/api/cron/check-notifications
```

또는 브라우저에서 직접 접속해도 됩니다.

## 보안

- `CRON_SECRET` 환경 변수를 설정하여 무단 접근 방지
- Vercel 배포 시 환경 변수도 설정해야 합니다

## 스케줄 형식

Cron 표현식 형식:
- `0 9 * * *` = 매일 오전 9시
- `0 */6 * * *` = 6시간마다
- `0 9 * * 1` = 매주 월요일 오전 9시


