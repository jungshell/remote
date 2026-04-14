# 배포할 때 할 일 (Vercel 기준)

나중에 배포할 때 이 파일만 열어서 따라 하시면 됩니다.

---

## 1. Vercel에 프로젝트 배포

- 저장소(GitHub 등) 연결 후 배포
- 빌드/출력 설정은 Next.js 기본값 그대로 사용

---

## 2. Vercel 환경 변수 추가

- Vercel 대시보드 → 해당 프로젝트 → **Settings** → **Environment Variables**
- 다음 변수 추가:
  - **Name**: `FIREBASE_SERVICE_ACCOUNT_JSON`
  - **Value**: `.env.local`에 넣어 둔 값과 동일하게 (한 줄 JSON 전체)
- 저장 후 **재배포** 한 번 실행 (Redeploy)

---

## 3. Firebase 승인된 도메인 추가

- **Firebase 콘솔** → [Authentication](https://console.firebase.google.com/project/schedule-checker-b0eb7/authentication/settings) → **Settings** → **Authorized domains**
- **Add domain** 클릭 후 배포된 주소 입력  
  예: `your-app.vercel.app` (앞에 `https://` 없이 도메인만)

---

위 세 가지만 하면 배포 완료입니다. 자세한 설명은 `DEPLOYMENT-AND-MANUAL-TASKS.md`를 참고하세요.
