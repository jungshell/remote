# Gemini API 문제 해결 가이드

## 현재 발생한 오류

500 Internal Server Error - Gemini API 모델을 찾을 수 없음

## 해결 방법

### 1. 모델 이름 확인

현재 코드는 `gemini-pro` 모델을 사용하도록 수정되었습니다. 

만약 여전히 오류가 발생한다면, 다음 중 하나를 시도해보세요:

#### 방법 A: Google AI Studio에서 확인
1. [Google AI Studio](https://aistudio.google.com/) 접속
2. 좌측 메뉴에서 "Get API Key" 클릭
3. API 키가 유효한지 확인
4. 사용 가능한 모델 목록 확인

#### 방법 B: 모델 이름 변경
`app/actions/subscription.ts` 파일의 29번째 줄을 수정:

```typescript
// 현재
const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

// 대체 옵션들
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
// 또는
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
```

### 2. API 키 확인

`.env.local` 파일에서 API 키가 올바른지 확인:

```env
GEMINI_API_KEY=AIzaSy... (올바른 키인지 확인)
```

### 3. API 키 재생성

1. [Google AI Studio](https://aistudio.google.com/) 접속
2. 기존 API 키 삭제
3. 새 API 키 생성
4. `.env.local` 파일에 새 키 입력
5. 개발 서버 재시작

### 4. 개발 서버 재시작

모델 이름이나 API 키를 변경한 후에는 반드시 서버를 재시작하세요:

```bash
# 서버 중지 (Ctrl+C)
# 그 다음 다시 시작
npm run dev
```

## 테스트 방법

브라우저 콘솔이나 터미널에서 다음 명령으로 확인:

```bash
curl http://localhost:3000/api/test-connection
```

또는 브라우저에서:
```
http://localhost:3000/api/test-connection
```

## 일반적인 오류 메시지

### "API key is invalid"
- API 키가 잘못되었거나 만료됨
- 새 API 키 생성 필요

### "Model not found"
- 모델 이름이 잘못됨
- `gemini-pro`로 변경 시도

### "Quota exceeded"
- API 사용량 한도 초과
- 다음 달까지 대기하거나 유료 플랜으로 업그레이드

### "Rate limit exceeded"
- 너무 빠르게 요청함
- 잠시 후 다시 시도

## 추가 도움말

문제가 계속되면:
1. Google AI Studio에서 API 키 상태 확인
2. 사용 가능한 모델 목록 확인
3. API 키 권한 확인 (필요한 권한이 모두 활성화되어 있는지)


