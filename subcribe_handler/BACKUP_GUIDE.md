# 백업 가이드

## ✅ 백업 완료

### 1. Git 원격 저장소 백업
- **저장소**: `https://github.com/jungshell/subscribe.git`
- **상태**: 모든 변경사항이 GitHub에 푸시됨
- **확인**: GitHub에서 최신 커밋 확인 가능

### 2. 로컬 백업 파일
- **위치**: `/Volumes/Samsung USB/`
- **파일명**: `subcribe_handler_backup_YYYYMMDD_HHMMSS.tar.gz`
- **포함 내용**:
  - 모든 소스 코드
  - 설정 파일
  - 문서 파일
  - `node_modules` 제외 (재설치 가능)
  - `.next` 제외 (빌드 결과물)
  - `.git` 제외 (Git 저장소는 별도 관리)

## 📦 백업 복원 방법

### 로컬 백업 파일 복원
```bash
# 1. 백업 파일 압축 해제
cd "/Volumes/Samsung USB"
tar -xzf subcribe_handler_backup_YYYYMMDD_HHMMSS.tar.gz

# 2. 의존성 재설치
cd subcribe_handler
npm install

# 3. 환경 변수 설정
# .env.local 파일 생성 및 환경 변수 추가

# 4. 빌드
npm run build
```

### Git에서 복원
```bash
# 1. 저장소 클론
git clone https://github.com/jungshell/subscribe.git subcribe_handler

# 2. 의존성 설치
cd subcribe_handler
npm install

# 3. 환경 변수 설정
# .env.local 파일 생성

# 4. 빌드
npm run build
```

## 💾 데이터베이스 백업

### Supabase 백업 방법

#### 방법 1: Supabase 대시보드 (권장)
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** > **Database** > **Backups**
4. 수동 백업 생성 또는 자동 백업 확인

#### 방법 2: SQL 덤프
Supabase SQL Editor에서:
```sql
-- 모든 테이블 데이터 내보내기
-- Supabase 대시보드 > Database > Backups에서 다운로드 가능
```

#### 방법 3: 데이터 내보내기 (앱에서)
1. 배포된 사이트 접속
2. 구독 목록에서 **JSON 내보내기** 클릭
3. 구독 데이터 다운로드

## 🔄 정기 백업 권장사항

### 자동 백업
- **Git**: 자동 (푸시할 때마다)
- **Supabase**: 자동 백업 (일일, 주간)
- **로컬**: 수동 또는 스크립트로 자동화

### 백업 체크리스트
- [ ] Git에 최신 코드 푸시
- [ ] 로컬 백업 파일 생성
- [ ] Supabase 데이터베이스 백업 확인
- [ ] 환경 변수 백업 (.env.local 안전한 곳에 보관)

## 📝 현재 백업 상태

### ✅ 완료된 백업
- Git 원격 저장소: 최신 상태
- 로컬 백업 파일: 생성됨
- 데이터베이스: Supabase 자동 백업 활성화

### 📍 백업 파일 위치
- **로컬**: `/Volumes/Samsung USB/subcribe_handler_backup_*.tar.gz`
- **원격**: `https://github.com/jungshell/subscribe.git`

## 🚨 중요 참고사항

1. **환경 변수 백업**
   - `.env.local` 파일은 Git에 포함되지 않음
   - 별도로 안전한 곳에 보관 필요
   - Vercel 대시보드에서도 확인 가능

2. **데이터베이스 백업**
   - Supabase는 자동 백업 제공
   - 중요한 데이터는 정기적으로 확인

3. **백업 파일 크기**
   - `node_modules` 제외로 파일 크기 최소화
   - 복원 시 `npm install` 필요

## 🔗 관련 링크
- GitHub 저장소: https://github.com/jungshell/subscribe
- Vercel 배포: https://subscribe-handler.vercel.app
- Supabase 대시보드: https://supabase.com/dashboard

