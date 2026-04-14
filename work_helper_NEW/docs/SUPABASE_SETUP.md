# Supabase Storage 설정 방법 (지식 문서 원문 보기)

지식 베이스에 PDF/HWP를 업로드했을 때 **「원문 보기」**로 파일을 열 수 있도록 Supabase Storage를 사용합니다.  
아래 순서대로 설정하면 됩니다.

---

## 1. Supabase 프로젝트 만들기

1. **Supabase** 접속: https://supabase.com  
2. 로그인 후 **New project** 클릭  
3. **Organization** 선택(없으면 생성)  
4. **Name**: 예) `work-helper`  
5. **Database Password**: 비밀번호 설정 후 기억해 두기  
6. **Region**: 가까운 지역 선택 (예: Northeast Asia (Seoul))  
7. **Create new project** 클릭 → 프로젝트 생성 완료될 때까지 대기  

---

## 2. Storage 버킷 생성

1. 왼쪽 메뉴에서 **Storage** 클릭  
2. **New bucket** 클릭  
3. **Name**: `knowledge` (그대로 입력)  
4. **Public bucket**: **ON** 으로 설정  
   - 켜두면 업로드된 파일 URL로 누구나 읽기 가능(원문 보기에 필요)  
5. **Create bucket** 클릭  

---

## 3. 버킷 정책 설정 (읽기 공개 + 업로드 허용)

Supabase Storage는 기본적으로 익명 업로드를 막아 둡니다. 아래 두 정책을 추가합니다.

1. **Storage** → **Policies** 탭 → **New Policy** (또는 `knowledge` 버킷 선택 후 정책 추가)

**정책 1 – 읽기(원문 보기)**  
- Policy name: `Public read for knowledge`  
- Allowed operation: **SELECT** (Read)  
- Target: `knowledge` 버킷  
- USING expression: `true`  

**정책 2 – 업로드(지식 추가 시)**  
- Policy name: `Allow upload to knowledge`  
- Allowed operation: **INSERT** (Create)  
- Target: `knowledge` 버킷  
- WITH CHECK expression: `true`  

(정책 UI가 다르면, "Enable read access for all users" / "Enable upload for anon" 같은 템플릿이 있으면 해당 버킷에 적용)

2. 버킷을 **Public**으로 두면 파일 URL만 알면 누구나 읽을 수 있어 원문 보기에 적합합니다.

---

## 4. API 키 복사

1. 왼쪽 메뉴 **Project Settings** (휴지통 아이콘) 클릭  
2. **API** 메뉴 선택  
3. 아래 두 값을 복사:
   - **Project URL** → `.env` 의 `VITE_SUPABASE_URL`
   - **Project API keys** 중 **anon public** 키 → `.env` 의 `VITE_SUPABASE_ANON_KEY`  

---

## 5. 프로젝트에 환경 변수 설정

1. 프로젝트 루트의 **`.env`** 파일 열기 (없으면 `.env.example` 복사 후 `.env` 생성)  
2. 아래 두 줄 추가 또는 수정:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- `VITE_SUPABASE_URL`: 4번에서 복사한 **Project URL**  
- `VITE_SUPABASE_ANON_KEY`: 4번에서 복사한 **anon public** 키  

3. 저장 후 **개발 서버 재시작** (예: `npm run dev` 다시 실행)  

---

## 6. 동작 확인

1. 앱에서 **관리자 모드** → **지식 추가** 탭 이동  
2. PDF 또는 HWP 파일 업로드 후 **지식 베이스에 추가하기** 실행  
3. 채팅에서 해당 지식이 참조된 답변의 **참고 출처** 클릭  
4. 모달에서 **「원문 보기」** 클릭 → 새 탭에서 PDF가 열리면 정상 동작  

---

## 문제 해결

| 현상 | 확인 사항 |
|------|------------|
| 원문 보기 버튼이 안 보임 | 지식 업로드 시 Supabase에 파일이 올라갔는지 Storage → `knowledge` 버킷에서 확인. `.env`에 `VITE_SUPABASE_*` 설정 후 서버 재시작했는지 확인. |
| 원문 보기 클릭 시 403/404 | 버킷이 **Public**인지, Policies에서 읽기(SELECT)가 허용되었는지 확인. |
| 업로드 실패 | Supabase 대시보드 **Storage** → **knowledge** 버킷의 **Policies**에서 `INSERT`(업로드)가 anon 또는 인증된 사용자에게 허용되어 있는지 확인. 새 버킷은 기본적으로 anon 업로드가 막혀 있을 수 있으므로, 필요 시 anon용 `INSERT` 정책 추가. |

---

## 참고

- **Firebase**는 계속 **Firestore**(채팅, 지식 메타데이터 등)용으로 사용합니다.  
- **Supabase**는 **지식 문서 파일(PDF) 저장·원문 URL** 용도로만 사용합니다.  
- 무료 플랜: 저장 1GB, 트래픽 2GB/월 (Supabase 기준).
