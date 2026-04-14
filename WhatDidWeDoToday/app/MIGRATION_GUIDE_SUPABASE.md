# Supabase로 마이그레이션 가이드 (예시)

## Supabase 무료 티어
- ✅ 읽기/쓰기: **무제한**
- ✅ 저장 용량: 500MB
- ✅ API 요청: 월 500,000회
- ✅ 파일 저장: 1GB

## 마이그레이션 단계

### 1. Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 무료 계정 생성
3. 새 프로젝트 생성

### 2. 데이터베이스 스키마 생성
```sql
-- diaries 테이블 생성
CREATE TABLE diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  summary TEXT,
  timeline TEXT[],
  good_things_by_member JSONB,
  quote TEXT,
  mood_score INTEGER,
  image_urls TEXT[],
  image_prompts TEXT[],
  keywords TEXT[],
  combined_image_prompt TEXT,
  combined_image_url TEXT,
  custom_image_url TEXT,
  date DATE,
  location TEXT,
  weather TEXT,
  transcript TEXT,
  audio_url TEXT,
  members TEXT[],
  photo_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_diaries_date ON diaries(date DESC);
CREATE INDEX idx_diaries_created_at ON diaries(created_at DESC);
```

### 3. 코드 변경 예시

#### 기존 (Firebase):
```typescript
const snapshot = await adminDb.collection("diaries").orderBy("createdAt", "desc").limit(30).get();
```

#### 변경 후 (Supabase):
```typescript
const { data, error } = await supabase
  .from('diaries')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(30);
```

## 마이그레이션 도구
- Supabase는 Firebase 데이터를 자동으로 가져오는 도구 제공
- 또는 수동으로 데이터 export/import 가능
