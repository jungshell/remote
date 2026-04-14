# Phase 1–3 설정 요약

## Phase 1 (로그인 + 업무)

1. **Firebase Console**
   - [Firebase Console](https://console.firebase.google.com) → 프로젝트 `schedule-checker-b0eb7` 선택
   - **인증** → 로그인 방법에서 **이메일/비밀번호**, **Google** 사용 설정
   - **프로젝트 설정** → 일반 → 앱 → 웹 앱 추가(또는 기존 앱) → SDK 설정에서 `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` 복사

2. **환경 변수** (프로젝트 루트 `.env.local`)
   - `.env.example` 참고해 **NEXT_PUBLIC_FIREBASE_*** 변수 채우기

3. **Firestore 인덱스**
   - 터미널에서 `firebase deploy --only firestore` 실행 (rules + indexes 배포)
   - 또는 첫 실행 시 콘솔에 뜨는 인덱스 링크로 복합 인덱스 생성

4. **실행**
   - `npm run dev` 또는 **AutoFlow ON.bat** → 브라우저에서 `/login` 로그인 후 `/tasks`에서 업무 CRUD

---

## Phase 2 (daily-summary API + Google Calendar)

1. **daily-summary API**
   - 서버용 Firebase Admin: `.env.local`에 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 설정 (또는 서비스 계정 JSON)
   - Vercel Cron 사용 시: Vercel 대시보드에서 `CRON_SECRET` 설정, API 호출 시 `Authorization: Bearer <CRON_SECRET>` 헤더 필요

2. **Google Calendar 연동**
   - [Google Cloud Console](https://console.cloud.google.com) → API 및 서비스 → **Google Calendar API** 사용 설정
   - 사용자 인증 정보 → **OAuth 2.0 클라이언트 ID** (웹 앱) 생성 → 승인된 리디렉션 URI에 `http://localhost:4000/api/calendar/callback` (및 배포 URL) 추가
   - `.env.local`에 `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL` 설정

3. **동작**
   - `/tasks` 페이지에서 **캘린더 연동** 클릭 → Google 로그인 → 이번 주 일정이 목록에 표시

---

## Phase 3 (연락처·알림·템플릿)

- 추가 설정 없음. 로그인 후 **업무** 페이지 상단에서 **연락처**, **알림**, **템플릿** 링크로 이동해 사용.
- Firestore 규칙에서 `contacts`, `alerts`, `templates`는 `ownerId` 기준으로 본인 문서만 읽기/쓰기 가능.

---

## 라우트 요약

| 경로 | 설명 |
|------|------|
| `/` | 개발 현황 (개요·설정 파일·구현된 기능) |
| `/login` | 로그인 (이메일·Google) |
| `/tasks` | 업무 목록·추가·수정·완료·삭제, 캘린더 연동·이벤트 |
| `/contacts` | 연락처 목록·추가·삭제 |
| `/alerts` | 알림 목록·추가·완료 토글·삭제 |
| `/templates` | 템플릿 목록·추가·삭제 |
| `/api/automation/daily-summary` | 일일 요약 (Cron용) |
| `/api/calendar/auth` | POST, Google OAuth 시작 |
| `/api/calendar/callback` | GET, OAuth 콜백 |
| `/api/calendar/events` | GET, 이번 주 일정 (Authorization: Bearer \<idToken\>) |
