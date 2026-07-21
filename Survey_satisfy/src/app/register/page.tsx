"use client";

import Link from "next/link";
import { useState } from "react";
import { divisions, programTypes } from "@/constants/divisions";
import { authFetch } from "@/lib/auth/access";
import { Field } from "@/components/ui/FormField";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";
import type { Division, ProgramType } from "@/types/platform";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [division, setDivision] = useState<Division>(divisions[0]);
  const [business, setBusiness] = useState("");
  const [subBusiness, setSubBusiness] = useState("");
  const [programType, setProgramType] = useState<ProgramType>(programTypes[0]);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

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
        body: JSON.stringify({
          email,
          password,
          name,
          division,
          business,
          subBusiness,
          programType,
        }),
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
        <section className="panel w-full max-w-2xl p-8">
          <p className="label-machined text-[var(--text-muted)]">Register</p>
          <h1 className="mt-4 text-3xl font-black uppercase">사업담당자 가입</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
            본부·담당 사업·사업유형을 미리 등록하면, 승인 후 설문 생성 시 자동으로 연동됩니다.
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
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <Field label="이름">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  />
                </Field>
                <Field label="이메일 (기관 메일)">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  />
                </Field>
                <Field label="본부">
                  <select
                    value={division}
                    onChange={(event) => setDivision(event.target.value as Division)}
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  >
                    {divisions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="사업유형">
                  <select
                    value={programType}
                    onChange={(event) => setProgramType(event.target.value as ProgramType)}
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  >
                    {programTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="담당 사업">
                  <input
                    value={business}
                    onChange={(event) => setBusiness(event.target.value)}
                    placeholder="예: 지역특화콘텐츠개발"
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  />
                </Field>
                <Field label="세부사업">
                  <input
                    value={subBusiness}
                    onChange={(event) => setSubBusiness(event.target.value)}
                    placeholder="예: 뉴콘텐츠 아카데미"
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  />
                </Field>
                <Field label="비밀번호 (8자 이상)">
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  />
                </Field>
                <Field label="비밀번호 확인">
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
                  />
                </Field>
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

