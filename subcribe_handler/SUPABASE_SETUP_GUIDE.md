# Supabase API 키 찾는 방법

## 1. Supabase 프로젝트 접속

1. [Supabase](https://supabase.com)에 로그인
2. 프로젝트 선택 (또는 새 프로젝트 생성)

## 2. API 키 찾기

### 방법 1: Settings 메뉴에서 찾기 (권장)

1. 좌측 메뉴에서 **Settings** (톱니바퀴 아이콘) 클릭
2. **API** 메뉴 클릭
3. 다음 정보를 확인할 수 있습니다:

   - **Project URL**: `https://xxxxx.supabase.co` 형식
     - 이것이 `NEXT_PUBLIC_SUPABASE_URL` 값입니다
   
   - **anon public** 키: 긴 문자열 (예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
     - 이것이 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 값입니다
     - "Reveal" 버튼을 클릭하면 전체 키를 볼 수 있습니다

### 방법 2: Project Settings에서 찾기

1. 좌측 상단의 프로젝트 이름 옆 **⚙️ 아이콘** 클릭
2. **API Settings** 선택
3. **Project URL**과 **anon public** 키 확인

## 3. .env.local 파일에 입력

프로젝트 루트의 `.env.local` 파일을 열고 다음과 같이 입력하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxMjM0NTYsImV4cCI6MTk2MDcwOTQ1Nn0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

## 주의사항

- **anon public** 키는 공개되어도 안전합니다 (클라이언트에서 사용)
- **service_role** 키는 절대 공개하지 마세요 (서버에서만 사용)
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다

## 스크린샷 참고 위치

Supabase 대시보드에서:
```
Settings (좌측 메뉴)
  └─ API
      ├─ Project URL ← NEXT_PUBLIC_SUPABASE_URL
      └─ anon public ← NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 문제 해결

### 키를 찾을 수 없나요?

1. **프로젝트가 생성되었는지 확인**
   - 프로젝트 생성 후 1-2분 정도 기다려야 할 수 있습니다

2. **올바른 프로젝트를 선택했는지 확인**
   - 여러 프로젝트가 있다면 올바른 프로젝트를 선택했는지 확인

3. **권한 확인**
   - 프로젝트 소유자 또는 관리자 권한이 필요합니다

### 여전히 찾을 수 없다면?

Supabase 대시보드에서:
1. 좌측 메뉴의 **Settings** 클릭
2. **General** 메뉴에서 **Reference ID** 확인
3. 또는 **Database** > **Connection string**에서 URL 확인 가능


