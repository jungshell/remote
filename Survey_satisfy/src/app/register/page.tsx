"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { divisions } from "@/constants/divisions";
import { authFetch } from "@/lib/auth/access";
import { BusinessListEditor } from "@/components/auth/BusinessListEditor";
import { Field } from "@/components/ui/FormField";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";
import type { BusinessAssignment } from "@/lib/auth/types";
import type { Division } from "@/types/platform";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [division, setDivision] = useState<Division>(divisions[0]);
  const [businesses, setBusinesses] = useState<BusinessAssignment[]>([]);
  const [businessTypeMap, setBusinessTypeMap] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 기존 등록된 사업명 → 유형 매핑을 불러와 자동 채움에 사용
  useEffect(() => {
    void authFetch("/api/business-types")
      .then((response) => response.json())
      .then((data: { ok: boolean; map?: Record<string, string> }) => {
        if (data.ok && data.map) {
          setBusinessTypeMap(data.map);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit() {
    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    const filledBusinesses = businesses.filter(
      (item) => item.business.trim() && item.subBusiness.trim() && item.programType.trim(),
    );
    if (filledBusinesses.length === 0) {
      setMessage("담당 사업(사업명·유형·세부사업)을 1개 이상 입력해 주세요.");
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
          businesses: filledBusinesses,
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
                <div className="md:col-span-2">
                  <p className="label-machined text-[var(--text-muted)]">담당 사업 (여러 개 가능)</p>
                  <p className="mt-1 mb-2 text-xs text-[var(--text-muted)]">
                    사업명을 먼저 입력하면 사업유형이 자동 선택됩니다. 맡은 사업이 여러 개면 &quot;+ 사업 추가&quot;로 늘리세요.
                  </p>
                  <BusinessListEditor value={businesses} onChange={setBusinesses} businessTypeMap={businessTypeMap} />
                </div>
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

