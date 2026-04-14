# /api/automation/daily-summary 함수 확인 방법

## 상황
배포는 성공했지만 Functions 목록에 `/api/automation/daily-summary`가 보이지 않습니다.

## 원인
**Vercel Functions는 실제로 호출되어야 목록에 나타납니다.** 아직 호출되지 않았기 때문에 목록에 보이지 않는 것입니다.

---

## 확인 방법

### 방법 1: 직접 URL로 호출 (가장 빠름)

**브라우저에서:**
1. 배포된 앱 URL로 이동 (예: `https://autoflow-sepia.vercel.app`)
2. 주소창에 다음 입력:
   ```
   https://autoflow-sepia.vercel.app/api/automation/daily-summary
   ```
3. 엔터 키 누르기
4. 응답 확인:
   - 성공: `{"success":true,"summary":"..."}` 형태의 JSON
   - 오류: 오류 메시지 표시

**호출 후:**
- Functions 목록을 새로고침하면 `/api/automation/daily-summary`가 나타날 것입니다

---

### 방법 2: Vercel 대시보드에서 수동 실행

**Functions 탭에서:**
1. Vercel 대시보드 → 프로젝트 → **Functions** 탭
2. 검색창에 `daily-summary` 입력
3. 함수가 나타나면 클릭
4. **Invoke** 또는 **Test** 버튼 클릭
5. 실행 결과 확인

**또는 직접 URL 접근:**
- Functions 탭에서 직접 URL을 입력하여 호출할 수 있습니다

---

### 방법 3: curl 명령어로 테스트

터미널에서:
```bash
curl https://autoflow-sepia.vercel.app/api/automation/daily-summary
```

또는 GET 요청:
```bash
curl -X GET https://autoflow-sepia.vercel.app/api/automation/daily-summary
```

---

### 방법 4: 배포 로그 확인

**Deployments 탭에서:**
1. Vercel 대시보드 → **Deployments** 탭
2. 최신 배포 클릭
3. **Build Logs** 확인
4. `daily-summary` 관련 메시지 확인

---

## 예상되는 동작

### 함수가 정상 작동하는 경우:
```json
{
  "success": true,
  "summary": "오늘 완료율: 0% | 지연 위험: 0건 | 총 업무: 0건"
}
```

### 함수가 오류를 반환하는 경우:
- 환경 변수 문제: `FIREBASE_SERVICE_ACCOUNT_JSON` 확인 필요
- Firebase 연결 문제: Firestore 규칙 확인 필요

---

## Cron Job 등록 확인

함수가 호출되면:
1. **Functions 목록에 나타남**
2. **Cron Job도 자동으로 등록됨** (vercel.json에 정의되어 있으므로)
3. **다음 09:00 (KST)에 자동 실행됨**

---

## 문제 해결

### 함수가 404를 반환하는 경우:
- 파일 경로 확인: `src/app/api/automation/daily-summary/route.ts`
- 배포가 완전히 완료되었는지 확인
- 재배포 필요할 수 있음

### 함수가 500 오류를 반환하는 경우:
- 환경 변수 확인 (`FIREBASE_SERVICE_ACCOUNT_JSON`)
- Functions → Logs에서 상세 오류 확인

### 함수가 호출되지 않는 경우:
- URL이 올바른지 확인
- 네트워크 문제 확인
- Vercel 서비스 상태 확인

---

## 요약

1. **브라우저에서 직접 URL 호출** (가장 빠름)
2. **호출 후 Functions 목록 새로고침**
3. **함수가 나타나면 정상 작동하는 것입니다**
4. **Cron Job은 자동으로 등록되어 다음 09:00에 실행됩니다**

---

## 참고

- Vercel Functions는 호출되어야 목록에 나타납니다
- Cron Job은 함수가 호출되지 않아도 `vercel.json`에 정의되어 있으면 등록됩니다
- 첫 실행은 다음 스케줄 시간(09:00 KST)에 진행됩니다
