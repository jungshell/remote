"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/auth/access";
import type { AuthUser } from "@/lib/auth/types";

const PRIMARY =
  "focus-ring label-machined border border-white px-6 py-4 text-white transition-colors hover:bg-white hover:text-black";
const SECONDARY =
  "focus-ring label-machined border border-[var(--hairline)] px-6 py-4 text-[var(--text-body)] transition-colors hover:border-white hover:text-white";

/** 로그인 상태에 따라 홈 화면 버튼을 다르게 표시 */
export function HomeCta() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchCurrentUser().then((value) => {
      setUser(value);
      setLoaded(true);
    });
  }, []);

  // 첫 렌더 깜빡임 최소화를 위해 로딩 중엔 자리만 확보
  if (!loaded) {
    return <div className="mt-10 h-[3.5rem]" />;
  }

  if (user) {
    return (
      <div className="mt-10">
        <p className="text-sm text-[var(--text-body)]">
          <span className="text-white">{user.name}</span>님, 환영합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {user.role === "admin" ? (
            <Link href="/admin" className={PRIMARY}>
              관리자 화면
            </Link>
          ) : null}
          <Link href="/manager" className={user.role === "admin" ? SECONDARY : PRIMARY}>
            담당자 화면
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-wrap gap-3">
      <Link href="/register" className={PRIMARY}>
        사업담당자 가입
      </Link>
      <Link href="/login" className={SECONDARY}>
        로그인
      </Link>
    </div>
  );
}
