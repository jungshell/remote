# Vercel 무료 플랜 성능 개선 가이드

아래 설정은 비용 증가 없이 콜드스타트 체감을 줄이기 위한 권장값입니다.

## 1) 무료 워밍업(UptimeRobot)

1. [UptimeRobot](https://uptimerobot.com/) 가입
2. Monitor Type: `HTTP(s)`
3. URL 2개 등록
   - `https://fccg-inoi.vercel.app`
   - `https://fccg-inoi.vercel.app/api/auth/health`
4. Monitoring Interval: `5 minutes`
5. Friendly Name 예시
   - `fccg-frontend`
   - `fccg-backend-health`

이렇게 설정하면 장시간 유휴 상태 진입 빈도를 줄여 첫 접속 지연이 완화됩니다.

## 2) 현재 코드에 반영된 항목

- 프론트 API 요청
  - GET 요청 타임아웃 단축(15초)
  - 네트워크/타임아웃 시 1회 자동 재시도
- 라우트 지연 로딩
  - 주요 페이지를 `React.lazy` + `Suspense`로 분리 로딩
- 앱 시작 워밍업
  - 앱 로드시 백엔드 `health` 비동기 호출
- 공휴일 API 캐시
  - `Cache-Control` 적용으로 반복 요청 비용 완화

## 3) 운영 체크 포인트

- 배포 직후 1회 수동 접속으로 초기 캐시 형성
- 지연 체감 시 UptimeRobot 로그에서 ping 실패 구간 확인
- 백엔드 health 응답 200 유지 여부 확인
