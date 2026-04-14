# Google 캘린더 연동 설정

할 일을 Google 캘린더에 자동으로 반영하려면 아래 설정이 필요합니다.

---

## 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 선택 또는 생성.
2. **API 및 서비스** → **라이브러리**에서 **Google Calendar API** 검색 후 사용 설정.
3. **API 및 서비스** → **사용자 인증 정보** → **사용자 인증 정보 만들기** → **OAuth 2.0 클라이언트 ID**.
4. 애플리케이션 유형: **웹 애플리케이션**.
5. **승인된 리디렉션 URI**에 다음 추가:
   - 로컬: `http://localhost:4000/api/auth/google-calendar/callback`
   - 프로덕션: `https://your-domain.com/api/auth/google-calendar/callback`
6. 클라이언트 ID와 클라이언트 보안 비밀 복사.

---

## 2. 환경 변수

프로젝트 루트 `.env.local` (또는 서버 환경 변수)에 추가:

```env
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
```

- **GOOGLE_CALENDAR_CLIENT_ID**: OAuth 2.0 클라이언트 ID.
- **GOOGLE_CALENDAR_CLIENT_SECRET**: OAuth 2.0 클라이언트 보안 비밀 (서버에서만 사용, 노출 금지).

---

## 3. 동작 방식

- **설정** 페이지에서 "Google 캘린더 연동하기" 클릭 → Google 로그인 및 권한 허용 → 콜백에서 **refresh_token**을 서버에 저장.
- **할 일 추가** (한 줄 추가 또는 상세 모달) 시, 연동된 사용자는 해당 할 일이 **Google 캘린더(기본 캘린더)**에 이벤트로 생성됨.
- 이벤트는 할 일의 제목·마감 일시를 사용하며, 서버의 `calendar_tokens` 컬렉션과 `user_settings`의 `googleCalendarConnected` 플래그로 연동 상태를 관리합니다.

---

## 4. Firestore 보안 규칙

`calendar_tokens` 컬렉션은 **클라이언트에서 읽기/쓰기 불가**로 두는 것이 좋습니다. 서버(Admin SDK)로만 접근하도록 하고, Firestore 규칙에서 해당 컬렉션을 제외하거나 거부하세요.
