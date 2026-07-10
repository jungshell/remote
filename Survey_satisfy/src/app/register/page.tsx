"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { divisions } from "@/constants/divisions";
import { authFetch } from "@/lib/auth/access";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [division, setDivision] = useState(divisions[0]);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (password !== passwordConfirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await authFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, division }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string; message?: string };

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "가입 신청에 실패했습니다.");
        return;
      }

      setIsSuccess(true);
      setMessage(data.message ?? "가입 신청이 완료되었습니다.");
    } catch {
      setMessage("가입 신청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <RoleAwareTopNav />
      <main className="shell flex min-h-[70vh] items-center py-16">
        <section className="panel w-full max-w-lg p-8">
          <p className="label-machined text-[var(--text-muted)]">Register</p>
          <h1 className="mt-4 text-3xl font-black uppercase">사업담당자 가입</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
            가입 후 총괄 관리자 승인이 완료되면 로그인하여 설문을 생성·운영할 수 있습니다.
          </p>

          {isSuccess ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm leading-7 text-[var(--success)]">{message}</p>
              <Link href="/login" className="focus-ring label-machined inline-block border border-white px-6 py-4">
                로그인 화면으로
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="이름"
                  className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="이메일 (기관 메일)"
                  className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                />
                <select
                  value={division}
                  onChange={(event) => setDivision(event.target.value as (typeof divisions)[number])}
                  className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                >
                  {divisions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호 (8자 이상)"
                  className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="비밀번호 확인"
                  className="focus-ring h-12 border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                />
              </div>

              {message ? <p className="mt-4 text-sm text-[var(--warning)]">{message}</p> : null}

              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleSubmit()}
                className="focus-ring label-machined mt-6 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
              >
                {isLoading ? "신청 중" : "가입 신청"}
              </button>

              <p className="mt-6 text-sm text-[var(--text-body)]">
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="text-white underline underline-offset-4">
                  로그인
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </>
  );
}
