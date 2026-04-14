# MongoDB 환경 변수 설정 가이드

## ✅ 완료된 작업
- MongoDB Atlas 클러스터 생성 완료
- 데이터베이스 사용자 생성 완료 (username: `sti60val_db_user`)
- 연결 문자열 받기 완료

## 🔧 환경 변수 설정

### 1. `.env.local` 파일 수정

프로젝트의 `app/.env.local` 파일을 열고, 다음을 확인하세요:

```bash
# MongoDB Atlas 연결
MONGODB_URI=mongodb+srv://sti60val_db_user:<db_password>@jungshell.nwedfye.mongodb.net/?appName=jungshell
MONGODB_DB_NAME=whatdidwedotoday
```

### 2. ⚠️ 중요: 비밀번호 교체

`<db_password>`를 실제 데이터베이스 사용자 비밀번호로 교체하세요!

예시:
```bash
MONGODB_URI=mongodb+srv://sti60val_db_user:MySecurePassword123!@jungshell.nwedfye.mongodb.net/?appName=jungshell
```

### 3. 의존성 설치

```bash
cd app
npm install
```

### 4. 로컬 테스트

```bash
npm run dev
```

브라우저에서 http://localhost:3005 접속하여 테스트하세요.

## 🚀 Vercel 배포 설정

### 1. Vercel 대시보드 접속
- https://vercel.com 접속
- 프로젝트 선택

### 2. 환경 변수 추가
1. Settings → Environment Variables 클릭
2. 다음 변수 추가:

**변수 1:**
- Key: `MONGODB_URI`
- Value: `mongodb+srv://sti60val_db_user:실제비밀번호@jungshell.nwedfye.mongodb.net/?appName=jungshell`
- Environment: Production, Preview, Development 모두 선택

**변수 2:**
- Key: `MONGODB_DB_NAME`
- Value: `whatdidwedotoday`
- Environment: Production, Preview, Development 모두 선택

### 3. 배포
```bash
git add .
git commit -m "feat: MongoDB Atlas 연결 설정"
git push
```

Vercel이 자동으로 배포합니다.

## 🧪 테스트 체크리스트

- [ ] `.env.local`에 `MONGODB_URI` 설정 (비밀번호 교체 완료)
- [ ] `npm install` 실행 완료
- [ ] `npm run dev` 실행 성공
- [ ] 브라우저에서 일기 작성/조회 테스트
- [ ] Vercel 환경 변수 설정 완료
- [ ] 배포 완료

## ❓ 문제 해결

### 연결 오류
```
MongoServerError: Authentication failed
```
→ 비밀번호가 올바른지 확인하세요.

### 네트워크 오류
```
MongoServerSelectionError: getaddrinfo ENOTFOUND
```
→ Network Access에서 IP 주소가 허용되었는지 확인하세요.
