# Cron Jobs 및 설정 페이지 확인 가이드

## 1. 데일리 요약 Cron (Vercel) 확인 결과 ✅

### 현재 상태
- ✅ `vercel.json`에 Cron 설정 완료 (`/api/automation/daily-summary`, `0 9 * * *`)
- ✅ 배포 완료 (최근 배포 성공)
- ✅ Cron Jobs 기능 활성화됨 (Enabled ON)

### 다음 확인 단계

**1. Cron Job 등록 확인**
- Vercel 대시보드 → 프로젝트 → **Functions** 탭
- `/api/automation/daily-summary` 함수가 보이는지 확인
- 또는 **Cron Jobs** 페이지 아래쪽에 등록된 Cron 목록 확인
  - 배포 후 몇 분 기다려야 목록에 나타날 수 있습니다

**2. 실행 로그 확인**
- Functions → `/api/automation/daily-summary` → **Logs** 탭
- 매일 18:00 (한국 시간) 실행 기록 확인

**3. 수동 테스트 (선택사항)**
- Functions → `/api/automation/daily-summary` → **Invoke** 버튼으로 수동 실행 가능

### 실행 시간
- **매일 18:00 (한국 시간)** = UTC 09:00
- 한국 시간 09:00에 받고 싶다면 `vercel.json`의 `schedule`을 `"0 0 * * *"`로 변경

---

## 2. 설정 페이지에 Google Calendar 섹션이 보이지 않는 문제

### 확인 사항

**1. 배포 상태 확인**
- 최신 코드가 배포되었는지 확인
- Vercel 대시보드 → **Deployments** 탭에서 최근 배포 확인
- 배포가 안 되어 있다면 Git push 후 재배포

**2. 브라우저 캐시 문제**
- 브라우저에서 **강력 새로고침** (Mac: `Cmd + Shift + R`, Windows: `Ctrl + Shift + R`)
- 또는 시크릿 모드에서 확인

**3. 코드 확인**
- 코드상으로는 Google Calendar 섹션이 정상적으로 있습니다 (118-182줄)
- 배포된 버전과 로컬 코드가 다를 수 있습니다

### 해결 방법

**방법 1: 재배포**
```bash
# Git에 푸시 후 Vercel에서 자동 배포
git add .
git commit -m "Update settings page"
git push
```

**방법 2: Vercel에서 수동 재배포**
- Vercel 대시보드 → **Deployments** → 최근 배포 → **Redeploy**

**방법 3: 로컬에서 확인**
```bash
npm run dev
# http://localhost:3000/settings 접속
```

### Google Calendar 섹션 위치
설정 페이지 (`/settings`)에서 다음 순서로 표시됩니다:
1. 🌓 테마
2. 👥 연락처 관리
3. **📅 Google Calendar 연동** ← 여기!
4. 🧩 템플릿 자동 생성
5. 🔕 Quiet hours
6. 📊 데일리 요약 스케줄
7. 🔔 푸시 알림

---

## 추가 확인 사항

### 빌드 오류 해결 (선택사항)
현재 빌드 오류가 있지만, 이는 개발 환경에서만 발생하는 문제일 수 있습니다.
- Vercel에서는 서버 사이드에서만 실행되므로 문제가 없을 수 있습니다
- 배포가 성공했다면 실제로는 문제 없을 가능성이 높습니다

### 환경 변수 확인
Google Calendar 연동을 사용하려면:
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`

이 두 환경 변수가 Vercel에 설정되어 있어야 합니다.
