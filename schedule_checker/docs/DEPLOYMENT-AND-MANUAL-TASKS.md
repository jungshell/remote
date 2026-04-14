# AutoFlow — 배포 가이드 & 직접 진행하실 작업 정리

이 문서는 **제가 코드로 할 수 없는 작업**만 정리한 것입니다. 1·2·4단계 구현은 완료되어 있으며, 아래는 **사용자님이 직접 진행**하시면 되는 내용입니다.

---

## 1단계·2단계·4단계 (완료된 것)

- **로그인·데이터 격리**: API에서 Firebase ID 토큰 검증, 업무/연락처/알림/템플릿 `ownerId` 기준 조회·생성·수정·삭제 적용됨.
- **Firestore 보안 규칙**: 프로젝트 루트에 `firestore.rules`, `firebase.json` 추가됨. 배포만 하시면 됨.
- **연락처·알림·템플릿 ownerId**: 타입·Firestore·API·시드 데이터·클라이언트 `authFetch` 적용 완료.

---

## Step 3. 배포 — 직접 진행하실 작업

### 3-1. 환경 변수 (서버 쪽) — **필수**

API에서 Firebase ID 토큰 검증을 위해 **서비스 계정**이 필요합니다.

1. **Firebase 콘솔** → 프로젝트 **schedule-checker-b0eb7** → ⚙️ 프로젝트 설정 → **서비스 계정** 탭.
2. **Firebase Admin SDK** → **새 비공개 키 생성** → JSON 파일 다운로드.
3. 배포 플랫폼(Vercel 등)의 **환경 변수**에 아래 중 **한 가지 방식**으로 설정합니다.

**방식 A (권장)**  
- 이름: `FIREBASE_SERVICE_ACCOUNT_JSON`  
- 값: 다운로드한 JSON 파일 **전체 내용을 한 줄 문자열로** 붙여넣기.  
  (JSON 내부 줄바꿈은 그대로 두어도 되고, 플랫폼에 따라 이스케이프된 문자열로 넣어도 됩니다.)

**방식 B**  
- `FIREBASE_PROJECT_ID` = JSON의 `project_id`  
- `FIREBASE_CLIENT_EMAIL` = JSON의 `client_email`  
- `FIREBASE_PRIVATE_KEY` = JSON의 `private_key` (따옴표 포함 전체. 줄바꿈은 `\n` 그대로 둡니다.)

로컬 개발 시: 프로젝트 루트에 `.env.local` 파일을 만들고 위 변수들을 동일한 이름으로 넣으시면 됩니다.

---

### 3-2. Firebase 콘솔에서 할 일

1. **Authentication**  
   - **Sign-in method** → **Google** 사용 설정 및 (필요 시) 테스트 이메일 추가.

2. **Authorization 도메인**  
   - 배포 후 사용할 도메인(예: `https://your-app.vercel.app`)을 **승인된 도메인**에 추가.

3. **Firestore 보안 규칙 배포**  
   - 터미널에서 프로젝트 루트로 이동 후:
     - `npm install -g firebase-tools` (최초 1회)
     - `firebase login`
     - `firebase use schedule-checker-b0eb7` (또는 해당 프로젝트 ID)
     - `firebase deploy --only firestore:rules`
   - 또는 Firebase 콘솔 → **Firestore Database** → **규칙** 탭에서 `firestore.rules` 내용을 복사해 붙여넣고 **게시**.

---

### 3-3. Vercel로 배포하는 경우 (요약)

1. GitHub 등에 저장소 푸시 후 [Vercel](https://vercel.com)에서 해당 저장소 연결.
2. **Environment Variables**에 `FIREBASE_SERVICE_ACCOUNT_JSON` (또는 방식 B 세 변수) 설정.
3. 배포 후 **Firebase 승인된 도메인**에 Vercel 도메인 추가.
4. (선택) 빌드 커맨드: `npm run build`, 출력 디렉터리: `.next` 등 Next.js 기본값 유지.

---

### 3-4. 의존성 설치 안내

프로젝트에 `firebase-admin`이 추가되어 있습니다. 최초 한 번 로컬에서 다음을 실행해 주세요.

```bash
cd "/Volumes/Samsung USB/schedule_checker"
npm install
```

---

## Step 5. 고급 기능 — 선택 사항 (직접 진행하실 내용)

아래는 **현재 코드로 자동화하지 않은** 부분입니다. 필요하시면 단계적으로 진행하시면 됩니다.

### 5-1. 데일리 요약을 서버에서 실행 (Cron)

- **현재**: 설정한 “요약 시간”에 맞춰 **브라우저에서** `DailySummaryScheduler`가 `/api/automation/daily-summary`를 호출합니다. 탭을 닫으면 실행되지 않습니다.
- **원하시는 경우**: Vercel **Cron Jobs**(또는 외부 Cron 서비스)에서 특정 시간에  
  `GET/POST https://your-app.vercel.app/api/automation/daily-summary` 를 호출하도록 설정하시면 됩니다.  
  (API가 인증을 요구하도록 바꾸고 싶다면, Cron 전용 시크릿 헤더를 두는 방식으로 추가 개발이 필요합니다.)

### 5-2. 문구 점검에 외부 AI API 연동

- **현재**: 문구 점검은 **규칙 기반** 변환만 구현되어 있습니다.
- **원하시는 경우**: OpenAI 등 외부 API를 쓰려면 해당 API 키를 환경 변수로 두고, 문구 점검 API(또는 서버 액션)에서 호출하는 코드를 추가하시면 됩니다. (키 관리·비용 정책은 사용자 판단입니다.)

### 5-3. Firestore 규칙을 ownerId 기준으로 더 좁히기

- **현재**: `tasks`는 `ownerId == request.auth.uid`로 제한되어 있고, `contacts`·`alerts`·`templates`는 “로그인한 사용자”만 읽기/쓰기 가능합니다.
- **원하시는 경우**: 연락처·알림·템플릿 문서에 모두 `ownerId`가 채워진 뒤, `firestore.rules`에서 해당 컬렉션도 `resource.data.ownerId == request.auth.uid` 조건으로 바꾸시면 됩니다. (`firestore.rules` 파일 안 주석에 이미 안내가 있습니다.)

---

## 요약 체크리스트

| 작업 | 담당 | 비고 |
|------|------|------|
| 서비스 계정 JSON 발급 및 환경 변수 설정 | 사용자 | 필수 (토큰 검증) |
| Firebase에서 Google 로그인 활성화 | 사용자 | 이미 하셨으면 생략 |
| Firebase 승인된 도메인에 배포 URL 추가 | 사용자 | 배포 후 1회 |
| Firestore 규칙 배포 (`firebase deploy --only firestore:rules` 또는 콘솔 복붙) | 사용자 | 1회 |
| `npm install` (firebase-admin 포함) | 사용자 | 로컬/배포 환경 |
| 데일리 요약 Cron(서버) | 사용자 선택 | 필요 시 Cron 설정 |
| 문구 점검 외부 API | 사용자 선택 | 필요 시 API 키·연동 개발 |
| 연락처/알림/템플릿 규칙 ownerId 강화 | 사용자 선택 | 데이터 마이그레이션 후 |

위까지 진행하시면 1~5단계 중 **코드로 가능한 부분은 모두 반영된 상태**입니다. 추가로 수정하거나 문서를 더 쓰고 싶으시면 말씀해 주세요.
