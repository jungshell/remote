# Git 연동 자동 배포 가이드

Git 저장소와 Vercel을 연동하면 코드를 푸시할 때마다 자동으로 배포됩니다. 이 가이드는 처음부터 끝까지 단계별로 설명합니다.

---

## 📋 목차

1. [Git 저장소 준비](#1-git-저장소-준비)
2. [로컬 프로젝트를 Git에 연결](#2-로컬-프로젝트를-git에-연결)
3. [Vercel에서 Git 저장소 연결](#3-vercel에서-git-저장소-연결)
4. [자동 배포 확인](#4-자동-배포-확인)
5. [문제 해결](#5-문제-해결)

---

## 1. Git 저장소 준비

### 1-1. GitHub 사용 (가장 일반적)

#### Step 1: GitHub 계정 준비
1. [GitHub](https://github.com) 접속
2. 계정이 없으면 **Sign up** 클릭하여 가입
3. 계정이 있으면 **Sign in** 클릭하여 로그인

#### Step 2: 새 저장소 생성
1. GitHub 로그인 후 우측 상단 **+** 버튼 클릭 → **New repository** 선택
2. 저장소 설정:
   - **Repository name**: `whatdidwedotoday` (원하는 이름)
   - **Description**: "우리가족 일기 자동생성 앱" (선택사항)
   - **Public** 또는 **Private** 선택 (Private 권장, 개인 프로젝트)
   - **Initialize this repository with**: 체크하지 않음 (로컬에 이미 코드가 있으므로)
3. **Create repository** 클릭

#### Step 3: 저장소 URL 복사
생성된 페이지에서 **HTTPS** URL을 복사합니다:
```
https://github.com/your-username/whatdidwedotoday.git
```
(예: `https://github.com/sunginjung/whatdidwedotoday.git`)

---

### 1-2. GitLab 사용

#### Step 1: GitLab 계정 준비
1. [GitLab](https://gitlab.com) 접속
2. 계정이 없으면 **Sign up** 클릭하여 가입
3. 계정이 있으면 **Sign in** 클릭하여 로그인

#### Step 2: 새 프로젝트 생성
1. GitLab 로그인 후 우측 상단 **+** 버튼 클릭 → **New project/repository** 선택
2. **Create blank project** 선택
3. 프로젝트 설정:
   - **Project name**: `whatdidwedotoday`
   - **Project slug**: 자동 생성됨
   - **Visibility Level**: **Private** (개인 프로젝트 권장)
   - **Initialize repository with a README**: 체크하지 않음
4. **Create project** 클릭

#### Step 3: 저장소 URL 복사
생성된 페이지에서 **Clone** 버튼 클릭 → **Clone with HTTPS** URL 복사:
```
https://gitlab.com/your-username/whatdidwedotoday.git
```

---

### 1-3. Bitbucket 사용

#### Step 1: Bitbucket 계정 준비
1. [Bitbucket](https://bitbucket.org) 접속
2. 계정이 없으면 **Get started for free** 클릭하여 가입
3. 계정이 있으면 **Log in** 클릭하여 로그인

#### Step 2: 새 저장소 생성
1. Bitbucket 로그인 후 좌측 **+** 버튼 클릭 → **Repository** 선택
2. 저장소 설정:
   - **Repository name**: `whatdidwedotoday`
   - **Access level**: **Private** (권장)
   - **Include a README?**: 체크하지 않음
   - **Include .gitignore?**: 체크하지 않음 (이미 있음)
3. **Create repository** 클릭

#### Step 3: 저장소 URL 복사
생성된 페이지에서 **Clone** 버튼 클릭 → **HTTPS** URL 복사:
```
https://bitbucket.org/your-username/whatdidwedotoday.git
```

---

## 2. 로컬 프로젝트를 Git에 연결

터미널에서 프로젝트 폴더로 이동한 후 아래 명령어를 실행합니다.

### 2-1. Git 초기화 (처음 한 번만)

```bash
# 프로젝트 루트로 이동 (app 폴더가 아니라 그 상위 폴더)
cd "/Volumes/Samsung USB/WhatDidWeDoToday"

# Git 저장소 초기화
git init

# 현재 상태 확인
git status
```

### 2-2. 파일 추가 및 첫 커밋

```bash
# 모든 파일 추가 (단, .gitignore에 있는 파일은 제외됨)
git add .

# 첫 커밋 생성
git commit -m "Initial commit: 우리가족 일기 앱"

# 원격 저장소 연결 (위에서 복사한 URL 사용)
git remote add origin https://github.com/your-username/whatdidwedotoday.git

# 기본 브랜치 이름을 main으로 설정
git branch -M main

# 원격 저장소에 푸시
git push -u origin main
```

**중요**: 
- `your-username`을 본인의 GitHub/GitLab/Bitbucket 사용자명으로 변경하세요
- 첫 푸시 시 GitHub/GitLab/Bitbucket 로그인 창이 뜰 수 있습니다

### 2-3. 인증 문제 해결

#### GitHub
- **Personal Access Token** 사용 (권장):
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. **Generate new token (classic)** 클릭
  3. **Note**: "Vercel Deploy" (설명)
  4. **Expiration**: 원하는 기간 선택
  5. **Scopes**: `repo` 체크
  6. **Generate token** 클릭 → 토큰 복사 (한 번만 보임!)
  7. 푸시 시 비밀번호 대신 이 토큰 사용

- 또는 **GitHub Desktop** 사용 (GUI 방식)

#### GitLab
- Personal Access Token 사용:
  1. GitLab → User Settings → Access Tokens
  2. **Token name**: "Vercel Deploy"
  3. **Scopes**: `write_repository` 체크
  4. **Create personal access token** 클릭 → 토큰 복사
  5. 푸시 시 비밀번호 대신 이 토큰 사용

#### Bitbucket
- App Password 사용:
  1. Bitbucket → Personal settings → App passwords
  2. **Create app password** 클릭
  3. **Label**: "Vercel Deploy"
  4. **Permissions**: `Repositories: Write` 체크
  5. **Create** 클릭 → 비밀번호 복사
  6. 푸시 시 비밀번호 대신 이 App Password 사용

---

## 3. Vercel에서 Git 저장소 연결

### 3-1. Vercel 계정 준비
1. [Vercel](https://vercel.com) 접속
2. **Sign Up** 또는 **Log In** 클릭

### 3-2. Git 계정 연결 (처음 한 번만)

#### 방법 A: Vercel 대시보드에서 연결
1. Vercel 대시보드 접속
2. 우측 상단 프로필 아이콘 클릭 → **Settings**
3. 좌측 메뉴에서 **Git** 클릭
4. 사용하는 Git 서비스 선택:
   - **GitHub** → **Connect** 클릭 → GitHub 로그인 및 권한 승인
   - **GitLab** → **Connect** 클릭 → GitLab 로그인 및 권한 승인
   - **Bitbucket** → **Connect** 클릭 → Bitbucket 로그인 및 권한 승인

#### 방법 B: 프로젝트 생성 시 연결
1. Vercel 대시보드 → **Add New...** → **Project** 클릭
2. **Import Git Repository** 섹션에서 Git 서비스 선택
3. 로그인 및 권한 승인

### 3-3. 프로젝트 배포 (Git 연동)

#### Step 1: 프로젝트 가져오기
1. Vercel 대시보드 → **Add New...** → **Project** 클릭
2. **Import Git Repository** 섹션에서 방금 만든 저장소 선택:
   - `whatdidwedotoday` (또는 본인이 만든 이름)
3. **Import** 클릭

#### Step 2: 프로젝트 설정
Vercel이 자동으로 Next.js를 감지하지만, 다음 설정을 확인/수정하세요:

- **Framework Preset**: `Next.js` (자동 감지됨)
- **Root Directory**: `app` ⚠️ **중요**: 프로젝트 루트가 아니라 `app` 폴더
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Install Command**: `npm install` (기본값)

**Root Directory 설정 방법**:
1. **Root Directory** 옆 **Edit** 클릭
2. `app` 입력
3. **Continue** 클릭

#### Step 3: 환경 변수 설정
**⚠️ 중요**: 이 단계는 필수입니다!

1. **Environment Variables** 섹션에서 **Add** 클릭
2. 아래 환경 변수들을 하나씩 추가:

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

**중요 사항**:
- 각 환경 변수 추가 시 **Production**, **Preview**, **Development** 모두 체크
- `FIREBASE_SERVICE_ACCOUNT`는 JSON 전체를 **한 줄로** 붙여넣기 (줄바꿈 없이)
- 따옴표 이스케이프: `"` → `\"`

#### Step 4: 배포 시작
1. 모든 환경 변수 추가 완료 후 **Deploy** 클릭
2. Vercel이 자동으로 빌드 시작 (약 2-3분 소요)
3. 빌드 완료 후 배포 URL 확인:
   - `https://whatdidwedotoday.vercel.app` (또는 본인이 설정한 이름)

---

## 4. 자동 배포 확인

### 4-1. 자동 배포 작동 원리

Git 저장소와 연동되면:
- **main/master 브랜치에 푸시** → **Production 배포** (실제 서비스)
- **다른 브랜치에 푸시** → **Preview 배포** (테스트용, 고유 URL 생성)
- **Pull Request 생성** → **Preview 배포** (PR마다 고유 URL)

### 4-2. 테스트: 코드 변경 후 자동 배포

```bash
# 프로젝트 폴더로 이동
cd "/Volumes/Samsung USB/WhatDidWeDoToday"

# 간단한 변경 (예: README 수정)
echo "# 우리가족 일기 앱" > README.md

# 변경사항 추가
git add README.md

# 커밋
git commit -m "Update README"

# 푸시 (자동 배포 트리거!)
git push origin main
```

**확인 방법**:
1. Vercel 대시보드 → 프로젝트 → **Deployments** 탭
2. 새로운 배포가 자동으로 시작됨을 확인
3. 배포 완료까지 대기 (약 2-3분)
4. 배포 완료 후 새 버전이 자동으로 반영됨

### 4-3. 배포 상태 확인

Vercel 대시보드에서:
- **Deployments** 탭: 모든 배포 이력 확인
- 각 배포 클릭: 빌드 로그, 환경 변수, 도메인 등 상세 정보
- **Building** → **Ready**: 배포 완료
- **Error**: 빌드 실패 시 로그 확인

---

## 5. 문제 해결

### 5-1. Git 푸시 실패

**문제**: `git push` 시 인증 오류

**해결**:
```bash
# 원격 저장소 URL 확인
git remote -v

# HTTPS URL로 변경 (필요 시)
git remote set-url origin https://github.com/your-username/whatdidwedotoday.git

# Personal Access Token 사용 (비밀번호 대신)
git push origin main
```

### 5-2. Vercel에서 저장소를 찾을 수 없음

**문제**: Vercel에서 저장소가 보이지 않음

**해결**:
1. Vercel → Settings → Git → 저장소 연결 확인
2. GitHub/GitLab/Bitbucket에서 Vercel 앱 권한 확인
3. 저장소가 Private인 경우, Vercel에 권한 부여 확인

### 5-3. 빌드 실패

**문제**: Vercel 배포 시 빌드 실패

**해결**:
1. Vercel 대시보드 → 실패한 배포 클릭 → **Logs** 탭 확인
2. 일반적인 원인:
   - 환경 변수 누락
   - `Root Directory` 설정 오류 (`app` 폴더로 설정했는지 확인)
   - `package.json` 또는 의존성 문제
3. 로컬에서 테스트:
   ```bash
   cd app
   npm install
   npm run build
   ```

### 5-4. 환경 변수 오류

**문제**: 환경 변수가 제대로 적용되지 않음

**해결**:
1. Vercel → 프로젝트 → Settings → Environment Variables 확인
2. **Production**, **Preview**, **Development** 모두 체크했는지 확인
3. `FIREBASE_SERVICE_ACCOUNT`는 한 줄로 입력 (줄바꿈 없이)
4. 환경 변수 변경 후 **Redeploy** 필요

### 5-5. Root Directory 설정 오류

**문제**: 빌드는 성공하지만 페이지가 제대로 로드되지 않음

**해결**:
1. Vercel → 프로젝트 → Settings → General
2. **Root Directory** 확인: `app`으로 설정되어 있어야 함
3. 변경 후 **Redeploy** 필요

---

## 6. 추가 팁

### 6-1. 브랜치별 배포

- **main 브랜치**: Production 배포
- **develop 브랜치**: Preview 배포 (테스트용)
- **feature/xxx 브랜치**: Preview 배포 (기능 개발용)

각 브랜치마다 고유한 URL이 생성됩니다.

### 6-2. Pull Request 미리보기

GitHub/GitLab에서 Pull Request 생성 시:
- Vercel이 자동으로 Preview 배포 생성
- PR에 배포 URL이 자동으로 댓글로 추가됨
- PR 머지 전에 미리 테스트 가능

### 6-3. 커밋 메시지로 배포 제어

Vercel은 기본적으로 모든 푸시를 배포하지만, 특정 커밋 메시지로 건너뛸 수 있습니다:
- `[skip ci]` 또는 `[vercel skip]` 포함 시 배포 건너뜀

### 6-4. 배포 알림 설정

Vercel → 프로젝트 → Settings → Notifications:
- 이메일 알림 설정
- Slack/Discord 웹훅 연동 가능

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Git 저장소 생성 완료 (GitHub/GitLab/Bitbucket)
- [ ] 로컬 프로젝트를 Git에 연결 및 첫 푸시 완료
- [ ] Vercel에서 Git 계정 연결 완료
- [ ] Vercel에서 프로젝트 가져오기 완료
- [ ] Root Directory를 `app`으로 설정
- [ ] 모든 환경 변수 추가 완료 (Production, Preview, Development 모두 체크)
- [ ] 첫 배포 성공 확인
- [ ] 코드 변경 후 자동 배포 테스트 완료

---

**이제 Git에 푸시할 때마다 자동으로 배포됩니다!** 🚀

추가 질문이 있으면 언제든지 물어보세요.
