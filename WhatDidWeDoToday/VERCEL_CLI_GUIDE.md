# Vercel CLI 배포 가이드

## 문제 해결

### ❌ 발생한 문제
- 홈 디렉토리(`~`)에서 `cd app` 실행 → 폴더 없음
- 홈 디렉토리에서 `vercel` 실행 → 홈 디렉토리 배포 시도 → Trash 폴더 권한 오류

### ✅ 해결 방법

**올바른 프로젝트 디렉토리로 이동해야 합니다!**

---

## 올바른 배포 방법

### Step 1: 프로젝트 디렉토리로 이동

터미널에서 다음 명령어를 실행하세요:

```bash
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
```

또는 상대 경로로:

```bash
cd /Volumes/Samsung\ USB/WhatDidWeDoToday/app
```

**확인**: 현재 디렉토리가 올바른지 확인
```bash
pwd
# 출력: /Volumes/Samsung USB/WhatDidWeDoToday/app

ls
# package.json, src, next.config.ts 등이 보여야 함
```

### Step 2: Vercel CLI 설치 (이미 완료)

```bash
npm install -g vercel
```

### Step 3: Vercel 로그인 (이미 완료)

```bash
vercel login
```

브라우저에서 인증 완료하면 로그인 성공!

### Step 4: 배포 시작

**⚠️ 중요: 반드시 `app` 폴더 안에서 실행하세요!**

```bash
# 현재 디렉토리 확인
pwd
# /Volumes/Samsung USB/WhatDidWeDoToday/app 이어야 함

# 배포 시작
vercel
```

### Step 5: 배포 질문에 답변

첫 배포 시 다음 질문들이 나옵니다:

```
? Set up and deploy "~/app"? (Y/n) 
→ Y 입력

? Which scope do you want to deploy to?
→ 본인 계정 선택 (화살표 키로 이동, Enter로 선택)

? Link to existing project? (y/N)
→ N 입력 (처음 배포이므로)

? What's your project's name?
→ whatdidwedotoday (또는 원하는 이름)

? In which directory is your code located?
→ ./ (현재 디렉토리, app 폴더 안에 있으므로)

? Want to override the settings? (y/N)
→ N 입력 (기본값 사용)
```

### Step 6: 환경 변수 설정

**⚠️ 중요**: CLI로 배포한 경우, 환경 변수는 Vercel 웹 대시보드에서 설정해야 합니다!

1. 배포 완료 후 Vercel 대시보드 접속: https://vercel.com/dashboard
2. 프로젝트 클릭 → **Settings** → **Environment Variables**
3. 아래 환경 변수들을 모두 추가:

**Firebase (클라이언트)**
```
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=wdwdt-d23c3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wdwdt-d23c3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=wdwdt-d23c3.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=588672749389
NEXT_PUBLIC_FIREBASE_APP_ID=1:588672749389:web:02be1807d62a325a8df104
```

**Firebase (서버)**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"wdwdt-d23c3",...}
FIREBASE_STORAGE_BUCKET=wdwdt-d23c3.firebasestorage.app
```

**LLM API**
```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GROQ_API_KEY=YOUR_GROQ_API_KEY
```

**이미지 생성**
```
NANOBANANA_API_KEY=68788d631106cfa1d4b99f129678b8b3
```

**중요**:
- 각 환경 변수 추가 시 **Production**, **Preview**, **Development** 모두 체크
- `FIREBASE_SERVICE_ACCOUNT`는 JSON 전체를 **한 줄로** 붙여넣기

4. 환경 변수 추가 후 **Redeploy** 필요:
   - Vercel 대시보드 → 프로젝트 → **Deployments** → 최신 배포 → **Redeploy**

---

## 전체 명령어 순서 (복사해서 사용)

```bash
# 1. 프로젝트 디렉토리로 이동
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"

# 2. 현재 위치 확인
pwd
ls

# 3. Vercel 배포 (이미 로그인했으므로 바로 실행 가능)
vercel

# 4. 질문에 답변 (위 Step 5 참조)

# 5. 배포 완료 후 환경 변수 설정 (웹 대시보드에서)
# https://vercel.com/dashboard → 프로젝트 → Settings → Environment Variables
```

---

## 문제 해결

### 문제 1: "operation not permitted, scandir '/Users/sunginjung/.Trash'"

**원인**: 홈 디렉토리에서 `vercel` 실행

**해결**: 
```bash
# 올바른 디렉토리로 이동
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"

# 다시 실행
vercel
```

### 문제 2: "You are deploying your home directory"

**원인**: 홈 디렉토리(`~`)에서 실행

**해결**: 
```bash
# 프로젝트 디렉토리로 이동
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
vercel
```

### 문제 3: "cd: no such file or directory: app"

**원인**: 홈 디렉토리에서 `cd app` 실행 (app 폴더가 홈 디렉토리에 없음)

**해결**: 
```bash
# 전체 경로로 이동
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
```

### 문제 4: 빌드 실패

**확인 사항**:
1. `package.json`이 있는지 확인
2. `npm install` 실행했는지 확인
3. 로컬에서 빌드 테스트:
   ```bash
   cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
   npm install
   npm run build
   ```

---

## 배포 후 확인

1. **배포 URL 확인**
   - Vercel CLI가 배포 완료 후 URL을 표시합니다
   - 예: `https://whatdidwedotoday.vercel.app`

2. **환경 변수 설정 확인**
   - Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
   - 모든 환경 변수가 추가되었는지 확인

3. **사이트 동작 확인**
   - 배포 URL로 접속
   - 일기 생성/수정 기능 테스트
   - Firebase 연결 확인

---

## 다음 단계: Git 연동 (선택사항)

Git 연동을 원하시면:
1. [GIT_DEPLOYMENT_GUIDE.md](./GIT_DEPLOYMENT_GUIDE.md) 참조
2. Git 저장소 생성 및 연결
3. 이후 `git push` 시 자동 배포

---

**이제 올바른 디렉토리에서 `vercel` 명령어를 실행하세요!** 🚀
