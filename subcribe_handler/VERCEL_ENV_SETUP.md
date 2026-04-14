# Vercel 환경 변수 설정 가이드

## 🚨 현재 오류

```
Error: Missing Supabase environment variables
```

이 오류는 Vercel에 환경 변수가 설정되지 않아서 발생합니다.

## ✅ 해결 방법: Vercel 대시보드에서 환경 변수 설정

### 1단계: Vercel 프로젝트 페이지로 이동

1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 배포하려는 프로젝트 클릭 (예: `subscribe-handler`)

### 2단계: 환경 변수 설정 페이지 열기

1. 프로젝트 페이지에서 **Settings** 탭 클릭
2. 좌측 메뉴에서 **Environment Variables** 클릭

### 3단계: 환경 변수 추가

다음 4개의 환경 변수를 하나씩 추가하세요:

#### 변수 1: NEXT_PUBLIC_SUPABASE_URL

1. **Key**: `NEXT_PUBLIC_SUPABASE_URL`
2. **Value**: Supabase 프로젝트 URL (예: `https://xxxxx.supabase.co`)
3. **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Add** 버튼 클릭

#### 변수 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

1. **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Value**: Supabase Anon Key (긴 문자열)
3. **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Add** 버튼 클릭

#### 변수 3: GEMINI_API_KEY

1. **Key**: `GEMINI_API_KEY`
2. **Value**: Google Gemini API 키
3. **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Add** 버튼 클릭

#### 변수 4: CRON_SECRET (선택사항)

1. **Key**: `CRON_SECRET`
2. **Value**: 랜덤 문자열 (예: `my-secret-key-12345`)
3. **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Add** 버튼 클릭

### 4단계: Supabase 키 찾는 방법

Supabase 키를 모르시나요?

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Settings** (⚙️ 아이콘) 클릭
4. **API** 메뉴 클릭
5. 다음 정보 확인:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` 값
   - **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY` 값
     - "Reveal" 버튼을 클릭하면 전체 키를 볼 수 있습니다

### 5단계: 재배포

환경 변수를 추가한 후:

1. **Deployments** 탭으로 이동
2. 최신 배포 옆의 **⋯** (점 3개) 메뉴 클릭
3. **Redeploy** 선택
4. 또는 새로운 커밋을 푸시하면 자동으로 재배포됩니다

## 📋 환경 변수 체크리스트

설정해야 할 환경 변수:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `CRON_SECRET` (선택사항)

## ⚠️ 중요 사항

### NEXT_PUBLIC_ 접두사

- `NEXT_PUBLIC_`로 시작하는 변수는 **빌드 타임**에 필요합니다
- 클라이언트 코드에서도 접근 가능합니다
- 반드시 **모든 환경** (Production, Preview, Development)에 설정해야 합니다

### 환경별 설정

- **Production**: 실제 배포된 사이트
- **Preview**: Pull Request마다 생성되는 미리보기
- **Development**: 로컬 개발 환경 (일반적으로 사용 안 함)

**권장**: 세 환경 모두에 동일한 값 설정

## 🔍 환경 변수 확인 방법

### Vercel 대시보드에서 확인

1. 프로젝트 > **Settings** > **Environment Variables**
2. 설정된 모든 환경 변수 목록 확인

### 배포 로그에서 확인

환경 변수가 제대로 설정되었는지 확인하려면:
1. **Deployments** 탭
2. 배포 클릭
3. **Build Logs** 확인
4. 환경 변수는 값이 숨겨져 있지만, 오류가 없으면 정상입니다

## 🐛 문제 해결

### 여전히 오류가 발생하나요?

1. **환경 변수 이름 확인**
   - 정확히 `NEXT_PUBLIC_SUPABASE_URL` (대소문자 구분)
   - 정확히 `NEXT_PUBLIC_SUPABASE_ANON_KEY` (대소문자 구분)

2. **모든 환경에 설정했는지 확인**
   - Production ✅
   - Preview ✅
   - Development ✅

3. **재배포 확인**
   - 환경 변수 추가 후 반드시 재배포해야 합니다
   - 새 배포가 시작되었는지 확인

4. **값 확인**
   - Supabase URL이 `https://`로 시작하는지 확인
   - API 키에 공백이나 줄바꿈이 없는지 확인

## 📝 빠른 참조

### 환경 변수 예시

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTEyMzQ1NiwiZXhwIjoxOTYwNzA5NDU2fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CRON_SECRET=my-random-secret-key-12345
```

### Vercel 환경 변수 설정 위치

```
Vercel 대시보드
  └─ 프로젝트 선택
      └─ Settings
          └─ Environment Variables
              └─ Add New
                  ├─ Key: NEXT_PUBLIC_SUPABASE_URL
                  ├─ Value: (Supabase URL)
                  └─ Environment: Production, Preview, Development
```

---

**환경 변수를 설정한 후 반드시 재배포하세요!**

