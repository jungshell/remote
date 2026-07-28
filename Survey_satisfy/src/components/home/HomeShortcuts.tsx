"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/auth/access";
import type { AuthUser } from "@/lib/auth/types";

function Card({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="panel block p-6 transition-colors hover:border-white">
      <p className="label-machined text-[var(--text-muted)]">{title}</p>
      <p className="mt-4 leading-7 text-[var(--text-body)]">{body}</p>
      <span className="label-machined mt-6 inline-block text-white">이동하기 →</span>
    </Link>
  );
}

/** 로그인 상태·권한에 따라 홈 하단 바로가기 카드를 다르게 표시 */
export function HomeShortcuts() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchCurrentUser().then((value) => {
      setUser(value);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return <section className="grid gap-6 py-12 md:grid-cols-3" />;
  }

  // 로그인한 담당자·관리자: 실제로 쓰는 바로가기
  if (user) {
    return (
      <section className="grid gap-6 py-12 md:grid-cols-3">
        <Card title="새 설문 만들기" body="사업 선택 → 문항 구성 → 생성 즉시 시작. QR·링크로 바로 배포합니다." href="/manager?view=create" />
        <Card title="내 설문 · 결과 보기" body="진행 중 설문 관리와 설문별 응답 현황·만족도 그래프를 확인합니다." href="/manager" />
        {user.role === "admin" ? (
          <Card title="총괄 관리자 콘솔" body="회원 승인, 본부·사업유형 KPI, 경영평가 Excel 내보내기." href="/admin" />
        ) : (
          <Card title="내 계정" body="비밀번호 변경과 담당 사업 정보를 관리합니다." href="/account" />
        )}
      </section>
    );
  }

  // 비로그인: 소개 카드
  return (
    <section className="grid gap-6 py-12 md:grid-cols-3">
      <Card title="사업담당자" body="가입 → 승인 → 설문 생성, 문항 선택, QR 배포, 회차별 KPI" href="/register" />
      <Card title="참여자" body="담당자가 활성화한 설문 링크로 모바일 응답 (휴대폰 뒤 4자리)" href="/login" />
      <Card title="총괄 관리자" body="회원 승인, 본부·사업유형 KPI, 경영평가 Excel보내기" href="/login" />
    </section>
  );
}
