# 데이터베이스 스키마 업데이트 가이드

6가지 개선사항을 적용하기 위해 Supabase 데이터베이스 스키마를 업데이트해야 합니다.

## 업데이트 내용

1. **subscriptions 테이블 확장**
   - `category` 컬럼 추가 (카테고리)
   - `tags` 컬럼 추가 (태그 배열)

2. **payment_history 테이블 생성**
   - 결제 내역 히스토리 저장

3. **user_settings 테이블 확장**
   - `notification_days_before_array` 컬럼 추가 (여러 알림 시점 지원)
   - `email_notifications` 컬럼 추가 (이메일 알림 설정)
   - `email_address` 컬럼 추가 (이메일 주소)

## 업데이트 방법

### 1. Supabase 대시보드 접속
1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭

### 2. SQL 스크립트 실행
`supabase/schema_updates.sql` 파일의 내용을 복사하여 SQL Editor에 붙여넣고 실행하세요.

또는 아래 SQL을 직접 실행하세요:

```sql
-- 1. subscriptions 테이블에 카테고리와 태그 추가
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 카테고리 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions(category) WHERE category IS NOT NULL;

-- 2. payment_history 테이블 생성 (결제 내역 히스토리)
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_date ON payment_history(user_id, payment_date);

-- 3. user_settings 테이블에 여러 알림 시점 설정 추가
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notification_days_before_array INTEGER[] DEFAULT ARRAY[3],
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_address TEXT;

-- 기존 notification_days_before를 배열로 변환 (마이그레이션)
UPDATE user_settings 
SET notification_days_before_array = ARRAY[notification_days_before]
WHERE notification_days_before_array IS NULL OR array_length(notification_days_before_array, 1) IS NULL;
```

### 3. 실행 확인
SQL 실행 후 오류가 없으면 성공입니다. 테이블 구조를 확인하려면:
- 좌측 메뉴에서 **Table Editor** 클릭
- `subscriptions`, `payment_history`, `user_settings` 테이블 확인

## 주의사항

- 기존 데이터는 유지됩니다
- `tags` 컬럼은 빈 배열(`{}`)로 초기화됩니다
- `notification_days_before_array`는 기존 `notification_days_before` 값을 배열로 변환합니다

## 문제 해결

### 오류: "column already exists"
- 해당 컬럼이 이미 존재하는 경우입니다. 무시하고 진행하세요.

### 오류: "relation already exists"
- `payment_history` 테이블이 이미 존재하는 경우입니다. 무시하고 진행하세요.

### 기타 오류
- Supabase 로그를 확인하거나, 각 SQL 문을 개별적으로 실행해보세요.

