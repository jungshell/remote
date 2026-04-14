# Vercel Cron Jobs 설정 가이드

## 현재 상태 확인

1. **`vercel.json` 파일 확인** ✅
   - 이미 `/api/automation/daily-summary` 경로가 `0 9 * * *` (매일 09:00 UTC = 18:00 KST)로 설정되어 있습니다.

2. **Vercel 대시보드에서 확인**
   - 첫 번째 사진에서 보신 "Cron Jobs" 페이지에서:
     - **"Enabled" 토글이 켜져 있는지 확인** ✅ (이미 켜져 있음)
     - 배포 후 **아래쪽에 실제 Cron Job 목록**이 나타나는지 확인
     - 만약 목록이 보이지 않으면:
       - 프로젝트를 **한 번 더 배포** (Git push 또는 Vercel에서 "Redeploy")
       - 배포 완료 후 몇 분 기다린 뒤 새로고침

3. **배포 확인**
   - Vercel 대시보드 → **Deployments** 탭에서 최근 배포가 성공했는지 확인
   - 배포가 성공했다면 Cron Job이 자동으로 등록됩니다

4. **테스트 (선택사항)**
   - 수동으로 테스트하려면:
     - Vercel 대시보드 → **Functions** 탭
     - `/api/automation/daily-summary` 함수 찾기
     - "Invoke" 버튼으로 수동 실행 가능

## 다음 단계

**별도로 할 일은 없습니다!** 
- `vercel.json`이 배포되면 자동으로 Cron Job이 등록됩니다
- 매일 18:00 (한국 시간)에 자동 실행됩니다
- 실행 로그는 Vercel 대시보드 → **Functions** → 해당 함수 → **Logs**에서 확인 가능합니다
