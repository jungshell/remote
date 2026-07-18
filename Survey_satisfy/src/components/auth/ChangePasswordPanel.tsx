"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth/access";

export function ChangePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (newPassword !== confirmPassword) {
      setStatus("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSaving(true);
    setStatus("변경 중...");
    try {
      const response = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "비밀번호 변경에 실패했습니다.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("비밀번호를 변경했습니다.");
    } catch {
      setStatus("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel p-4 sm:p-6">
      <p className="label-machined text-[var(--text-muted)]">Security</p>
      <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">비밀번호 변경</h2>
      <p className="mt-2 text-sm text-[var(--text-body)]">현재 비밀번호 확인 후 새 비밀번호로 바꿉니다.</p>

      <div className="mt-6 grid gap-3 max-w-md">
        <label>
          <span className="label-machined text-[var(--text-muted)]">현재 비밀번호</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-sm text-white"
          />
        </label>
        <label>
          <span className="label-machined text-[var(--text-muted)]">새 비밀번호 (8자 이상)</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-sm text-white"
          />
        </label>
        <label>
          <span className="label-machined text-[var(--text-muted)]">새 비밀번호 확인</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSubmit()}
          className="focus-ring label-machined min-h-12 border border-white px-4 hover:bg-white hover:text-black disabled:opacity-50"
        >
          {isSaving ? "변경 중" : "비밀번호 변경"}
        </button>
        {status ? <p className="text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>
    </section>
  );
}
