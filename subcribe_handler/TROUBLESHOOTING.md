# 서버 접속 문제 해결 가이드

## 서버 상태 확인

서버는 정상적으로 실행 중입니다:
- 포트: 3002
- 상태: ✅ Ready
- URL: http://localhost:3002

## 브라우저에서 접속이 안 될 때

### 1. 브라우저 캐시 삭제
- Chrome: Cmd+Shift+Delete (Mac) 또는 Ctrl+Shift+Delete (Windows)
- 또는 시크릿 모드로 접속: Cmd+Shift+N (Mac) / Ctrl+Shift+N (Windows)

### 2. 하드 새로고침
- Mac: Cmd+Shift+R
- Windows: Ctrl+Shift+R
- 또는 개발자 도구 열고 새로고침 버튼을 길게 눌러 "캐시 비우기 및 강력 새로고침" 선택

### 3. 다른 브라우저로 시도
- Safari, Firefox 등 다른 브라우저로 접속해보기

### 4. 방화벽 확인
- 로컬호스트 접속이 차단되지 않았는지 확인

### 5. 터미널에서 직접 확인
```bash
curl http://localhost:3002
```
이 명령이 작동하면 서버는 정상입니다.

## 서버 재시작 방법

터미널에서:
```bash
cd "/Volumes/Samsung USB/subcribe_handler"
pkill -f "next dev"
npm run dev
```

## 현재 서버 정보
- 포트: 3002
- 로컬 URL: http://localhost:3002
- 네트워크 URL: http://192.168.100.99:3002

## 추가 확인 사항

1. **다른 포트 사용 중인지 확인**
   - 포트 3000, 3001, 3002 중 다른 포트를 사용하는 프로세스가 있는지 확인

2. **환경 변수 확인**
   - `.env.local` 파일이 올바르게 설정되어 있는지 확인

3. **서버 로그 확인**
   - 터미널에서 서버 실행 로그를 확인하여 에러 메시지가 있는지 확인


