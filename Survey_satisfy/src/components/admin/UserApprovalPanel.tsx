"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth/access";
import { Badge } from "@/components/ui/Badge";
import type { PublicUser } from "@/lib/auth/types";

export function UserApprovalPanel() {
  const [rows, setRows] = useState<PublicUser[]>([]);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  async function loadUsers() {
    const query = filter === "all" ? "" : `?status=${filter}`;
    const response = await authFetch(`/api/auth/users${query}`);
    const data = (await response.json()) as { ok: boolean; rows?: PublicUser[]; error?: string };

    if (data.ok && data.rows) {
      setRows(data.rows);
    } else {
      setStatus(data.error ?? "회원 목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleDecision(userId: string, decision: "approved" | "rejected") {
    setStatus("처리 중입니다.");

    const response = await authFetch(`/api/auth/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "처리에 실패했습니다.");
      return;
    }

    setStatus(decision === "approved" ? "승인했습니다." : "거절했습니다.");
    void loadUsers();
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--hairline)] p-6">
        <p className="label-machined text-[var(--text-muted)]">User Approval</p>
        <h2 className="mt-2 text-2xl font-black uppercase">회원 승인 관리</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          사업담당자 가입 신청을 검토하고 승인 또는 거절합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`focus-ring label-machined border px-4 py-2 text-sm ${
                filter === item ? "border-white bg-white text-black" : "border-[var(--hairline)] text-[var(--text-body)]"
              }`}
            >
              {item === "pending" ? "대기" : item === "approved" ? "승인" : item === "rejected" ? "거절" : "전체"}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">표시할 회원이 없습니다.</p>
        ) : (
          rows.map((user) => (
            <article key={user.id} className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={user.status === "approved" ? "success" : user.status === "pending" ? "warning" : "default"}>
                    {user.status}
                  </Badge>
                  <Badge>{user.role}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-bold text-white">
                  {user.name} <span className="text-base font-normal text-[var(--text-muted)]">({user.email})</span>
                </h3>
                <p className="mt-2 text-sm text-[var(--text-body)]">
                  {user.division}
                  {user.business ? ` · ${user.business}` : ""}
                  {user.subBusiness ? ` / ${user.subBusiness}` : ""}
                  {user.programType ? ` · ${user.programType}` : ""}
                </p>
              </div>
              {user.status === "pending" && user.role === "staff" ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDecision(user.id, "approved")}
                    className="focus-ring label-machined border border-white px-4 py-3 hover:bg-white hover:text-black"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(user.id, "rejected")}
                    className="focus-ring label-machined border border-[var(--hairline)] px-4 py-3 text-[var(--text-body)] hover:border-white hover:text-white"
                  >
                    거절
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {status ? <p className="border-t border-[var(--hairline)] p-6 text-sm text-[var(--text-body)]">{status}</p> : null}
    </section>
  );
}
