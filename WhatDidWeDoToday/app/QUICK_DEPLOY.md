# 빠른 배포 가이드

## 🚀 배포 방법 (3가지 중 선택)

### 방법 1: Vercel 대시보드에서 수동 배포 (가장 쉬움)

1. **Vercel 대시보드 접속**
   - https://vercel.com 접속
   - 프로젝트 `wdwdt` 선택

2. **환경 변수 설정 (필수!)**
   - Settings → Environment Variables
   - 다음 변수 추가:
     - `MONGODB_URI`: `mongodb+srv://sti60val_db_user:xYp8IzoZW9OdFpEH@jungshell.nwedfye.mongodb.net/whatdidwedotoday?retryWrites=true&w=majority`
     - `MONGODB_DB_NAME`: `whatdidwedotoday`

3. **수동 배포**
   - Deployments 탭 → "Redeploy" 클릭
   - 또는 Git 저장소에 연결되어 있다면 자동 배포됨

### 방법 2: Vercel CLI로 배포

```bash
cd app
npx vercel --prod
```

### 방법 3: Git 푸시 (자동 배포)

Git 저장소가 Vercel과 연결되어 있다면:
```bash
cd app
git remote add origin <your-git-repo-url>
git push origin main
```

## ⚠️ 중요: 환경 변수 설정 필수!

환경 변수를 설정하지 않으면 MongoDB 연결이 실패합니다!

## ✅ 배포 확인

배포 완료 후:
- https://wdwdt.vercel.app 접속
- 페이지가 정상적으로 로드되는지 확인
