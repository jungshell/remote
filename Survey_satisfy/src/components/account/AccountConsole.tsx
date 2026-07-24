"use client";

import { useEffect, useState } from "react";
import { ChangePasswordPanel } from "@/components/auth/ChangePasswordPanel";
import { fetchCurrentUser } from "@/lib/auth/access";
import type { AuthUser } from "@/lib/auth/types";

export function AccountConsole() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchCurrentUser().then((value) => {
      setUser(value);
      setLoaded(true);
    });
  }, []);

  const roleLabel = user?.role === "admin" ? "총괄관리자" : "사업담당자";

  return (
    <section className="grid gap-6">
      <div className="panel p-4 sm:p-6">
        <p className="label-machined text-[var(--text-muted)]">My Page</p>
        <h1 className="mt-2 text-2xl font-black uppercase sm:text-3xl">내 계정</h1>
        <p className="mt-2 text-sm text-[var(--text-body)]">계정 정보를 확인하고 비밀번호를 변경할 수 있습니다.</p>

        {!loaded ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">불러오는 중...</p>
        ) : user ? (
          <div className="mt-6 grid gap-3 border border-[var(--hairline)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2">
            <InfoRow label="이름" value={user.name} />
            <InfoRow label="이메일" value={user.email} />
            <InfoRow label="권한" value={roleLabel} />
            <InfoRow label="본부" value={user.division} />
            <InfoRow label="담당 사업" value={user.business || "-"} />
            <InfoRow label="세부사업" value={user.subBusiness || "-"} />
            <InfoRow label="사업유형" value={user.programType || "-"} />
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--warning)]">계정 정보를 불러오지 못했습니다. 다시 로그인해 주세요.</p>
        )}
      </div>

      <ChangePasswordPanel />
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
