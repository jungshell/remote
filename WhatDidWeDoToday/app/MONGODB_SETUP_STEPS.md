# MongoDB Atlas 연결 설정 단계별 가이드

## 현재 상태
✅ 클러스터 "jungshell" 생성 완료
✅ 무료 티어 (FREE)
✅ 서울 리전 (AWS / Seoul)
✅ 준비 완료 상태

## 다음 단계

### 1단계: 연결 문자열 가져오기

1. **"Connect" 버튼 클릭**
   - 클러스터 카드에서 "Connect" 버튼을 클릭하세요

2. **연결 방법 선택**
   - "Connect your application" 선택

3. **드라이버 및 버전 선택**
   - Driver: **Node.js**
   - Version: **6.0 or later** (또는 최신 버전)

4. **연결 문자열 복사**
   - 표시된 연결 문자열을 복사하세요
   - 예시: `mongodb+srv://<username>:<password>@jungshell.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - ⚠️ **중요**: `<username>`과 `<password>`를 실제 값으로 교체해야 합니다!

### 2단계: 데이터베이스 사용자 생성 (아직 안 했다면)

1. 왼쪽 사이드바에서 **"Database Access"** 클릭
2. **"Add New Database User"** 클릭
3. 설정:
   - Authentication Method: **Password**
   - Username: 원하는 사용자 이름 (예: `whatdidwedotoday`)
   - Password: 강력한 비밀번호 생성 (기억해두세요!)
   - Database User Privileges: **Atlas admin** 선택
4. **"Add User"** 클릭

### 3단계: 네트워크 접근 설정

1. 왼쪽 사이드바에서 **"Network Access"** 클릭
2. **"Add IP Address"** 클릭
3. 옵션 선택:
   - **개발 환경**: "Allow Access from Anywhere" 선택 (0.0.0.0/0)
   - **프로덕션**: Vercel IP 범위 추가 (나중에 설정 가능)
4. **"Confirm"** 클릭

### 4단계: 연결 문자열 완성

연결 문자열에서:
- `<username>` → 2단계에서 만든 사용자 이름
- `<password>` → 2단계에서 만든 비밀번호

예시:
```
mongodb+srv://whatdidwedotoday:yourpassword@jungshell.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 5단계: 로컬 환경 변수 설정

프로젝트 루트의 `.env.local` 파일에 추가:

```bash
# MongoDB Atlas 연결
MONGODB_URI=mongodb+srv://username:password@jungshell.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=whatdidwedotoday

# Firebase Storage는 그대로 유지
FIREBASE_SERVICE_ACCOUNT={...}
FIREBASE_STORAGE_BUCKET=...
```

### 6단계: 의존성 설치

```bash
cd app
npm install
```

### 7단계: 로컬 테스트

```bash
npm run dev
```

브라우저에서 http://localhost:3005 접속하여 테스트

### 8단계: Vercel 환경 변수 설정

1. Vercel 대시보드 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 다음 변수 추가:
   - `MONGODB_URI`: 위에서 만든 연결 문자열
   - `MONGODB_DB_NAME`: `whatdidwedotoday`

### 9단계: 데이터 마이그레이션 (선택사항)

기존 Firebase 데이터를 MongoDB로 옮기려면:

```bash
npm run migrate:firebase-to-mongodb
```

### 10단계: 배포

```bash
git add .
git commit -m "feat: MongoDB Atlas 연결 설정"
git push
```

Vercel이 자동으로 배포합니다.

## 문제 해결

### 연결 오류가 발생하면?

1. **인증 오류**: Database Access에서 사용자 이름/비밀번호 확인
2. **네트워크 오류**: Network Access에서 IP 주소 허용 확인
3. **타임아웃**: 클러스터가 실행 중인지 확인

## 다음 확인 사항

✅ 연결 문자열 복사 완료
✅ 환경 변수 설정 완료
✅ 로컬 테스트 성공
✅ Vercel 배포 완료
