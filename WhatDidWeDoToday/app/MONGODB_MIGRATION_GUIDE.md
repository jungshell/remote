# MongoDB Atlas 마이그레이션 가이드

## ✅ 완료된 작업

1. ✅ MongoDB 연결 설정 파일 생성 (`src/lib/mongodbAdmin.ts`)
2. ✅ 모든 API 라우트에서 `adminDb`를 MongoDB로 변경
3. ✅ Firebase Storage는 그대로 유지 (이미지/오디오 파일 저장용)
4. ✅ package.json에 `mongodb` 의존성 추가

## 📋 MongoDB Atlas 설정 단계

### 1. MongoDB Atlas 계정 생성 및 클러스터 생성

1. https://www.mongodb.com/cloud/atlas 접속
2. 무료 계정 생성 (Free Tier 선택)
3. "Build a Database" 클릭
4. **Free (M0) 플랜** 선택
5. 클라우드 제공자 및 리전 선택 (가장 가까운 리전 권장)
6. 클러스터 이름 설정 (예: `whatdidwedotoday`)
7. "Create" 클릭

### 2. 데이터베이스 사용자 생성

1. 왼쪽 메뉴에서 "Database Access" 클릭
2. "Add New Database User" 클릭
3. Authentication Method: "Password" 선택
4. Username과 Password 설정 (기억해두세요!)
5. Database User Privileges: "Atlas admin" 선택
6. "Add User" 클릭

### 3. 네트워크 접근 설정

1. 왼쪽 메뉴에서 "Network Access" 클릭
2. "Add IP Address" 클릭
3. "Allow Access from Anywhere" 선택 (또는 Vercel IP 범위 추가)
   - 개발 환경: `0.0.0.0/0` (모든 IP 허용)
   - 프로덕션: Vercel IP 범위 추가 권장
4. "Confirm" 클릭

### 4. 연결 문자열 가져오기

1. 왼쪽 메뉴에서 "Database" 클릭
2. 클러스터 이름 옆 "Connect" 버튼 클릭
3. "Connect your application" 선택
4. Driver: "Node.js", Version: "6.0 or later" 선택
5. 연결 문자열 복사 (예: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

### 5. 환경 변수 설정

#### 로컬 개발 환경 (`.env.local`)

```bash
# MongoDB Atlas 연결 문자열
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=whatdidwedotoday

# Firebase Storage는 그대로 유지
FIREBASE_SERVICE_ACCOUNT={...}
FIREBASE_STORAGE_BUCKET=...
```

#### Vercel 환경 변수 설정

1. Vercel 대시보드 접속
2. 프로젝트 선택 → Settings → Environment Variables
3. 다음 변수 추가:
   - `MONGODB_URI`: MongoDB Atlas 연결 문자열
   - `MONGODB_DB_NAME`: `whatdidwedotoday` (또는 원하는 DB 이름)

## 🔄 데이터 마이그레이션

### 옵션 1: 자동 마이그레이션 스크립트 (권장)

```bash
# 마이그레이션 스크립트 실행
npm run migrate:firebase-to-mongodb
```

### 옵션 2: 수동 마이그레이션

1. Firebase에서 데이터 백업:
   ```bash
   curl http://localhost:3005/api/backup > backup.json
   ```

2. MongoDB로 데이터 복원:
   ```bash
   curl -X POST http://localhost:3005/api/backup \
     -H "Content-Type: application/json" \
     -d @backup.json
   ```

## 🧪 테스트

### 1. 로컬 테스트

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3005 접속
# 일기 작성/조회 테스트
```

### 2. MongoDB Atlas에서 데이터 확인

1. MongoDB Atlas 대시보드 → "Database" → "Browse Collections"
2. `whatdidwedotoday` 데이터베이스 확인
3. `diaries` 및 `familyProfiles` 컬렉션 확인

## ⚠️ 주의사항

1. **Storage는 Firebase 유지**: 이미지와 오디오 파일은 여전히 Firebase Storage에 저장됩니다.
2. **ID 형식**: MongoDB는 UUID를 `_id`로 사용합니다 (Firebase와 호환).
3. **인덱스**: MongoDB는 자동으로 인덱스를 생성하지 않습니다. 필요시 수동으로 생성하세요.

## 🐛 문제 해결

### 연결 오류

```
MongoServerError: Authentication failed
```

**해결**: MongoDB Atlas의 Database Access에서 사용자 비밀번호 확인

### 네트워크 오류

```
MongoServerSelectionError: getaddrinfo ENOTFOUND
```

**해결**: Network Access에서 IP 주소 허용 확인

### 타임아웃 오류

```
MongoServerSelectionError: Server selection timed out
```

**해결**: 
- MongoDB Atlas 클러스터가 실행 중인지 확인
- 방화벽 설정 확인
- 연결 문자열 확인

## 📊 MongoDB Atlas 무료 티어 제한

- **저장 용량**: 512MB
- **읽기/쓰기**: 무제한 ✅
- **네트워크 전송**: 무제한 ✅
- **백업**: 자동 백업 포함

## 🚀 배포

1. Vercel에 환경 변수 추가 (위 참조)
2. Git에 커밋 및 푸시:
   ```bash
   git add .
   git commit -m "feat: MongoDB Atlas로 마이그레이션"
   git push
   ```
3. Vercel 자동 배포 확인

## 📝 다음 단계

1. ✅ MongoDB Atlas 클러스터 생성
2. ✅ 환경 변수 설정
3. ✅ 데이터 마이그레이션
4. ✅ 테스트
5. ✅ 배포

모든 준비가 완료되었습니다! 🎉
