"use client";

import { useEffect, useState } from "react";
import { divisions, programTypes } from "@/constants/divisions";
import { Badge } from "@/components/ui/Badge";
import { authFetch, fetchCurrentUser } from "@/lib/auth/access";
import type { AuthUser, PlatformRole, PublicUser, UserStatus } from "@/lib/auth/types";
import type { Division, ProgramType } from "@/types/platform";

export function UserApprovalPanel() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [rows, setRows] = useState<PublicUser[]>([]);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDivision, setEditDivision] = useState<Division>(divisions[0]);
  const [editBusiness, setEditBusiness] = useState("");
  const [editSubBusiness, setEditSubBusiness] = useState("");
  const [editProgramType, setEditProgramType] = useState<ProgramType>(programTypes[0]);
  const [editRole, setEditRole] = useState<PlatformRole>("staff");
  const [editStatus, setEditStatus] = useState<UserStatus>("pending");

  useEffect(() => {
    void fetchCurrentUser().then(setMe);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = filter === "all" ? "" : `?status=${filter}`;

    authFetch(`/api/auth/users${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ok: boolean; rows?: PublicUser[]; error?: string }) => {
        if (data.ok && data.rows) {
          setRows(data.rows);
        } else {
          setStatus(data.error ?? "회원 목록을 불러오지 못했습니다.");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setStatus("회원 목록을 불러오지 못했습니다.");
      });

    return () => controller.abort();
  }, [filter, reloadKey]);

  function openEdit(user: PublicUser) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditDivision((user.division as Division) || divisions[0]);
    setEditBusiness(user.business ?? "");
    setEditSubBusiness(user.subBusiness ?? "");
    setEditProgramType((user.programType as ProgramType) || programTypes[0]);
    setEditRole(user.role);
    setEditStatus(user.status);
    setStatus("");
  }

  function closeEdit() {
    setEditingId(null);
  }

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
    setReloadKey((key) => key + 1);
  }

  async function handleSave() {
    if (!editingId) {
      return;
    }

    setIsSaving(true);
    setStatus("저장 중...");

    try {
      const response = await authFetch(`/api/auth/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          division: editDivision,
          business: editBusiness,
          subBusiness: editSubBusiness,
          programType: editProgramType,
          role: editRole,
          status: editStatus,
        }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setStatus("회원 정보를 저장했습니다.");
      setEditingId(null);
      setReloadKey((key) => key + 1);
    } catch {
      setStatus("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: PublicUser) {
    if (me?.id === user.id) {
      setStatus("본인 계정은 삭제할 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `"${user.name}" (${user.email}) 계정을 삭제할까요?\n삭제 후 복구할 수 없습니다.`,
    );
    if (!confirmed) {
      return;
    }

    setStatus("삭제 중...");
    try {
      const response = await authFetch(`/api/auth/users/${user.id}`, { method: "DELETE" });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      if (editingId === user.id) {
        setEditingId(null);
      }
      setStatus(`"${user.name}" 계정을 삭제했습니다.`);
      setReloadKey((key) => key + 1);
    } catch {
      setStatus("삭제 중 오류가 발생했습니다.");
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--hairline)] p-4 sm:p-6">
        <p className="label-machined text-[var(--text-muted)]">Members</p>
        <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">회원·권한 관리</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          가입 승인/거절, 회원 정보 수정, 담당자·관리자 권한을 부여합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`focus-ring label-machined min-h-10 border px-4 py-2 text-sm ${
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
          rows.map((user) => {
            const isEditing = editingId === user.id;
            return (
              <article key={user.id} className="p-4 sm:p-6">
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={user.status === "approved" ? "success" : user.status === "pending" ? "warning" : "default"}>
                        {user.status === "approved" ? "승인" : user.status === "pending" ? "대기" : "거절"}
                      </Badge>
                      <Badge tone={user.role === "admin" ? "info" : "default"}>
                        {user.role === "admin" ? "총괄관리자" : "사업담당자"}
                      </Badge>
                      {me?.id === user.id ? <Badge>나</Badge> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-white sm:text-xl">
                      {user.name}{" "}
                      <span className="text-sm font-normal text-[var(--text-muted)] sm:text-base">({user.email})</span>
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-body)]">
                      {user.division}
                      {user.business ? ` · ${user.business}` : ""}
                      {user.subBusiness ? ` / ${user.subBusiness}` : ""}
                      {user.programType ? ` · ${user.programType}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {user.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleDecision(user.id, "approved")}
                          className="focus-ring label-machined min-h-11 border border-white px-4 py-2 hover:bg-white hover:text-black"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDecision(user.id, "rejected")}
                          className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-4 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
                        >
                          거절
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => (isEditing ? closeEdit() : openEdit(user))}
                      className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-4 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
                    >
                      {isEditing ? "닫기" : "수정"}
                    </button>
                    {me?.id !== user.id ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(user)}
                        className="focus-ring label-machined min-h-11 border border-[var(--danger)] px-4 py-2 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-black"
                      >
                        삭제
                      </button>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-5 grid gap-3 border border-[var(--hairline)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="label-machined text-[var(--text-muted)]">이름</span>
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      />
                    </label>
                    <label>
                      <span className="label-machined text-[var(--text-muted)]">권한</span>
                      <select
                        value={editRole}
                        onChange={(event) => setEditRole(event.target.value as PlatformRole)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      >
                        <option value="staff">사업담당자</option>
                        <option value="admin">총괄관리자</option>
                      </select>
                    </label>
                    <label>
                      <span className="label-machined text-[var(--text-muted)]">상태</span>
                      <select
                        value={editStatus}
                        onChange={(event) => setEditStatus(event.target.value as UserStatus)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      >
                        <option value="pending">대기</option>
                        <option value="approved">승인</option>
                        <option value="rejected">거절</option>
                      </select>
                    </label>
                    <label>
                      <span className="label-machined text-[var(--text-muted)]">본부</span>
                      <select
                        value={editDivision}
                        onChange={(event) => setEditDivision(event.target.value as Division)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      >
                        {divisions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="label-machined text-[var(--text-muted)]">사업유형</span>
                      <select
                        value={editProgramType}
                        onChange={(event) => setEditProgramType(event.target.value as ProgramType)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      >
                        {programTypes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="label-machined text-[var(--text-muted)]">담당 사업</span>
                      <input
                        value={editBusiness}
                        onChange={(event) => setEditBusiness(event.target.value)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      />
                    </label>
                    <label>
                      <span className="label-machined text-[var(--text-muted)]">세부사업</span>
                      <input
                        value={editSubBusiness}
                        onChange={(event) => setEditSubBusiness(event.target.value)}
                        className="focus-ring mt-2 h-11 w-full border border-[var(--hairline)] bg-black px-3 text-sm text-white"
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleSave()}
                        className="focus-ring label-machined min-h-12 w-full border border-white px-4 hover:bg-white hover:text-black disabled:opacity-50"
                      >
                        {isSaving ? "저장 중" : "회원 정보 저장"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {status ? <p className="border-t border-[var(--hairline)] p-4 text-sm text-[var(--text-body)] sm:p-6">{status}</p> : null}
    </section>
  );
}
