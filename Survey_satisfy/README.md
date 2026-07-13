# 만족도 KPI 통합관리 플랫폼

충남콘텐츠진흥원 사업별 만족도 조사를 공통 기준으로 표준화하고, Google Sheets/Drive 기반으로 무료 운영하는 웹 플랫폼입니다.

## 핵심 기능

- 모바일 설문 응답
- 휴대폰 뒤 4자리 기반 중복응답 방지 및 수정
- 공통 문항 + 사업유형별 문항 모듈
- 교육형 사업 지침 문항 반영
- 연도·본부·사업·회차별 Google Drive 폴더 정리
- 회차별 Google Sheet 응답 저장
- 실시간 KPI 대시보드
- 사업담당자 화면
- 총괄 관리자 화면
- 공식 보고용 PDF / 내부 분석용 PDF 분리 설계
- 개선과제 관리
- 연도별 비교

## 무료 기반 스택

- Next.js + Tailwind CSS
- **Supabase** (응답 저장·실시간 KPI·CSV)
- Recharts
- Google Sheets / Drive / Apps Script (2단계 보고 자동화)
- Vercel Free 또는 Render Free

## 실행

```bash
npm install
npm run dev
```

## 주요 경로

- `/`: 통합 KPI 대시보드
- `/manager`: 사업담당자 화면 (설문 생성·운영)
- `/admin`: 총괄 관리자 화면

## 문항 마스터

공통 KPI + 유형 기본세트/확장 구조는 `docs/QUESTION_MASTER.md`를 참고하세요.

## 사용자 설정 필요

1. **Supabase** — `docs/SUPABASE.md` 참고 (SQL + env)
2. **Google 연동(선택, 2단계)** — `docs/SETUP.md` 참고
