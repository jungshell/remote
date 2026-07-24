"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCurrentUser, logout } from "@/lib/auth/access";
import type { AuthUser } from "@/lib/auth/types";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/manager", label: "Manager" },
  { href: "/admin", label: "Admin" },
];

export function RoleAwareTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const isSurveyRoute = pathname.startsWith("/survey");

  useEffect(() => {
    void fetchCurrentUser().then(setUser);
  }, [pathname]);

  if (isSurveyRoute) {
    return null;
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-black/92 backdrop-blur">
      <nav className="shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center border border-white text-sm font-black">K</span>
          <span>
            <span className="label-machined block text-white">KPI Survey</span>
            <span className="block text-xs text-[var(--text-muted)]">Satisfaction Command Platform</span>
          </span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 overflow-x-auto md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`label-machined shrink-0 text-xs ${
                  pathname === link.href ? "text-white" : "text-[var(--text-body)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label-machined text-[var(--text-body)] transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/account"
                title="내 계정 · 비밀번호 변경"
                className={`focus-ring hidden text-sm transition-colors hover:text-white sm:inline ${
                  pathname === "/account" ? "text-white" : "text-[var(--text-body)]"
                }`}
              >
                {user.name}
                <span className="text-[var(--text-muted)]"> · {user.role}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-xs text-[var(--text-body)] hover:border-white hover:text-white"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-xs text-[var(--text-body)] hover:border-white hover:text-white"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="focus-ring label-machined border border-white px-3 py-2 text-xs text-white hover:bg-white hover:text-black"
              >
                가입
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
