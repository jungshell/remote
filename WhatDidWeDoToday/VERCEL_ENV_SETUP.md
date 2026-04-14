# Vercel 환경 변수 설정 가이드

## 🚨 현재 문제

빌드 오류: `FIREBASE_SERVICE_ACCOUNT env is missing`

**원인**: Vercel에 환경 변수가 설정되지 않았습니다.

---

## ✅ 해결 방법: 환경 변수 설정

### Step 1: Vercel 대시보드 접속

1. https://vercel.com/dashboard 접속
2. **wdwdt** 프로젝트 클릭
3. 상단 메뉴에서 **Settings** 클릭
4. 좌측 메뉴에서 **Environment Variables** 클릭

### Step 2: 환경 변수 추가

아래 환경 변수들을 **하나씩** 추가하세요.

#### ⚠️ 중요 사항
- 각 환경 변수 추가 시 **Production**, **Preview**, **Development** 모두 체크
- `FIREBASE_SERVICE_ACCOUNT`는 JSON 전체를 **한 줄로** 붙여넣기 (줄바꿈 없이)

---

## 📋 필수 환경 변수 목록

### 1. Firebase (클라이언트) - 6개

**NEXT_PUBLIC_FIREBASE_API_KEY**
```
YOUR_FIREBASE_WEB_API_KEY
```

**NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
```
wdwdt-d23c3.firebaseapp.com
```

**NEXT_PUBLIC_FIREBASE_PROJECT_ID**
```
wdwdt-d23c3
```

**NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
```
wdwdt-d23c3.firebasestorage.app
```

**NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
```
588672749389
```

**NEXT_PUBLIC_FIREBASE_APP_ID**
```
1:588672749389:web:02be1807d62a325a8df104
```

---

### 2. Firebase (서버) - 2개

**FIREBASE_SERVICE_ACCOUNT** ⚠️ **가장 중요!**

이 값은 Firebase 콘솔에서 서비스 계정 키 JSON 파일의 **전체 내용**을 한 줄로 붙여넣어야 합니다.

**형식 예시**:
```
{"type":"service_account","project_id":"wdwdt-d23c3","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**⚠️ 주의사항**:
- JSON 전체를 **한 줄로** 붙여넣기 (줄바꿈 없이)
- 따옴표 이스케이프: `"` → `\"` (필요 시)
- 로컬 `.env.local` 파일에서 복사하거나, Firebase 콘솔에서 새로 생성

**FIREBASE_STORAGE_BUCKET**
```
wdwdt-d23c3.firebasestorage.app
```

---

### 3. LLM API - 2개

**GEMINI_API_KEY**
```
YOUR_GEMINI_API_KEY
```

**GROQ_API_KEY**
```
YOUR_GROQ_API_KEY
```

---

### 4. 이미지 생성 - 1개

**NANOBANANA_API_KEY**
```
68788d631106cfa1d4b99f129678b8b3
```

---

## 🔧 환경 변수 추가 방법 (상세)

### Vercel 대시보드에서:

1. **Settings** → **Environment Variables** 클릭
2. **Add New** 버튼 클릭
3. **Key** 입력란에 변수명 입력 (예: `NEXT_PUBLIC_FIREBASE_API_KEY`)
4. **Value** 입력란에 값 입력
5. **Environment** 체크박스:
   - ✅ **Production** (필수)
   - ✅ **Preview** (권장)
   - ✅ **Development** (권장)
6. **Save** 클릭
7. 다음 환경 변수 추가를 위해 **Add New** 다시 클릭

### FIREBASE_SERVICE_ACCOUNT 특별 주의사항

1. 로컬 `.env.local` 파일에서 `FIREBASE_SERVICE_ACCOUNT` 값 복사
2. 또는 Firebase 콘솔에서 새 서비스 계정 키 생성:
   - Firebase 콘솔 → 프로젝트 설정 → 서비스 계정
   - **새 비공개 키 생성** 클릭
   - 다운로드된 JSON 파일 열기
   - 전체 내용을 **한 줄로** 복사 (줄바꿈 제거)
3. Vercel에 붙여넣기

**줄바꿈 제거 방법**:
- 텍스트 에디터에서 `\n` 또는 실제 줄바꿈을 공백으로 치환
- 또는 온라인 도구 사용 (JSON Minifier)

---

## ✅ 환경 변수 추가 후

### 1. 재배포 필요

환경 변수를 추가한 후에는 **재배포**가 필요합니다:

**방법 A: Vercel 대시보드에서**
1. **Deployments** 탭 클릭
2. 최신 배포 클릭
3. **Redeploy** 버튼 클릭

**방법 B: CLI에서**
```bash
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
vercel --prod
```

### 2. 배포 확인

배포가 성공하면:
- Vercel 대시보드 → **Deployments** → ✅ 성공 표시
- 배포 URL로 접속하여 사이트 동작 확인

---

## 🐛 문제 해결

### 문제 1: FIREBASE_SERVICE_ACCOUNT 오류가 계속 발생

**해결**:
1. JSON이 한 줄로 되어 있는지 확인
2. 따옴표 이스케이프 확인 (`"` → `\"`)
3. 환경 변수 추가 후 **재배포** 확인

### 문제 2: 환경 변수가 적용되지 않음

**해결**:
1. **Production**, **Preview**, **Development** 모두 체크했는지 확인
2. 환경 변수 추가 후 **재배포** 필요
3. Vercel 대시보드 → **Deployments** → 최신 배포 → **Redeploy**

### 문제 3: 로컬 .env.local 파일이 없음

**해결**:
1. Firebase 콘솔에서 서비스 계정 키 새로 생성
2. 다운로드한 JSON 파일 내용을 한 줄로 변환
3. Vercel에 추가

---

## 📝 체크리스트

환경 변수 설정 확인:

- [ ] NEXT_PUBLIC_FIREBASE_API_KEY 추가됨
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN 추가됨
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID 추가됨
- [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 추가됨
- [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID 추가됨
- [ ] NEXT_PUBLIC_FIREBASE_APP_ID 추가됨
- [ ] **FIREBASE_SERVICE_ACCOUNT 추가됨 (한 줄로)**
- [ ] FIREBASE_STORAGE_BUCKET 추가됨
- [ ] GEMINI_API_KEY 추가됨
- [ ] GROQ_API_KEY 추가됨
- [ ] NANOBANANA_API_KEY 추가됨
- [ ] 모든 환경 변수에 **Production, Preview, Development** 체크됨
- [ ] 환경 변수 추가 후 **재배포** 완료

---

**환경 변수를 모두 추가한 후 재배포하세요!** 🚀
