"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessRole, fetchCurrentUser } from "@/lib/auth/access";
import type { AuthUser, PlatformRole } from "@/lib/auth/types";

interface AuthGateProps {
  requiredRole: PlatformRole;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthGate({ requiredRole, title, description, children }: AuthGateProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchCurrentUser().then((current) => {
      setUser(current);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <main className="shell flex min-h-[50vh] items-center py-16">
        <p className="text-sm text-[var(--text-muted)]">접근 권한을 확인하는 중입니다.</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell flex min-h-[70vh] items-center py-16">
        <section className="panel w-full max-w-lg p-8">
          <p className="label-machined text-[var(--text-muted)]">Login Required</p>
          <h1 className="mt-4 text-3xl font-black uppercase">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">{description}</p>
          <div className="mt-8 grid gap-3">
            <Link
              href={`/login?redirect=${encodeURIComponent(requiredRole === "admin" ? "/admin" : "/manager")}`}
              className="focus-ring label-machined border border-white px-6 py-4 text-center text-white transition-colors hover:bg-white hover:text-black"
            >
              로그인
            </Link>
            {requiredRole === "staff" ? (
              <Link
                href="/register"
                className="focus-ring label-machined border border-[var(--hairline)] px-6 py-4 text-center text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
              >
                사업담당자 가입 신청
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  if (user.status === "pending") {
    return (
      <main className="shell flex min-h-[70vh] items-center py-16">
        <section className="panel w-full max-w-lg p-8">
          <h1 className="text-2xl font-black uppercase">승인 대기 중</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
            {user.name}님의 가입 신청이 접수되었습니다. 총괄 관리자 승인 후 이용할 수 있습니다.
          </p>
        </section>
      </main>
    );
  }

  if (!canAccessRole(user, requiredRole)) {
    return (
      <main className="shell flex min-h-[70vh] items-center py-16">
        <section className="panel w-full max-w-lg p-8">
          <h1 className="text-2xl font-black uppercase">접근 권한 없음</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">이 화면에 접근할 권한이 없습니다.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="focus-ring label-machined mt-8 border border-white px-6 py-4"
          >
            홈으로
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void fetchCurrentUser().then(setUser);
  }, []);

  return user;
}
