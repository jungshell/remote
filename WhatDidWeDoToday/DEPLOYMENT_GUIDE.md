# 온라인 배포 가이드 (Vercel)

## 배포 방법

### 1. Vercel 계정 준비
1. [Vercel](https://vercel.com)에 가입/로그인
2. GitHub/GitLab/Bitbucket 계정 연결 (선택사항, Git 연동 시 자동 배포 가능)

### 2. 프로젝트 배포

#### 방법 A: Vercel CLI 사용 (권장)
```bash
cd app
npm install -g vercel
vercel login
vercel
```
- 첫 배포 시 질문에 답변:
  - "Set up and deploy?" → **Y**
  - "Which scope?" → 본인 계정 선택
  - "Link to existing project?" → **N** (처음이면)
  - "What's your project's name?" → 원하는 이름 (예: `whatdidwedotoday`)
  - "In which directory is your code located?" → **./** (app 폴더에서 실행 중이면)
  - "Want to override the settings?" → **N** (기본값 사용)

#### 방법 B: Vercel 웹 대시보드 사용
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "Add New..." → "Project" 클릭
3. Git 저장소 연결 (또는 "Import Git Repository" 없이 "Deploy" 클릭)
4. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `app` (프로젝트 루트가 아니라 app 폴더)
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `.next` (기본값)
   - **Install Command**: `npm install` (기본값)

### 3. 환경 변수 설정

Vercel 대시보드에서 프로젝트 → Settings → Environment Variables에 아래 변수들을 모두 추가:

#### 필수 환경 변수

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

**배포 URL (자동 생성되지만 명시 가능)**
```
NEXT_PUBLIC_BASE_URL=https://your-project.vercel.app
```

#### 선택 환경 변수
```
HUGGINGFACE_API_KEY=YOUR_HUGGINGFACE_API_KEY
NANOBANANA_CALLBACK_URL=https://your-project.vercel.app/api/nanobanana-callback
GEMINI_MODEL=gemini-2.5-flash
GROQ_MODEL=llama-3.1-8b-instant
```

**중요**: 
- `FIREBASE_SERVICE_ACCOUNT`는 JSON 전체를 한 줄로 붙여넣기 (줄바꿈 없이)
- Vercel에서 환경 변수 추가 시 **Production, Preview, Development** 모두에 체크

### 4. 배포 확인

배포 완료 후:
1. Vercel이 제공하는 URL로 접속 (예: `https://whatdidwedotoday.vercel.app`)
2. 일기 생성/수정 기능 테스트
3. 4컷 이미지 생성 테스트 (나노바나나 크레딧 충전 후)

### 5. 커스텀 도메인 (선택)

Vercel 대시보드 → 프로젝트 → Settings → Domains에서 도메인 추가 가능

---

## 배포 후 확인 사항

### ✅ 체크리스트
- [ ] 환경 변수 모두 설정됨
- [ ] 빌드 성공 (Vercel 대시보드에서 확인)
- [ ] Firebase 연결 정상 (일기 목록 로드 확인)
- [ ] 일기 생성/수정 동작 확인
- [ ] 4컷 이미지 생성 동작 확인 (나노바나나 크레딧 충전 후)
- [ ] PDF 내보내기 동작 확인

### 🔧 문제 해결

**빌드 실패**
- Vercel 대시보드 → Deployments → 실패한 배포 클릭 → 로그 확인
- 환경 변수 누락 확인

**환경 변수 오류**
- `FIREBASE_SERVICE_ACCOUNT`는 JSON 전체를 한 줄로 (줄바꿈 없이)
- 따옴표 이스케이프 확인 (`"` → `\"`)

**이미지가 안 나옴**
- `next.config.ts`에 이미지 도메인 추가 확인
- Storage 버킷 권한 확인 (Public 읽기)

**API 호출 실패**
- Vercel 서버리스 함수 타임아웃 확인 (기본 10초, Pro는 60초)
- 나노바나나 API는 폴링이 최대 2분이므로 타임아웃 설정 필요할 수 있음

---

## Vercel 타임아웃 설정 (나노바나나 폴링용)

나노바나나 API는 폴링 방식(최대 2분)이므로, Vercel 무료 플랜(10초 타임아웃)에서는 타임아웃이 발생할 수 있습니다.

**해결 방법**:
1. **Vercel Pro 플랜** 사용 (60초 타임아웃, 월 $20)
2. 또는 **별도 서버**에서 나노바나나 폴링 후 결과를 Vercel API로 전달하는 구조로 변경

현재는 나노바나나 폴링이 2분까지 걸릴 수 있어, Vercel 무료 플랜에서는 타임아웃 가능성이 있습니다.

---

## 자동 배포 설정 (Git 연동)

Git 저장소와 연동하면 코드 푸시 시 자동 배포됩니다.

**📖 상세 가이드**: [GIT_DEPLOYMENT_GUIDE.md](./GIT_DEPLOYMENT_GUIDE.md) 참조

### 빠른 요약

1. **Git 저장소 생성** (GitHub/GitLab/Bitbucket)
   - GitHub: https://github.com → 새 저장소 생성
   - GitLab: https://gitlab.com → 새 프로젝트 생성
   - Bitbucket: https://bitbucket.org → 새 저장소 생성

2. **로컬 프로젝트를 Git에 연결**
   ```bash
   cd "/Volumes/Samsung USB/WhatDidWeDoToday"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/whatdidwedotoday.git
   git branch -M main
   git push -u origin main
   ```

3. **Vercel에서 Git 저장소 연결**
   - Vercel 대시보드 → Add New... → Project
   - Import Git Repository → 저장소 선택
   - Root Directory: `app` 설정
   - 환경 변수 추가 후 Deploy

4. **자동 배포 확인**
   - `git push origin main` 시 자동 배포 시작
   - Vercel 대시보드 → Deployments에서 확인

자세한 내용은 [GIT_DEPLOYMENT_GUIDE.md](./GIT_DEPLOYMENT_GUIDE.md)를 참조하세요.

---

## 배포 URL 확인

배포 완료 후 Vercel이 제공하는 URL:
- **Production**: `https://your-project.vercel.app`
- **Preview**: 각 브랜치/PR마다 고유 URL 생성

이 URL을 `NEXT_PUBLIC_BASE_URL` 환경 변수로 설정하면 공유 링크가 올바르게 동작합니다.

---

**배포 준비 완료!** 위 단계를 따라 진행하시면 됩니다.
