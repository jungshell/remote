# Vercel 온라인 서버 배포 가이드

이 가이드는 정기구독 해지 방어기를 Vercel에 배포하여 온라인에서 접속 가능하게 만드는 방법을 안내합니다.

## 🚀 Vercel이란?

- **Next.js 공식 호스팅 플랫폼**: Next.js를 만든 Vercel에서 제공
- **무료 티어 제공**: 개인 프로젝트에 충분한 무료 할당량
- **자동 배포**: Git 푸시 시 자동으로 배포
- **글로벌 CDN**: 전 세계 어디서나 빠른 접속
- **자동 HTTPS**: SSL 인증서 자동 설정

## 📋 배포 전 준비사항

### 1. 필요한 계정
- [ ] GitHub 계정 (또는 GitLab, Bitbucket)
- [ ] Vercel 계정 (GitHub로 가입 가능)

### 2. 필요한 환경 변수
다음 환경 변수들이 준비되어 있어야 합니다:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `GEMINI_API_KEY`: Google Gemini API 키
- `CRON_SECRET` (선택사항): Cron job 보안용 시크릿 키

## 🎯 배포 방법

### 방법 1: Vercel 웹 대시보드 사용 (권장)

#### 1단계: GitHub에 프로젝트 업로드

```bash
# Git 저장소 초기화 (아직 안 했다면)
cd "/Volumes/Samsung USB/subcribe_handler"
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/jungshell/subscribe.git
git branch -M main
git push -u origin main
```

#### 2단계: Vercel에 프로젝트 연결

1. [Vercel](https://vercel.com) 접속
2. **Sign Up** 또는 **Log In** (GitHub 계정으로 로그인)
3. **Add New Project** 클릭
4. GitHub 저장소 선택 (`jungshell/subscribe`)
5. **Import** 클릭

#### 3단계: 프로젝트 이름 설정

⚠️ **중요**: "subscribe"라는 이름이 이미 사용 중이라면:
- 다른 이름을 사용하세요 (예: `subscribe-handler`, `subscription-manager`, `subcribe-handler`)
- 또는 기존 프로젝트를 삭제하고 새로 만들기

#### 4단계: 환경 변수 설정

Vercel 대시보드에서:
1. **Environment Variables** 섹션으로 이동
2. 다음 변수들을 추가:

```
NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
GEMINI_API_KEY = your_gemini_api_key
CRON_SECRET = your_random_secret_key (선택사항)
```

**중요**: 
- `NEXT_PUBLIC_`로 시작하는 변수는 자동으로 클라이언트에 노출됩니다
- `GEMINI_API_KEY`와 `CRON_SECRET`은 서버에서만 사용됩니다

#### 5단계: 배포 설정

- **Framework Preset**: Next.js (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (자동)
- **Output Directory**: `.next` (자동)

#### 6단계: 배포 실행

**Deploy** 버튼 클릭!

배포가 완료되면 다음과 같은 URL이 제공됩니다:
- `https://your-project-name.vercel.app`

### 방법 2: Vercel CLI 사용

#### 1단계: Vercel CLI 설치

```bash
npm install -g vercel
```

#### 2단계: 로그인

```bash
vercel login
```

#### 3단계: 프로젝트 배포

```bash
cd "/Volumes/Samsung USB/subcribe_handler"
vercel
```

첫 배포 시:
- 프로젝트 이름 입력 (기존 이름과 다르게)
- 환경 변수 입력 (또는 나중에 대시보드에서 설정)

#### 4단계: 프로덕션 배포

```bash
vercel --prod
```

## 🔧 환경 변수 설정 (CLI 사용 시)

CLI로 환경 변수를 설정하려면:

```bash
# 각 환경 변수 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add GEMINI_API_KEY
vercel env add CRON_SECRET

# 환경 변수 확인
vercel env ls
```

## 📝 배포 후 확인사항

### 1. 배포 상태 확인

Vercel 대시보드에서:
- **Deployments** 탭에서 배포 상태 확인
- 초록색 체크 표시 = 성공
- 빨간색 X 표시 = 실패 (로그 확인)

### 2. 사이트 접속 테스트

브라우저에서 배포된 URL 접속:
```
https://your-project-name.vercel.app
```

### 3. API 엔드포인트 테스트

```
https://your-project-name.vercel.app/api/test-connection
```

### 4. Cron Job 확인

`vercel.json`에 설정된 Cron Job이 자동으로 작동합니다:
- 매일 오전 9시에 `/api/cron/check-notifications` 실행
- Vercel 대시보드의 **Cron Jobs** 탭에서 확인 가능

## 🔄 자동 배포 설정

GitHub에 푸시할 때마다 자동으로 배포되도록 설정:

1. Vercel 대시보드 > 프로젝트 > **Settings**
2. **Git** 섹션에서:
   - **Production Branch**: `main` (또는 `master`)
   - **Auto-deploy**: 활성화

이제 `git push`만 하면 자동으로 배포됩니다!

## 🌐 커스텀 도메인 설정 (선택사항)

### 1. 도메인 추가

Vercel 대시보드 > 프로젝트 > **Settings** > **Domains**

### 2. DNS 설정

도메인 제공업체에서 다음 DNS 레코드 추가:
- **Type**: CNAME
- **Name**: `@` 또는 `www`
- **Value**: `cname.vercel-dns.com`

## 🐛 문제 해결

### 배포 실패 시

1. **빌드 로그 확인**
   - Vercel 대시보드 > Deployments > 실패한 배포 클릭
   - **Build Logs** 탭에서 에러 확인

2. **환경 변수 확인**
   - 모든 환경 변수가 올바르게 설정되었는지 확인
   - 특히 `NEXT_PUBLIC_` 접두사 확인

3. **로컬 빌드 테스트**
   ```bash
   npm run build
   ```
   로컬에서 빌드가 성공하는지 확인

### 프로젝트 이름 중복 오류

**오류**: "The specified name is already used for a different Git repository"

**해결 방법**:
1. 다른 이름 사용 (예: `subscribe-handler`, `subscription-manager`)
2. 기존 프로젝트 삭제 후 재생성
3. 기존 프로젝트에 새 저장소 연결

### 환경 변수 오류

- `NEXT_PUBLIC_`로 시작하지 않는 변수는 클라이언트에서 접근 불가
- 서버 컴포넌트에서만 사용 가능

### Supabase 연결 오류

- Supabase 프로젝트의 **Settings** > **API**에서 URL과 Key 확인
- Vercel 환경 변수가 올바르게 설정되었는지 확인

## 📊 Vercel 무료 티어 제한

- **대역폭**: 월 100GB
- **함수 실행 시간**: 월 100GB-초
- **빌드 시간**: 월 6,000분
- **프로젝트 수**: 무제한
- **도메인**: 무제한

대부분의 개인 프로젝트에는 충분합니다!

## 🔐 보안 주의사항

1. **환경 변수 보호**
   - `.env.local` 파일은 절대 Git에 커밋하지 마세요
   - Vercel 환경 변수는 대시보드에서만 관리

2. **API 키 보호**
   - `GEMINI_API_KEY`는 서버에서만 사용
   - 클라이언트에 노출되지 않도록 주의

3. **Cron Secret**
   - `CRON_SECRET`을 설정하여 무단 접근 방지
   - `/api/cron/check-notifications`에서 검증

## 📚 추가 리소스

- [Vercel 공식 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Vercel 환경 변수 가이드](https://vercel.com/docs/environment-variables)

## ✅ 체크리스트

배포 전 확인:
- [ ] GitHub에 프로젝트 업로드 완료
- [ ] Vercel 계정 생성 완료
- [ ] 모든 환경 변수 준비 완료
- [ ] 로컬에서 `npm run build` 성공
- [ ] `vercel.json` 파일 확인

배포 후 확인:
- [ ] 배포 성공 확인
- [ ] 사이트 접속 테스트
- [ ] API 엔드포인트 테스트
- [ ] 환경 변수 정상 작동 확인
- [ ] Cron Job 설정 확인

---

**질문이나 문제가 있으면 Vercel 대시보드의 로그를 확인하세요!**
