# MongoDB 연결 테스트 가이드

## 현재 상태
- ✅ 서버 실행 중: http://localhost:3005
- ⚠️ 경고 메시지 발생 (다른 원인일 수 있음)

## 테스트 방법

### 1. 브라우저에서 접속
http://localhost:3005 접속

### 2. 일기 목록 확인
- 페이지가 정상적으로 로드되는지 확인
- 일기 목록이 표시되는지 확인

### 3. 새 일기 작성 테스트
- 일기 작성 기능 테스트
- MongoDB에 데이터가 저장되는지 확인

### 4. MongoDB Atlas에서 확인
1. MongoDB Atlas 대시보드 접속
2. "Database" → "Browse Collections" 클릭
3. `whatdidwedotoday` 데이터베이스 확인
4. `diaries` 컬렉션에 데이터가 있는지 확인

## 연결 문자열 수정 사항

연결 문자열을 다음과 같이 수정했습니다:
- 데이터베이스 이름을 경로에 추가: `/whatdidwedotoday`
- `retryWrites=true&w=majority` 파라미터 추가

## 문제 해결

### 서버 재시작
```bash
# 서버 중지 (Ctrl+C)
# 다시 시작
npm run dev
```

### MongoDB 연결 확인
브라우저 콘솔에서 네트워크 요청 확인:
- `/api/diary` 요청이 성공하는지 확인
- 에러 메시지 확인
