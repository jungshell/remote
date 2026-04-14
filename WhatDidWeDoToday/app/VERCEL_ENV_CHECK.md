# Vercel 환경 변수 확인 가이드

## 🔍 현재 문제
SSL 에러 (`SSL alert number 80`)가 발생하고 있습니다. 이는 MongoDB 연결 시 발생하는 문제일 수 있습니다.

## ✅ 확인 사항

### 1. Vercel 환경 변수 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com 접속
   - `wdwdt` 프로젝트 선택
   - Settings → Environment Variables 클릭

2. **필수 환경 변수 확인**
   다음 변수들이 **모두** 설정되어 있어야 합니다:
   
   - `MONGODB_URI`
     - Value: `mongodb+srv://sti60val_db_user:xYp8IzoZW9OdFpEH@jungshell.nwedfye.mongodb.net/whatdidwedotoday?retryWrites=true&w=majority`
     - Environment: **Production, Preview, Development 모두 선택**
   
   - `MONGODB_DB_NAME`
     - Value: `whatdidwedotoday`
     - Environment: **Production, Preview, Development 모두 선택**

3. **환경 변수가 없다면 추가**
   - "Add New" 버튼 클릭
   - Key와 Value 입력
   - Environment는 모두 선택
   - Save 클릭

4. **환경 변수 수정 후 재배포**
   - 환경 변수를 추가/수정했다면 **반드시 재배포**해야 합니다
   - Deployments 탭에서 "Redeploy" 클릭
   - 또는 자동으로 재배포될 때까지 대기

### 2. MongoDB Atlas Network Access 확인

1. **MongoDB Atlas 대시보드 접속**
   - https://cloud.mongodb.com 접속
   - 프로젝트 선택

2. **Network Access 확인**
   - 왼쪽 메뉴에서 "Network Access" 클릭
   - IP 주소 목록 확인
   - **"0.0.0.0/0" (Allow Access from Anywhere)** 가 있어야 합니다
   - 없다면 "Add IP Address" → "Allow Access from Anywhere" 선택

### 3. MongoDB Atlas Database Access 확인

1. **Database Access 확인**
   - 왼쪽 메뉴에서 "Database Access" 클릭
   - 사용자 `sti60val_db_user`가 있는지 확인
   - 비밀번호가 올바른지 확인

## 🚀 재배포 방법

환경 변수를 수정했다면:

```bash
cd app
vercel --prod
```

또는 Vercel 대시보드에서:
- Deployments 탭
- 최신 배포 옆 "..." 메뉴
- "Redeploy" 클릭

## 📝 체크리스트

- [ ] Vercel에 `MONGODB_URI` 환경 변수 설정됨
- [ ] Vercel에 `MONGODB_DB_NAME` 환경 변수 설정됨
- [ ] 환경 변수의 Environment가 모두 선택됨
- [ ] MongoDB Atlas Network Access에 0.0.0.0/0 추가됨
- [ ] MongoDB Atlas Database Access에 사용자 생성됨
- [ ] 환경 변수 수정 후 재배포 완료
