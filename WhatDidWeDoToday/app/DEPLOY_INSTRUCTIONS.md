# Vercel 배포 완료 가이드

## ✅ 완료된 작업
- ✅ 코드 변경사항 커밋 완료
- ✅ MongoDB Atlas 연결 설정 완료

## 🚀 Vercel 배포 전 필수 작업

### ⚠️ 중요: Vercel 환경 변수 설정

배포 전에 **반드시** Vercel에 MongoDB 연결 정보를 추가해야 합니다!

#### 1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 프로젝트 `wdwdt` 선택

#### 2. 환경 변수 추가
1. **Settings** → **Environment Variables** 클릭
2. 다음 변수들을 추가:

**변수 1: MONGODB_URI**
- Key: `MONGODB_URI`
- Value: `mongodb+srv://sti60val_db_user:xYp8IzoZW9OdFpEH@jungshell.nwedfye.mongodb.net/whatdidwedotoday?retryWrites=true&w=majority`
- Environment: ✅ Production, ✅ Preview, ✅ Development 모두 선택
- **Save** 클릭

**변수 2: MONGODB_DB_NAME**
- Key: `MONGODB_DB_NAME`
- Value: `whatdidwedotoday`
- Environment: ✅ Production, ✅ Preview, ✅ Development 모두 선택
- **Save** 클릭

#### 3. Git 푸시 (또는 Vercel에서 직접 배포)

**옵션 A: Git 푸시 (자동 배포)**
```bash
cd app
git remote add origin <your-git-repo-url>  # 아직 설정 안 했다면
git push origin main
```

**옵션 B: Vercel CLI로 배포**
```bash
cd app
vercel --prod
```

**옵션 C: Vercel 대시보드에서 수동 배포**
1. Vercel 대시보드 → **Deployments**
2. **Redeploy** 클릭

## 🧪 배포 후 확인

1. **배포 상태 확인**
   - Vercel 대시보드 → **Deployments** 탭
   - 최신 배포가 성공하는지 확인

2. **웹사이트 테스트**
   - https://wdwdt.vercel.app 접속
   - 페이지가 정상적으로 로드되는지 확인
   - "일기 목록을 불러오는 중..." 메시지 확인

3. **MongoDB 연결 확인**
   - 일기 작성 기능 테스트
   - MongoDB Atlas 대시보드 → "Database" → "Browse Collections"
   - `whatdidwedotoday` → `diaries` 컬렉션 확인

## ⚠️ 문제 해결

### 배포 실패 시
- 환경 변수가 올바르게 설정되었는지 확인
- MongoDB Atlas Network Access에서 Vercel IP 허용 확인

### MongoDB 연결 오류 시
- 환경 변수 `MONGODB_URI`가 올바른지 확인
- MongoDB Atlas 클러스터가 실행 중인지 확인

## 📝 다음 단계

환경 변수 설정 후 배포가 완료되면:
1. https://wdwdt.vercel.app 접속
2. 일기 작성/조회 테스트
3. MongoDB Atlas에서 데이터 확인
