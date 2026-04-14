# Firebase 환경 변수 설정 가이드 (Vercel)

## 문제 상황
```
Warning: Firebase Admin init skipped: Unexpected token ''', "'{"type":""... is not valid JSON
Error: Firebase Admin이 초기화되지 않았습니다.
```

이 오류는 `FIREBASE_SERVICE_ACCOUNT_JSON` 환경 변수의 JSON 형식이 잘못되었을 때 발생합니다.

---

## 해결 방법

### 방법 1: JSON을 올바르게 이스케이프 (권장)

**Vercel 환경 변수 설정 시:**

1. Vercel 대시보드 → Settings → **Environment Variables**
2. `FIREBASE_SERVICE_ACCOUNT_JSON` 찾기 (또는 새로 추가)
3. **Value** 필드에 JSON을 **한 줄로** 입력하되, **따옴표를 이스케이프**:

**잘못된 예:**
```
{"type":"service_account","project_id":"..."}
```

**올바른 예:**
```
{"type":"service_account","project_id":"schedule-checker-b0eb7","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",...}
```

**중요:**
- `\n` (줄바꿈)을 `\\n`으로 이스케이프
- 전체 JSON을 한 줄로 입력
- 앞뒤에 추가 따옴표 없이 입력

---

### 방법 2: Base64 인코딩 사용 (더 안전)

**로컬에서:**
```bash
# JSON 파일을 base64로 인코딩
cat firebase-service-account.json | base64
```

**Vercel에서:**
1. 인코딩된 문자열을 `FIREBASE_SERVICE_ACCOUNT_JSON` 값으로 설정
2. 코드 수정 필요 (base64 디코딩 추가)

---

### 방법 3: 개별 환경 변수 사용 (가장 안전)

`FIREBASE_SERVICE_ACCOUNT_JSON` 대신 개별 변수 사용:

**환경 변수 3개 추가:**
1. `FIREBASE_PROJECT_ID` = `schedule-checker-b0eb7`
2. `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-xxxxx@schedule-checker-b0eb7.iam.gserviceaccount.com`
3. `FIREBASE_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`

**주의:**
- `FIREBASE_PRIVATE_KEY`에서 `\n`을 실제 줄바꿈으로 입력하거나 `\\n`으로 이스케이프
- Vercel에서는 여러 줄 입력이 어려우므로 `\\n` 사용 권장

---

## 현재 설정 확인 방법

### 1. Vercel 환경 변수 확인
1. Vercel 대시보드 → Settings → **Environment Variables**
2. `FIREBASE_SERVICE_ACCOUNT_JSON` 클릭
3. 값이 올바른 JSON 형식인지 확인

### 2. 테스트 방법
환경 변수 수정 후:
1. **Redeploy** 실행
2. Functions → `/api/automation/daily-summary` → **Invoke** 테스트
3. Logs에서 오류가 사라졌는지 확인

---

## 빠른 수정 가이드

### Step 1: Firebase 서비스 계정 JSON 파일 확인
로컬 `.env.local` 파일에서 올바른 형식 확인:
```bash
cat .env.local | grep FIREBASE_SERVICE_ACCOUNT_JSON
```

### Step 2: Vercel에 동일하게 설정
1. `.env.local`의 값을 복사
2. Vercel 환경 변수에 붙여넣기
3. **중요**: Vercel에서는 따옴표 이스케이프가 필요할 수 있음

### Step 3: JSON 유효성 검사
JSON이 올바른지 확인:
```bash
# 로컬에서 테스트
node -e "JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)"
```

---

## 예상되는 정상 동작

환경 변수가 올바르게 설정되면:
- Warning 메시지가 사라짐
- `Firebase Admin이 초기화되지 않았습니다` 오류가 사라짐
- `/api/automation/daily-summary` 함수가 정상 작동
- Logs에 성공 메시지 표시

---

## 체크리스트

- [ ] Vercel 환경 변수 `FIREBASE_SERVICE_ACCOUNT_JSON` 확인
- [ ] JSON 형식이 올바른지 확인 (따옴표 이스케이프)
- [ ] `\n`이 `\\n`으로 이스케이프되어 있는지 확인
- [ ] Environment가 "All Environments"로 설정되어 있는지 확인
- [ ] 환경 변수 수정 후 **Redeploy** 실행
- [ ] 재배포 후 함수 테스트
- [ ] Logs에서 오류가 사라졌는지 확인

---

## 참고

- Vercel 환경 변수는 문자열로 저장되므로 JSON 파싱 시 주의 필요
- 따옴표 이스케이프 문제가 가장 흔한 원인입니다
- 개별 환경 변수 사용이 더 안전할 수 있습니다
