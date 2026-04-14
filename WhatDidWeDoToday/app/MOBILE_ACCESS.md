# 모바일 접속 가이드

## 방법 1: 같은 Wi-Fi 네트워크 접속 (권장)

### 1단계: 서버 실행
터미널에서 다음 명령어 실행:
```bash
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
PORT=3005 npm run dev
```

### 2단계: 네트워크 IP 확인
터미널에 다음과 같이 표시됩니다:
```
- Local:        http://localhost:3005
- Network:      http://192.168.x.x:3005
```

### 3단계: 모바일에서 접속
- 컴퓨터와 모바일이 **같은 Wi-Fi**에 연결되어 있어야 합니다
- 모바일 브라우저에서 `http://192.168.x.x:3005` 접속
- `192.168.x.x`는 터미널에 표시된 Network 주소입니다

### 문제 해결
1. **연결 안 될 때:**
   - 컴퓨터와 모바일이 같은 Wi-Fi인지 확인
   - 방화벽이 포트 3005를 막고 있는지 확인
   - 서버가 제대로 실행 중인지 확인 (터미널에 "Ready" 표시 확인)

2. **IP 주소가 다를 때:**
   - 컴퓨터의 실제 IP 주소 확인:
     ```bash
     ifconfig | grep "inet " | grep -v 127.0.0.1
     ```

---

## 방법 2: ngrok 사용 (외부 접속)

### 1단계: ngrok 설치
```bash
brew install ngrok
```

### 2단계: ngrok 계정 생성 및 인증
1. https://ngrok.com 에서 무료 계정 생성
2. 인증 토큰 받기
3. 터미널에서:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

### 3단계: 서버 실행
```bash
cd "/Volumes/Samsung USB/WhatDidWeDoToday/app"
PORT=3005 npm run dev
```

### 4단계: ngrok 터널 생성
새 터미널에서:
```bash
ngrok http 3005
```

### 5단계: 모바일에서 접속
- ngrok이 제공하는 URL 사용 (예: `https://xxxx.ngrok.io`)
- 이 URL은 어디서든 접속 가능합니다

---

## 방법 3: Vercel 배포 (가장 간단)

1. GitHub에 코드 푸시
2. Vercel에 연결
3. 자동 배포 후 URL로 모바일 접속

---

## 현재 네트워크 정보

- 로컬: `http://localhost:3005`
- 네트워크: `http://192.168.45.217:3005` (변경될 수 있음)
