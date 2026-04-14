# Daily Summary 오류 해결 가이드

## 현재 상황
`/api/automation/daily-summary` 함수를 호출하면 `{"error":"데일리 요약 생성에 실패했습니다."}` 오류가 발생합니다.

---

## 가능한 원인

### 1. Firebase Admin SDK 초기화 실패 (가장 가능성 높음)

**증상:**
- 함수는 호출되지만 실행 중 오류 발생
- `FIREBASE_SERVICE_ACCOUNT_JSON` 환경 변수 문제

**확인 방법:**
1. Vercel 대시보드 → 프로젝트 → **Functions** → `/api/automation/daily-summary` 클릭
2. **Logs** 탭에서 상세 오류 확인
3. "Firebase Admin이 초기화되지 않았습니다" 메시지가 있는지 확인

**해결 방법:**
1. Vercel 대시보드 → Settings → **Environment Variables**
2. `FIREBASE_SERVICE_ACCOUNT_JSON` 확인:
   - 값이 올바르게 설정되어 있는지
   - JSON 형식이 올바른지 (따옴표 이스케이프 확인)
   - Environment가 "All Environments"로 설정되어 있는지
3. 환경 변수 수정 후 **Redeploy** 실행

---

### 2. Firestore 연결 문제

**확인 방법:**
- Functions → Logs에서 Firestore 관련 오류 확인

**해결 방법:**
- Firebase 콘솔에서 Firestore가 활성화되어 있는지 확인
- Firestore 규칙이 올바르게 배포되었는지 확인

---

### 3. createAlert 함수 오류

**확인 방법:**
- Logs에서 "Failed to create alert" 메시지 확인

**해결 방법:**
- 알림 생성 실패해도 요약은 계속 진행되도록 수정됨
- Logs에서 상세 오류 확인

---

## 상세 오류 확인 방법

### Vercel Functions Logs 확인

1. Vercel 대시보드 → 프로젝트 → **Functions** 탭
2. `/api/automation/daily-summary` 함수 찾기 (검색창에 "daily-summary" 입력)
3. 함수 클릭 → **Logs** 탭
4. 최근 실행 기록 확인
5. 오류 메시지의 전체 내용 확인

**예상되는 오류 메시지:**
- `Firebase Admin이 초기화되지 않았습니다` → 환경 변수 문제
- `Permission denied` → Firestore 규칙 문제
- `Collection not found` → Firestore 컬렉션 문제

---

## 빠른 해결 체크리스트

- [ ] Vercel Functions → Logs에서 상세 오류 확인
- [ ] Vercel 환경 변수 `FIREBASE_SERVICE_ACCOUNT_JSON` 확인
- [ ] 환경 변수 값이 올바른 JSON 형식인지 확인
- [ ] Environment가 "All Environments"로 설정되어 있는지 확인
- [ ] 환경 변수 수정 후 Redeploy 실행
- [ ] 재배포 후 다시 함수 호출 테스트

---

## 테스트 방법

### 1. 브라우저에서 직접 호출
```
https://autoflow-sepia.vercel.app/api/automation/daily-summary
```

### 2. 개선된 오류 메시지 확인
이제 더 자세한 오류 메시지가 표시됩니다:
- Firebase Admin 초기화 실패 시: `"Firebase Admin SDK가 초기화되지 않았습니다"`
- 기타 오류 시: `details` 필드에 상세 오류 메시지

### 3. Functions Logs 확인
- Vercel 대시보드 → Functions → `/api/automation/daily-summary` → Logs
- 콘솔 로그에서 정확한 오류 원인 확인

---

## 예상되는 정상 응답

함수가 정상 작동하면:
```json
{
  "success": true,
  "summary": "오늘 완료율: 0% | 지연 위험: 0건 | 총 업무: 0건"
}
```

---

## 다음 단계

1. **Vercel Functions Logs 확인** (가장 중요!)
   - 정확한 오류 원인을 알 수 있습니다
2. **환경 변수 확인 및 수정**
   - `FIREBASE_SERVICE_ACCOUNT_JSON` 재확인
3. **재배포 및 재테스트**
   - 환경 변수 수정 후 Redeploy
   - 다시 함수 호출하여 확인

---

## 참고

- 함수는 정상적으로 배포되었습니다
- 문제는 실행 중 발생하는 오류입니다
- Logs를 확인하면 정확한 원인을 알 수 있습니다
