"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authFetch } from "@/lib/auth/access";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/manager";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string; user?: { role: string } };

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      const destination = data.user?.role === "admin" && redirect === "/manager" ? "/admin" : redirect;
      router.push(destination);
      router.refresh();
    } catch {
      setMessage("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell flex min-h-[70vh] items-center py-16">
      <section className="panel w-full max-w-lg p-8">
        <p className="label-machined text-[var(--text-muted)]">Login</p>
        <h1 className="mt-4 text-3xl font-black uppercase">로그인</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
          승인된 계정으로 로그인하세요. 사업담당자는 가입 후 총괄 관리자 승인이 필요합니다.
        </p>

        <div className="mt-8 grid gap-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일"
            className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSubmit();
              }
            }}
            placeholder="비밀번호"
            className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </div>

        {message ? <p className="mt-4 text-sm text-[var(--warning)]">{message}</p> : null}

        <button
          type="button"
          disabled={isLoading || !email || !password}
          onClick={() => void handleSubmit()}
          className="focus-ring label-machined mt-6 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
        >
          {isLoading ? "로그인 중" : "로그인"}
        </button>

        <p className="mt-6 text-sm text-[var(--text-body)]">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-white underline underline-offset-4">
            사업담당자 가입 신청
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <RoleAwareTopNav />
      <Suspense fallback={<main className="shell py-16 text-sm text-[var(--text-muted)]">로딩 중...</main>}>
        <LoginForm />
      </Suspense>
    </>
  );
}
