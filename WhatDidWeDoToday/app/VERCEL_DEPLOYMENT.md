# Vercel 배포 가이드

## ✅ 완료된 작업
- ✅ 코드 변경사항 커밋 완료
- ✅ MongoDB Atlas 연결 설정 완료

## 🚀 Vercel 배포 전 필수 작업

### 1. Vercel 환경 변수 설정 (중요!)

배포 전에 **반드시** Vercel에 MongoDB 연결 정보를 추가해야 합니다.

#### Vercel 대시보드에서 설정:

1. https://vercel.com 접속
2. 프로젝트 `wdwdt` 선택
3. **Settings** → **Environment Variables** 클릭
4. 다음 변수들을 추가:

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

### 2. Git 푸시

```bash
git push
```

### 3. 배포 확인

1. Vercel 대시보드에서 **Deployments** 탭 확인
2. 최신 배포가 성공하는지 확인
3. https://wdwdt.vercel.app 접속하여 테스트

## 🧪 배포 후 테스트

1. **일기 목록 확인**
   - 페이지가 정상적으로 로드되는지 확인
   - "일기 목록을 불러오는 중..." 메시지가 사라지는지 확인

2. **새 일기 작성 테스트**
   - 일기 작성 기능 테스트
   - MongoDB Atlas에서 데이터 확인

3. **MongoDB Atlas에서 확인**
   - MongoDB Atlas 대시보드 → "Database" → "Browse Collections"
   - `whatdidwedotoday` 데이터베이스 확인
   - `diaries` 컬렉션에 데이터가 있는지 확인

## ⚠️ 주의사항

- 환경 변수 설정을 하지 않으면 배포가 실패하거나 MongoDB 연결 오류가 발생합니다.
- 환경 변수 설정 후 배포가 자동으로 트리거됩니다.

## 🔗 참고

- MongoDB Atlas 연결 문자열: `.env.local` 파일 참조
- 배포 상태: Vercel 대시보드에서 확인
