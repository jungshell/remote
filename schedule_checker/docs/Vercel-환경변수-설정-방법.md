# Vercel 환경 변수 설정 방법

## 현재 상황

`.env.local` 파일 형식:
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**로컬에서는 정상 작동하지만, Vercel에서는 다르게 설정해야 합니다.**

---

## 문제 원인

Vercel 환경 변수는:
- **작은따옴표(`'`)를 포함하면 안 됩니다**
- JSON 문자열만 입력해야 합니다
- Vercel이 자동으로 문자열로 처리합니다

---

## 해결 방법

### 방법 1: FIREBASE_SERVICE_ACCOUNT_JSON 수정 (JSON만 입력)

**Vercel 환경 변수 설정:**

1. Vercel 대시보드 → Settings → **Environment Variables**
2. `FIREBASE_SERVICE_ACCOUNT_JSON` 찾기
3. **Value** 필드에서:
   - 작은따옴표(`'`) 제거
   - JSON만 입력:

```
{"type":"service_account","project_id":"[프로젝트ID]","private_key_id":"[키ID]","private_key":"-----BEGIN PRIVATE KEY-----\n[키 내용]\n-----END PRIVATE KEY-----\n","client_email":"[이메일]",...}
```
**주의**: 실제 값은 문서에 포함하지 마세요. Firebase Console에서 다운로드한 JSON 파일의 내용을 직접 사용하세요.

**중요:**
- 작은따옴표(`'`) 없이 JSON만 입력
- `\n`은 그대로 유지 (Vercel이 자동 처리)
- 전체를 한 줄로 입력

4. 저장 후 **Redeploy** 실행

---

### 방법 2: 개별 환경 변수 3개 사용 (권장)

**더 안전하고 문제가 적습니다!**

코드는 두 가지 방식을 모두 지원합니다:
- `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON 하나)
- 또는 `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (3개)

**환경 변수 3개 추가:**

**1. FIREBASE_PROJECT_ID**
- Value: `schedule-checker-b0eb7`
- Environment: All Environments

**2. FIREBASE_CLIENT_EMAIL**
- Value: `firebase-adminsdk-fbsvc@schedule-checker-b0eb7.iam.gserviceaccount.com`
- Environment: All Environments

**3. FIREBASE_PRIVATE_KEY**
- Value: (`.env.local`의 JSON에서 `private_key` 값 복사)
```
-----BEGIN PRIVATE KEY-----\n[여기에 실제 private_key 값 입력]\n-----END PRIVATE KEY-----\n
```
**주의**: 실제 키 값은 문서에 포함하지 마세요. `.env.local` 파일에서만 복사하여 Vercel 환경 변수에 직접 입력하세요.
- Environment: All Environments

**중요:**
- `FIREBASE_SERVICE_ACCOUNT_JSON`은 삭제하거나 비활성화
- 3개 환경 변수만 사용
- `FIREBASE_PRIVATE_KEY`의 `\n`은 그대로 입력 (Vercel이 자동 처리)

---

## 답변

### Q1: `.env.local` 형식이 잘못된 건가요?

**아니요, 로컬에서는 정상입니다!**

- `.env.local`의 `FIREBASE_SERVICE_ACCOUNT_JSON='{...}'` 형식은 로컬에서 정상 작동합니다
- 문제는 **Vercel 환경 변수 설정 방식**입니다
- Vercel에서는 작은따옴표(`'`) 없이 JSON만 입력해야 합니다

### Q2: 3개 환경 변수만 추가해도 문제 없나요?

**네, 문제 없습니다!**

코드는 두 가지 방식을 모두 지원합니다:
1. `FIREBASE_SERVICE_ACCOUNT_JSON` 하나
2. 또는 `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` 3개

**3개 환경 변수만 사용하는 것을 권장합니다:**
- 더 안전함
- 문제 해결이 쉬움
- JSON 파싱 오류 없음

---

## 추천 방법

**방법 2 (개별 환경 변수 3개)를 권장합니다:**

1. `FIREBASE_SERVICE_ACCOUNT_JSON` 삭제 또는 비활성화
2. 3개 환경 변수 추가:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. 저장 후 **Redeploy**
4. 함수 테스트

---

## 확인 방법

환경 변수 수정 후:
1. **Redeploy** 실행
2. Functions → `/api/automation/daily-summary` → **Invoke** 테스트
3. Logs 확인:
   - `Firebase Admin init skipped` Warning이 사라졌는지
   - `Firebase Admin이 초기화되지 않았습니다` 오류가 사라졌는지
   - 함수가 정상 작동하는지

---

## 요약

- `.env.local` 형식은 정상입니다 (로컬용)
- Vercel에서는 작은따옴표 없이 JSON만 입력하거나
- **3개 환경 변수만 사용하는 것을 권장합니다** (더 안전함)
