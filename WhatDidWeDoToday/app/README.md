# 우리가족 일기 자동생성

음성 녹음 → 텍스트 자동 변환 → 요약/정리 → 그림일기 카드까지 자동 생성하는 웹앱입니다.

## 주요 기능

- 🎙️ **음성 녹음 및 자동 변환**: Web Speech API를 사용한 실시간 음성 인식
- 📝 **자동 일기 생성**: LLM(Gemini/Groq)을 활용한 일기 요약 및 정리
- 🎨 **그림 자동 생성**: 4컷 만화 스타일의 그림 자동 생성
- 📸 **사진 업로드 및 분석**: 사진 업로드 시 자동 분석 및 일기 내용 추론 (Gemini → Hugging Face 자동 폴백)
- 👥 **가족 구성원별 통계**: 개인화된 대시보드 및 통계 비교
- 📊 **통계 대시보드**: 키워드, 장소, 기분 점수 등 다양한 통계
- 📅 **타임라인**: 시간순으로 정렬된 일기 타임라인
- 🔍 **검색 기능**: 날짜, 키워드, 장소 등으로 일기 검색
- 📄 **PDF 내보내기**: 일기를 PDF로 저장
- 🔗 **공유 기능**: QR 코드 및 링크 공유

## 빠른 시작

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` (또는 설정한 포트)을 열어 확인합니다.

## 필수 환경 변수

`.env.local` 에 아래 값을 채워주세요.

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com

GEMINI_API_KEY=...
GROQ_API_KEY=...

# 사진 분석 폴백 (선택사항, Gemini 한도 초과 시 사용)
HUGGINGFACE_API_KEY=...  # Hugging Face Inference API 키 (무료)
HUGGINGFACE_MODEL=Salesforce/blip-image-captioning-base  # 기본값
```

## Firebase 설정 (무료)

1. Firebase 콘솔에서 새 프로젝트 생성
2. **Firestore Database** 활성화
3. **웹 앱 등록** 후 Web SDK 키 복사
4. **서비스 계정 키(JSON)** 생성  
   - 생성한 JSON 내용을 그대로 `FIREBASE_SERVICE_ACCOUNT` 에 붙여넣기
5. Storage는 현재 단계에서는 생략 (업그레이드 필요)

## API 폴백 시스템

### 텍스트 생성 (일기 생성)
- 기본은 Gemini로 요청합니다.
- Gemini 응답이 실패하거나 JSON이 깨지면 Groq로 자동 전환합니다.

### 사진 분석
- 기본은 Gemini Vision API를 사용합니다.
- Gemini 한도 초과(429) 또는 서비스 불가(503) 시 **Hugging Face Inference API**로 자동 전환합니다.
- Hugging Face는 무료 티어를 제공하며, 월 $0.10 크레딧과 시간당 수백 건의 요청을 지원합니다.

#### Hugging Face API 설정 방법 (무료)
1. [Hugging Face](https://huggingface.co/)에 무료 계정 생성
2. [Settings > Access Tokens](https://huggingface.co/settings/tokens)에서 새 토큰 생성
   - 권한: `Inference > Make calls to the serverless Inference API` 선택
3. 생성한 토큰을 `.env.local`의 `HUGGINGFACE_API_KEY`에 설정
4. (선택) 다른 vision 모델을 사용하려면 `HUGGINGFACE_MODEL` 환경 변수 설정

**추천 무료 Vision 모델:**
- `Salesforce/blip-image-captioning-base` (기본값, 한국어 지원)
- `nlpconnect/vit-gpt2-image-captioning` (대안)

## 음성 인식 안내

- 브라우저의 Web Speech API를 사용합니다.
- Chrome에서 가장 안정적이며, 지원되지 않는 경우 텍스트를 직접 입력하세요.

## Storage 관련 안내

- Firebase Storage는 프로젝트 업그레이드(Blaze)가 필요할 수 있습니다.
- 현재 구현은 **오디오를 서버에 저장하지 않고** 브라우저에서만 재생합니다.
- 이후 업그레이드를 원하면 Storage 업로드를 다시 연결할 수 있습니다.

## 기술 스택

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Admin SDK)
- **LLM**: Google Gemini API (주), Groq API (폴백)
- **이미지 생성**: Pollinations.ai, Hugging Face FLUX (선택)
- **음성 인식**: Web Speech API
- **위치/날씨**: Open-Meteo API, Nominatim OpenStreetMap

## 프로젝트 구조

```
app/
├── src/
│   ├── app/
│   │   ├── api/          # API 라우트
│   │   │   ├── diary/     # 일기 CRUD
│   │   │   ├── photo/     # 사진 업로드 및 분석
│   │   │   ├── stats/     # 통계 데이터
│   │   │   ├── timeline/  # 타임라인 데이터
│   │   │   ├── summary/   # 요약 생성
│   │   │   ├── profile/   # 가족 프로필 관리
│   │   │   ├── pdf/       # PDF 생성
│   │   │   └── share/     # 공유 기능
│   │   ├── page.tsx       # 메인 페이지
│   │   └── share/[id]/    # 공유 페이지
│   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── Dashboard.tsx  # 개인화된 대시보드
│   │   └── LoadingSpinner.tsx
│   └── lib/              # 유틸리티 및 설정
│       ├── types.ts      # TypeScript 타입 정의
│       ├── utils.ts      # 유틸리티 함수
│       ├── errorHandler.ts # 에러 핸들링
│       ├── llm.ts        # LLM 통신
│       ├── firebaseClient.ts
│       └── firebaseAdmin.ts
```

## 주요 기능 상세

### 1. 일기 생성
- 음성 녹음 또는 텍스트 입력
- 사진 업로드 (여러 장 가능)
- 자동 위치 및 날씨 정보 수집
- LLM을 통한 자동 요약 및 정리
- 4컷 만화 스타일 그림 자동 생성

### 2. 통계 및 분석
- 가족 구성원별 통계 비교
- 키워드 빈도 분석
- 장소별 방문 횟수
- 기분 점수 추이
- 월별/주별 요약

### 3. 개인화
- 가족 구성원별 색상 테마
- 개인화된 대시보드
- 구성원별 일기 필터링

### 4. 사진 기능
- 다중 사진 업로드
- 자동 이미지 리사이징 (서버 사이드)
- 사진 내용 분석 (Gemini Vision API → Hugging Face 자동 폴백)
- 얼굴 특징 추출 및 저장
- 사진 기반 일기 내용 추론
- **사진 분석 결과는 대화 텍스트에 자동 입력되지 않음** (일기 생성 시에만 사용)

## 개발 가이드

### 환경 변수 설정

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
# Firebase (클라이언트)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase (서버)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com

# LLM API
GEMINI_API_KEY=...
GROQ_API_KEY=...

# 사진 분석 폴백 (선택사항, Gemini 한도 초과 시 사용)
HUGGINGFACE_API_KEY=...  # Hugging Face Inference API 키 (무료)
HUGGINGFACE_MODEL=Salesforce/blip-image-captioning-base  # 기본값

# 4컷 이미지: NanoBanana 사용 시 (한글 캡션 품질 향상, 설정하면 Pollinations 대신 사용)
NANOBANANA_API_KEY=...   # https://nanobananaapi.ai/api-key 에서 발급

# 선택사항
GEMINI_MODEL=gemini-2.5-flash
GROQ_MODEL=llama-3.1-8b-instant
```

### 코드 품질

- **타입 안정성**: TypeScript를 사용하여 타입 안정성 보장
- **에러 핸들링**: 통일된 에러 핸들링 시스템
- **코드 구조**: 재사용 가능한 컴포넌트 및 유틸리티 함수

## 배포

Vercel에 배포하면 가장 간단합니다. 배포 시에도 위 환경변수를 동일하게 설정하세요.

### 모바일 접근

개발 환경에서 모바일로 접근하려면:
1. 로컬 네트워크 IP 사용: `http://[로컬IP]:3000`
2. 또는 ngrok 사용: `ngrok http 3000`

## 라이선스

MIT
