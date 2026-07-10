# Supabase 연동 가이드

## 1. Supabase 프로젝트 생성 (무료)

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. **SQL Editor**에서 순서대로 실행:
   - `supabase/schema.sql` (초기 스키마)
   - `supabase/migration_002.sql` (회차·응답자 유형 등)
   - `supabase/migration_003_auth.sql` (계정·세션 테이블)
3. **Project Settings → API**에서 아래 값 복사:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)

## 2. `.env.local` 예시

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_SETUP_SECRET=your-one-time-setup-secret
```

## 3. 계정·승인 흐름

| 단계 | 경로 | 설명 |
|---|---|---|
| 1 | `/register` | 사업담당자 가입 (`status=pending`) |
| 2 | `POST /api/auth/setup-admin` | 최초 총괄 관리자 1명 생성 (관리자 0명일 때만) |
| 3 | `/login` → `/admin` | 관리자 로그인 후 **회원 승인** |
| 4 | `/login` → `/manager` | 승인된 담당자 로그인 → 설문 생성·운영 |

### 최초 관리자 생성

`.env.local`에 `ADMIN_SETUP_SECRET`을 설정한 뒤, 아래와 같이 1회 호출합니다.

```bash
curl -X POST http://localhost:3000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"your-secret\",\"email\":\"admin@example.com\",\"password\":\"secure-password\",\"name\":\"총괄관리자\",\"division\":\"경영혁신본부\"}"
```

### 역할별 접근

| 경로 | 역할 | 비고 |
|---|---|---|
| `/manager` | `staff` (승인됨) | 관리자도 접근 가능 |
| `/admin` | `admin` (승인됨) | 회원 승인·KPI·Excel |
| `/survey/[id]` | 없음 | 참여자 공개 설문 (진행중만) |

세션은 HTTP-only 쿠키(`platform_session`)로 7일 유지됩니다.

## 4. 무료 tier 한도 및 유료 전환 시점

| 항목 | Free | Pro ($25/월) 검토 시점 |
|---|---|---|
| DB 용량 | 500MB | 응답·연도 누적 시 |
| 프로젝트 pause | 1주 비활성 시 | 상시 운영 필요 시 |
| 대역폭 | 제한 있음 | 동시 접속·QR 대량 유입 시 |

**호스팅:** Vercel Free 또는 Render Free Web Service로 충분합니다.

## 5. Google Drive (2단계)

PDF·Drive 자동화는 `GoogleActionPanel`과 Apps Script를 그대로 두었습니다.  
Supabase가 primary 저장소이며, 보고 자동화는 필요 시 Sheet 동기화 API를 추가합니다.
