# Cron Jobs 목록 확인 방법

## ✅ 1-4번 완료 확인

- [x] Vercel 환경 변수 설정 완료
- [x] Firebase 승인된 도메인 추가 완료 (`autoflow-sepia.vercel.app` 확인됨)
- [x] Firestore 규칙 배포 완료
- [x] Google Calendar 환경 변수 설정 완료

---

## 5. Cron Jobs 목록 확인 방법

### 방법 1: Vercel 대시보드에서 확인 (권장)

**1단계: Cron Jobs 페이지로 이동**
- 현재 Environment Variables 페이지에 있다면
- 왼쪽 사이드바에서 **"Functions"** 섹션 아래의 **"Cron Jobs"** 클릭
- 또는 직접 URL: `https://vercel.com/tony-js-projects/autoflow/settings/cron-jobs`

**2단계: 페이지를 아래로 스크롤**
- "Get Started with Cron Jobs on Vercel" 섹션은 가이드입니다
- **실제 등록된 Cron Jobs 목록은 그 아래에 있습니다**
- 페이지를 아래로 스크롤하세요

**3단계: 등록된 Cron 확인**
다음과 같은 형식으로 표시됩니다:

```
Registered Cron Jobs

Path: /api/automation/daily-summary
Schedule: 0 0 * * * (Every day at 00:00 UTC)
Status: Active
Last Run: [실행 시간]
Next Run: [다음 실행 시간]
```

**예상되는 내용:**
- **Path**: `/api/automation/daily-summary`
- **Schedule**: `0 0 * * *` (매일 00:00 UTC = 09:00 KST)
- **Status**: Active 또는 Enabled

---

### 방법 2: Functions 탭에서 확인

**1단계: Functions 탭으로 이동**
- Vercel 대시보드 → 프로젝트 → **Functions** 탭

**2단계: Cron Job 함수 확인**
- `/api/automation/daily-summary` 함수 찾기
- 함수 옆에 Cron 아이콘 또는 "Scheduled" 표시가 있을 수 있습니다

**3단계: 실행 로그 확인**
- 함수 클릭 → **Logs** 탭
- 실행 기록 확인 (매일 09:00 KST에 실행 기록이 나타남)

---

### 방법 3: 배포 로그에서 확인

**1단계: Deployments 탭 확인**
- Vercel 대시보드 → **Deployments** 탭
- 최신 배포 클릭

**2단계: 빌드 로그 확인**
- 배포 상세 페이지에서 빌드 로그 확인
- `vercel.json` 파일이 인식되었는지 확인
- Cron Job이 등록되었다는 메시지가 있을 수 있습니다

---

## ⚠️ Cron Jobs가 보이지 않는 경우

### 원인 1: 배포가 완료되지 않음
**해결 방법:**
- Deployments 탭에서 최신 배포가 "Ready" 상태인지 확인
- 배포가 진행 중이면 완료될 때까지 대기 (보통 2-5분)

### 원인 2: 페이지를 충분히 스크롤하지 않음
**해결 방법:**
- Cron Jobs 페이지에서 **아래로 충분히 스크롤**
- "Get Started" 섹션 아래에 목록이 있습니다

### 원인 3: 배포 후 시간이 지나지 않음
**해결 방법:**
- 배포 완료 후 **몇 분 기다린 뒤** 새로고침
- Vercel이 Cron Jobs를 등록하는 데 시간이 걸릴 수 있습니다

### 원인 4: vercel.json이 제대로 배포되지 않음
**해결 방법:**
- GitHub 저장소에 `vercel.json` 파일이 있는지 확인
- 파일 내용이 올바른지 확인:
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

---

## 🔍 빠른 확인 체크리스트

- [ ] Vercel 대시보드 → Settings → Cron Jobs 페이지 접속
- [ ] "Enabled" 토글이 켜져 있는지 확인
- [ ] 페이지를 아래로 스크롤
- [ ] 등록된 Cron Jobs 목록 확인
- [ ] `/api/automation/daily-summary`가 목록에 있는지 확인
- [ ] Schedule이 `0 0 * * *`인지 확인
- [ ] Status가 Active인지 확인

---

## 📝 예상되는 화면

Cron Jobs 페이지에서 아래와 같은 섹션을 찾으세요:

```
┌─────────────────────────────────────────┐
│ Cron Jobs                               │
│                                         │
│ [Enabled] Toggle                        │
│                                         │
│ Get Started with Cron Jobs on Vercel    │
│ (가이드 섹션)                            │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│ Registered Cron Jobs                    │ ← 여기!
│                                         │
│ /api/automation/daily-summary           │
│ Schedule: 0 0 * * *                    │
│ Status: Active                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 💡 팁

1. **브라우저 새로고침**: F5 또는 Cmd+R로 페이지 새로고침
2. **다른 브라우저/시크릿 모드**: 캐시 문제일 수 있으니 시도해보세요
3. **시간 대기**: 배포 완료 후 5-10분 기다린 뒤 다시 확인

---

## ✅ 확인 완료 후

Cron Job이 등록되어 있다면:
- 매일 09:00 (한국 시간)에 자동 실행됩니다
- Functions → `/api/automation/daily-summary` → Logs에서 실행 기록 확인 가능
- 첫 실행은 다음 09:00에 진행됩니다
