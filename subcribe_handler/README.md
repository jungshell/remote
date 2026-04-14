# 정기구독 해지 방어기

AI로 자동 분석하는 정기구독 관리 서비스입니다. 결제 알림 텍스트를 입력하면 Gemini AI가 자동으로 구독 정보를 추출하고, 대시보드에서 한눈에 관리할 수 있습니다.

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 1.5 Flash
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 주요 기능

- 🤖 **AI 텍스트 분석**: 결제 알림 문자/이메일을 AI가 자동으로 파싱
- 📊 **대시보드**: 구독 서비스 목록을 카드 형태로 한눈에 확인
- ⚠️ **해지 알림**: 다음 결제일이 3일 이내인 서비스에 경고 표시
- 🔗 **해지 링크**: 각 서비스의 해지 페이지로 바로 이동
- 💰 **통계**: 월간 총 결제액 자동 계산

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 입력하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 대시보드에서 `SQL Editor` 열기
3. `supabase/schema.sql` 파일의 내용을 복사하여 실행

### 3. API 키 발급

#### Supabase
- 프로젝트 생성 후 `Settings` > `API`에서 URL과 Anon Key 확인

#### Google Gemini API
- [Google AI Studio](https://aistudio.google.com/) 접속
- API 키 생성 (무료 할당량 제공)

### 4. 의존성 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
subcribe_handler/
├── app/
│   ├── actions/
│   │   └── subscription.ts      # 서버 액션 (AI 분석, DB 저장)
│   ├── components/
│   │   ├── SubscriptionCard.tsx  # 구독 카드 컴포넌트
│   │   └── TextAnalyzer.tsx      # 텍스트 분석기 컴포넌트
│   ├── layout.tsx                # 루트 레이아웃
│   └── page.tsx                  # 메인 페이지
├── lib/
│   └── supabase.ts               # Supabase 클라이언트
├── supabase/
│   └── schema.sql                # 데이터베이스 스키마
└── .env.local                    # 환경 변수 (gitignore)
```

## 사용 방법

1. **구독 정보 추가**
   - 결제 알림 문자나 이메일의 텍스트를 복사
   - 상단의 텍스트 입력창에 붙여넣기
   - "AI로 분석하기" 버튼 클릭
   - 분석 결과 확인 후 "저장하기" 클릭

2. **구독 관리**
   - 대시보드에서 모든 구독 서비스 확인
   - 다음 결제일이 3일 이내인 서비스는 빨간색 경고 표시
   - "해지하러 가기" 버튼으로 해지 페이지 이동
   - "해지 완료" 버튼으로 구독 상태 변경

## 향후 개선 사항

- [ ] 사용자 인증 시스템 (Supabase Auth)
- [ ] 결제 내역 히스토리
- [ ] 알림 설정 (이메일/브라우저)
- [ ] 영수증 이미지 업로드 (Vision API)
- [ ] CSV/Excel 내보내기
- [ ] 다국어 지원

## 라이선스

MIT
