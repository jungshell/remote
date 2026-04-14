# FIREBASE_PRIVATE_KEY 환경 변수 설정 가이드

## 현재 상황

3개 환경 변수가 모두 설정되어 있지만 초기화에 실패하고 있습니다:
- ✅ `FIREBASE_PROJECT_ID`: 설정됨
- ✅ `FIREBASE_CLIENT_EMAIL`: 설정됨  
- ✅ `FIREBASE_PRIVATE_KEY`: 설정됨
- ❌ 하지만 초기화 실패

---

## 문제 원인

가장 가능성 높은 원인: **`FIREBASE_PRIVATE_KEY`의 `\n` 처리 문제**

---

## 해결 방법

### 방법 1: FIREBASE_PRIVATE_KEY 값 확인 및 수정

**Vercel 환경 변수에서:**

1. `FIREBASE_PRIVATE_KEY` 환경 변수 클릭
2. 값 확인:
   - `-----BEGIN PRIVATE KEY-----`로 시작해야 함
   - `-----END PRIVATE KEY-----`로 끝나야 함
   - 중간에 `\n`이 있어야 함 (실제 줄바꿈이 아니라 `\n` 문자)

**올바른 형식:**
```
-----BEGIN PRIVATE KEY-----\n[실제 키 내용]\n-----END PRIVATE KEY-----\n
```
**주의**: 실제 키 값은 문서에 포함하지 마세요. Firebase Console에서 다운로드한 키 파일의 `private_key` 값을 사용하세요.

**잘못된 형식:**
- 실제 줄바꿈이 있는 경우 (Vercel 환경 변수는 한 줄만 지원)
- `\n`이 없고 공백만 있는 경우
- 앞뒤에 공백이나 따옴표가 있는 경우

---

### 방법 2: .env.local에서 값 복사

**로컬에서:**
```bash
# .env.local 파일에서 private_key 값 추출
cat .env.local | grep FIREBASE_SERVICE_ACCOUNT_JSON | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['private_key'])"
```

**또는 수동으로:**
1. `.env.local` 파일 열기
2. `FIREBASE_SERVICE_ACCOUNT_JSON`의 JSON에서 `private_key` 값 찾기
3. 값 복사 (앞뒤 따옴표 제외)
4. Vercel 환경 변수에 붙여넣기

---

### 방법 3: Vercel 환경 변수에서 직접 수정

**주의사항:**
- Vercel 환경 변수는 여러 줄 입력이 어려울 수 있음
- `\n`을 실제 줄바꿈으로 입력하면 안 됨
- `\n` 문자 그대로 입력해야 함

**올바른 입력 방법:**
1. `.env.local`에서 `private_key` 값 복사
2. Vercel 환경 변수 Value 필드에 붙여넣기
3. `\n`이 그대로 유지되는지 확인
4. 앞뒤 공백 제거
5. 저장

---

## 확인 방법

### 1. 환경 변수 값 확인

Vercel 대시보드에서:
- `FIREBASE_PRIVATE_KEY` 값이 올바른지 확인
- `-----BEGIN PRIVATE KEY-----`로 시작하는지
- `-----END PRIVATE KEY-----`로 끝나는지
- `\n`이 포함되어 있는지

### 2. 배포 후 테스트

1. 환경 변수 수정 후 **Redeploy**
2. 함수 테스트: `https://autoflow-sepia.vercel.app/api/automation/daily-summary`
3. Logs 확인:
   - Functions → `/api/automation/daily-summary` → Logs
   - 상세 오류 메시지 확인

---

## 예상되는 오류 메시지

환경 변수 값이 잘못된 경우:
- `Failed to initialize Firebase Admin with individual env vars: ...`
- `Invalid credential` 또는 `Invalid key format`

Logs에서 정확한 오류 메시지를 확인하면 문제를 더 정확히 파악할 수 있습니다.

---

## 빠른 해결 체크리스트

- [ ] `.env.local`에서 `private_key` 값 확인
- [ ] Vercel 환경 변수 `FIREBASE_PRIVATE_KEY`에 동일한 값 입력
- [ ] `\n`이 문자 그대로 입력되어 있는지 확인 (실제 줄바꿈 아님)
- [ ] 앞뒤 공백 제거
- [ ] 저장 후 **Redeploy**
- [ ] 함수 재테스트
- [ ] Logs에서 상세 오류 확인

---

## 참고

- Vercel 환경 변수는 문자열로 저장되므로 `\n`을 문자 그대로 입력해야 함
- 코드에서 `replace(/\\n/g, '\n')`로 실제 줄바꿈으로 변환함
- 값에 공백이나 잘못된 문자가 있으면 초기화 실패
