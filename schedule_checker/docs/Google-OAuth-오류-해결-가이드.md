# Google OAuth "액세스 차단됨" 오류 해결 가이드

## 오류 내용

```
액세스 차단됨: autoflow-sepia.vercel.app은(는) Google 인증 절차를 완료하지 않았습니다
403 오류: access_denied
앱은 현재 테스트 중이며 개발자가 승인한 테스터만 앱에 액세스할 수 있습니다.
```

## 원인

Google OAuth 앱이 **"테스트" 모드**에 있어서 발생하는 문제입니다. 테스트 모드에서는:
- 개발자가 승인한 테스터만 앱에 액세스 가능
- 일반 사용자는 액세스 불가

## 해결 방법

### 방법 1: 테스트 사용자 추가 (빠른 해결)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (Google Calendar 연동에 사용한 프로젝트)
3. **API 및 서비스** → **OAuth 동의 화면** 클릭
4. **테스트 사용자** 섹션으로 스크롤
5. **+ ADD USERS** 클릭
6. 사용할 Google 계정 이메일(`sti60val@gmail.com`) 추가
7. **저장** 클릭

**결과**: 추가한 이메일로 로그인하면 정상 작동합니다.

---

### 방법 2: 앱을 프로덕션으로 게시 (영구 해결)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** → **OAuth 동의 화면** 클릭
4. **앱 게시** 섹션에서 **게시** 버튼 클릭
5. 확인 대화상자에서 **확인** 클릭

**주의사항:**
- 프로덕션으로 게시하면 **모든 사용자**가 앱에 액세스할 수 있습니다
- Google의 검토 과정이 필요할 수 있습니다 (보통 즉시 승인)
- 앱이 공개적으로 사용 가능해집니다

---

### 방법 3: OAuth 동의 화면 설정 확인

다음 항목들이 올바르게 설정되어 있는지 확인:

1. **앱 정보**
   - 앱 이름: AutoFlow (또는 원하는 이름)
   - 사용자 지원 이메일: 본인 이메일
   - 앱 로고: 선택사항

2. **앱 도메인**
   - 승인된 도메인: `vercel.app` 또는 `autoflow-sepia.vercel.app`

3. **개인정보처리방침 URL** (선택사항이지만 권장)
   - 개인정보처리방침 페이지 URL 추가

4. **범위 (Scopes)**
   - `https://www.googleapis.com/auth/calendar.events` 포함 확인

5. **테스트 사용자** (방법 1 사용 시)
   - 사용할 이메일 주소 추가

---

## 확인 방법

1. 설정 페이지 → **Google Calendar 연동** → **Google 계정으로 연동** 클릭
2. Google 로그인 화면에서 정상적으로 진행되는지 확인
3. 권한 승인 후 설정 페이지로 리다이렉트되는지 확인

---

## 추가 참고사항

### OAuth 클라이언트 ID 확인

1. **API 및 서비스** → **사용자 인증 정보**
2. **OAuth 2.0 클라이언트 ID** 목록에서 클라이언트 ID 확인
3. **승인된 리디렉션 URI**에 다음이 포함되어 있는지 확인:
   - `https://autoflow-sepia.vercel.app/api/integrations/google-calendar/callback`

### Google Calendar API 활성화 확인

1. **API 및 서비스** → **라이브러리**
2. "Google Calendar API" 검색
3. **사용** 상태인지 확인

---

## 문제가 계속되면

1. **브라우저 캐시 및 쿠키 삭제**
2. **시크릿 모드**에서 다시 시도
3. **다른 Google 계정**으로 테스트
4. Google Cloud Console의 **OAuth 동의 화면** 설정 다시 확인
