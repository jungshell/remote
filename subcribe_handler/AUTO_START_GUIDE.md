# 자동 시작 설정 가이드

이 프로젝트는 Mac의 launchd를 사용하여 컴퓨터를 재시작해도 자동으로 서버가 시작되도록 설정되어 있습니다.

## 현재 상태

✅ **서버 자동 시작 설정 완료**
- 서비스 이름: `com.subcribe_handler`
- 포트: 3002
- 접속 URL: http://localhost:3002

## 서비스 관리 명령어

### 서비스 시작
```bash
launchctl load ~/Library/LaunchAgents/com.subcribe_handler.plist
```

### 서비스 중지
```bash
launchctl unload ~/Library/LaunchAgents/com.subcribe_handler.plist
```

### 서비스 재시작
```bash
launchctl unload ~/Library/LaunchAgents/com.subcribe_handler.plist
launchctl load ~/Library/LaunchAgents/com.subcribe_handler.plist
```

### 서비스 상태 확인
```bash
launchctl list | grep subcribe_handler
```

### 서비스 로그 확인
```bash
# 출력 로그
tail -f "/Volumes/Samsung USB/subcribe_handler/logs/output.log"

# 에러 로그
tail -f "/Volumes/Samsung USB/subcribe_handler/logs/error.log"
```

## 수동으로 서버 실행하기

자동 시작을 사용하지 않고 수동으로 실행하려면:

```bash
cd "/Volumes/Samsung USB/subcribe_handler"
npm start
```

## 문제 해결

### 서버가 시작되지 않을 때

1. **로그 확인**
   ```bash
   cat "/Volumes/Samsung USB/subcribe_handler/logs/error.log"
   ```

2. **Node.js 경로 확인**
   ```bash
   which node
   which npm
   ```

3. **프로젝트 경로 확인**
   - plist 파일의 `WorkingDirectory`가 올바른지 확인
   - 현재 경로: `/Volumes/Samsung USB/subcribe_handler`

4. **수동으로 빌드 확인**
   ```bash
   cd "/Volumes/Samsung USB/subcribe_handler"
   npm run build
   ```

### 포트가 이미 사용 중일 때

```bash
# 포트 3002를 사용하는 프로세스 확인
lsof -ti:3002

# 프로세스 종료
kill -9 $(lsof -ti:3002)
```

## 자동 시작 비활성화

자동 시작을 비활성화하려면:

```bash
launchctl unload ~/Library/LaunchAgents/com.subcribe_handler.plist
rm ~/Library/LaunchAgents/com.subcribe_handler.plist
```

## 참고 사항

- 서버는 컴퓨터가 부팅될 때 자동으로 시작됩니다
- 서버가 종료되면 자동으로 재시작됩니다 (KeepAlive 설정)
- 로그는 `logs/` 디렉토리에 저장됩니다
- 프로덕션 모드로 실행되므로 코드 변경 후에는 `npm run build`를 다시 실행해야 합니다

