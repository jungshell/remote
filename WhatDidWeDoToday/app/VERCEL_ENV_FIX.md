# Vercel 환경 변수 수정 가이드

## 🔍 발견된 문제

1. **MONGODB_URI가 Production 환경에만 설정됨**
   - Preview, Development 환경에 설정되지 않음
   - 이로 인해 프리뷰 배포나 개발 환경에서 오류 발생 가능

2. **연결 문자열 형식 확인 필요**
   - 현재 Vercel에 설정된 MONGODB_URI의 전체 값 확인 필요
   - 데이터베이스 이름이 포함되어 있는지 확인

## ✅ 수정 방법

### 1. Vercel 대시보드에서 환경 변수 수정

1. https://vercel.com 접속
2. `wdwdt` 프로젝트 선택
3. **Settings** → **Environment Variables** 클릭

### 2. MONGODB_URI 수정

**기존 설정 확인:**
- 현재 Production에만 설정되어 있음

**수정 사항:**
1. `MONGODB_URI` 변수를 클릭하여 편집
2. **Environment** 섹션에서 다음을 모두 선택:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
3. **Value** 확인:
   ```
   mongodb+srv://sti60val_db_user:xYp8IzoZW9OdFpEH@jungshell.nwedfye.mongodb.net/whatdidwedotoday?retryWrites=true&w=majority
   ```
   - 데이터베이스 이름(`/whatdidwedotoday`)이 포함되어 있는지 확인
   - 비밀번호가 올바른지 확인 (`xYp8IzoZW9OdFpEH`)
4. **Save** 클릭

### 3. MONGODB_DB_NAME 확인

1. `MONGODB_DB_NAME` 변수 확인
2. **Value**가 `whatdidwedotoday`인지 확인
3. **Environment**에서 다음을 모두 선택:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Save** 클릭

### 4. 환경 변수 수정 후 재배포

환경 변수를 수정했다면 **반드시 재배포**해야 합니다:

1. **Deployments** 탭으로 이동
2. 최신 배포 옆 "..." 메뉴 클릭
3. **"Redeploy"** 클릭
4. 또는 자동으로 재배포될 때까지 대기

## 🔧 연결 문자열 형식

올바른 MongoDB Atlas 연결 문자열 형식:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

예시:
```
mongodb+srv://sti60val_db_user:xYp8IzoZW9OdFpEH@jungshell.nwedfye.mongodb.net/whatdidwedotoday?retryWrites=true&w=majority
```

## ⚠️ 중요 사항

- 환경 변수 수정 후 **반드시 재배포**해야 변경사항이 적용됩니다
- 연결 문자열에 특수문자가 포함된 경우 URL 인코딩이 필요할 수 있습니다
- 비밀번호에 특수문자가 있으면 URL 인코딩이 필요합니다

## 🧪 확인 방법

재배포 후:
1. https://wdwdt.vercel.app 접속
2. 브라우저 콘솔에서 에러 확인
3. Vercel 로그에서 MongoDB 연결 성공 메시지 확인
