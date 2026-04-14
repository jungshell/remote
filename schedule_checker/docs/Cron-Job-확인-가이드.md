# Cron Job 확인 가이드

## ✅ 완료된 작업

1. **스케줄 변경**: 한국 시간 **09:00** (UTC 00:00)로 설정 완료
2. **API 수정**: GET 요청도 처리하도록 수정 (Vercel Cron은 GET 요청 사용)
3. **Git 푸시 완료**: 변경사항이 GitHub에 푸시되었고, Vercel에서 자동 배포가 시작됩니다

---

## Cron Job 확인 방법

### 1단계: 배포 완료 대기
- Vercel 대시보드 → **Deployments** 탭에서 최신 배포 상태 확인
- 배포가 완료되면 (보통 2-5분) 다음 단계로 진행

### 2단계: Cron Jobs 목록 확인
Vercel 대시보드에서:
1. 프로젝트 → **Settings** → **Cron Jobs** 클릭
2. **페이지를 아래로 스크롤** (중요!)
3. "Get Started" 섹션 아래에 **등록된 Cron Jobs 목록**이 표시됩니다

**예상되는 표시 내용:**
```
Path: /api/automation/daily-summary
Schedule: 0 0 * * * (매일 00:00 UTC = 09:00 KST)
Status: Active
```

### 3단계: 실행 로그 확인
- **Functions** 탭 → `/api/automation/daily-summary` 클릭
- **Logs** 탭에서 실행 기록 확인
- 매일 09:00 (한국 시간)에 실행 기록이 나타납니다

---

## 현재 설정

- **스케줄**: `0 0 * * *` (매일 00:00 UTC)
- **한국 시간**: **09:00** (UTC +9 시간)
- **API 경로**: `/api/automation/daily-summary`
- **요청 방식**: GET (Vercel Cron) 또는 POST (수동 호출)

---

## 문제 해결

### Cron Job이 목록에 보이지 않는 경우

1. **배포 완료 확인**
   - Deployments 탭에서 최신 배포가 "Ready" 상태인지 확인
   - 배포가 진행 중이면 완료될 때까지 대기

2. **페이지 새로고침**
   - Cron Jobs 페이지에서 새로고침 (F5 또는 Cmd+R)
   - 배포 완료 후 몇 분 기다린 뒤 다시 확인

3. **vercel.json 확인**
   - 프로젝트 루트에 `vercel.json` 파일이 있는지 확인
   - 내용이 올바른지 확인:
     ```json
     {
       "crons": [
         {
           "path": "/api/automation/daily-summary",
           "schedule": "0 0 * * *"
         }
       ]
     }
     ```

4. **수동 테스트**
   - Functions → `/api/automation/daily-summary` → **Invoke** 버튼으로 수동 실행
   - 성공하면 API는 정상 작동하는 것입니다

---

## 다음 실행 시간

- **오늘**: 다음 09:00 (한국 시간)
- **매일**: 09:00 (한국 시간)에 자동 실행

---

## 참고

- Vercel Cron은 UTC 시간을 사용합니다
- 한국 시간 09:00 = UTC 00:00
- 배포 후 첫 실행까지 최대 24시간 걸릴 수 있습니다 (다음 스케줄 시간까지)
