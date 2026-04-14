# 배포 사이트 점검 및 테스트 가이드

## 🎯 테스트 목표

배포된 Vercel 사이트가 정상적으로 작동하는지 확인합니다.

## 📋 테스트 항목

### 1. 기본 접속 테스트

#### 메인 페이지
- **URL**: `https://your-project.vercel.app/`
- **예상 결과**: 정기구독 해지 방어기 메인 페이지가 정상적으로 표시됨
- **확인 사항**:
  - ✅ 페이지가 로드됨
  - ✅ "정기구독 해지 방어기" 제목 표시
  - ✅ "결제 알림 분석하기" 섹션 표시
  - ✅ "구독 중인 서비스" 섹션 표시

### 2. API 엔드포인트 테스트

#### 2.1 연결 테스트 API
- **URL**: `https://your-project.vercel.app/api/test-connection`
- **예상 결과**: JSON 응답으로 환경 변수 및 연결 상태 확인
- **확인 사항**:
  ```json
  {
    "env_variables": {
      "supabase_url": "✅ 설정됨",
      "supabase_key": "✅ 설정됨",
      "gemini_key": "✅ 설정됨"
    },
    "supabase_connection": {
      "status": "✅ 연결 성공"
    },
    "tables": {
      "subscriptions": "✅ 존재함",
      "user_settings": "✅ 존재함",
      "notification_history": "✅ 존재함"
    },
    "summary": {
      "status": "✅ 모든 설정 완료"
    }
  }
  ```

#### 2.2 Gemini API 테스트
- **URL**: `https://your-project.vercel.app/api/test-gemini`
- **예상 결과**: Gemini API 연결 및 모델 테스트 결과
- **확인 사항**:
  - ✅ API 키가 설정되어 있음
  - ✅ 하나 이상의 모델이 작동함
  - ✅ 추천 모델이 표시됨

#### 2.3 모델 목록 API
- **URL**: `https://your-project.vercel.app/api/list-models`
- **예상 결과**: 사용 가능한 Gemini 모델 목록
- **확인 사항**:
  - ✅ 모델 목록이 반환됨
  - ✅ 각 모델의 상태가 표시됨

#### 2.4 Cron Job 엔드포인트
- **URL**: `https://your-project.vercel.app/api/cron/check-notifications`
- **예상 결과**: 
  - `CRON_SECRET`이 설정되어 있으면 401 (정상)
  - 설정되어 있지 않으면 200 또는 500
- **확인 사항**:
  - ✅ 엔드포인트가 접근 가능함
  - ✅ 보안 설정이 작동함 (CRON_SECRET 설정 시)

### 3. 기능 테스트

#### 3.1 AI 텍스트 분석 기능
1. 메인 페이지 접속
2. "결제 알림 텍스트 붙여넣기" 입력창에 테스트 텍스트 입력:
   ```
   넷플릭스에서 9,500원이 결제되었습니다. 다음 결제일은 2024년 2월 15일입니다.
   ```
3. "AI로 분석하기" 버튼 클릭
4. **확인 사항**:
   - ✅ 분석 결과가 표시됨
   - ✅ 서비스명, 금액, 결제일이 올바르게 추출됨
   - ✅ "저장하기" 버튼이 활성화됨

#### 3.2 구독 정보 저장
1. 분석 결과 확인 후 "저장하기" 클릭
2. **확인 사항**:
   - ✅ 저장 성공 메시지 표시
   - ✅ 구독 목록에 새 항목 추가됨

#### 3.3 구독 목록 표시
1. 메인 페이지 하단의 "구독 중인 서비스" 섹션 확인
2. **확인 사항**:
   - ✅ 저장된 구독 정보가 카드 형태로 표시됨
   - ✅ 서비스명, 금액, 다음 결제일이 표시됨
   - ✅ 해지 링크 버튼이 표시됨

#### 3.4 Slack 알림 설정 (선택사항)
1. "Slack 알림 설정" 버튼 클릭
2. Slack Webhook URL 입력
3. 알림 일수 설정 (기본값: 3일)
4. "저장" 클릭
5. **확인 사항**:
   - ✅ 설정이 저장됨
   - ✅ "알림 테스트" 버튼으로 테스트 가능

## 🧪 자동 테스트 스크립트 사용

터미널에서 다음 명령어로 자동 테스트를 실행할 수 있습니다:

```bash
# 실행 권한 부여
chmod +x test-deployment.sh

# 테스트 실행 (배포된 URL을 인자로 전달)
./test-deployment.sh https://your-project.vercel.app
```

### 스크립트가 테스트하는 항목:
1. ✅ 메인 페이지 접속
2. ✅ 연결 테스트 API
3. ✅ Gemini API 테스트
4. ✅ 모델 목록 API
5. ✅ Cron Job 엔드포인트

## 🔍 수동 테스트 방법

### 브라우저에서 테스트

1. **메인 페이지**: 
   - `https://your-project.vercel.app` 접속
   - 페이지가 정상적으로 로드되는지 확인

2. **API 테스트**:
   - `https://your-project.vercel.app/api/test-connection` 접속
   - JSON 응답 확인

### curl 명령어로 테스트

```bash
# 메인 페이지
curl -I https://your-project.vercel.app

# 연결 테스트 API
curl https://your-project.vercel.app/api/test-connection | jq .

# Gemini API 테스트
curl https://your-project.vercel.app/api/test-gemini | jq .

# 모델 목록
curl https://your-project.vercel.app/api/list-models | jq .
```

## ⚠️ 문제 해결

### 환경 변수 오류
- **증상**: `Error: Missing Supabase environment variables`
- **해결**: Vercel 대시보드에서 환경 변수 확인 및 설정

### Supabase 연결 실패
- **증상**: `supabase_connection.status: "❌ 연결 실패"`
- **해결**: 
  1. Supabase 프로젝트가 활성화되어 있는지 확인
  2. `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 확인
  3. Supabase 대시보드에서 프로젝트 상태 확인

### 테이블 없음 오류
- **증상**: `tables.subscriptions: "❌ 테이블 없음"`
- **해결**: Supabase SQL Editor에서 `supabase/schema.sql` 실행

### Gemini API 오류
- **증상**: `gemini_api.status: "❌ 연결 실패"`
- **해결**:
  1. `GEMINI_API_KEY`가 올바르게 설정되었는지 확인
  2. API 키가 유효한지 확인
  3. 할당량이 남아있는지 확인

## ✅ 체크리스트

배포 후 확인:

- [ ] 메인 페이지 정상 로드
- [ ] 환경 변수 모두 설정됨
- [ ] Supabase 연결 성공
- [ ] 모든 테이블 존재
- [ ] Gemini API 연결 성공
- [ ] AI 텍스트 분석 기능 작동
- [ ] 구독 정보 저장 기능 작동
- [ ] 구독 목록 표시 기능 작동
- [ ] Cron Job 엔드포인트 접근 가능
- [ ] Vercel Cron Jobs 설정 확인 (선택사항)

## 📊 성능 확인

### Vercel 대시보드에서 확인:
1. **Deployments**: 배포 상태 확인
2. **Analytics**: 트래픽 및 성능 확인
3. **Functions**: 서버리스 함수 실행 시간 확인
4. **Cron Jobs**: 스케줄된 작업 확인

---

**테스트 완료 후 문제가 있으면 Vercel 대시보드의 로그를 확인하세요!**

