"use client";

import { useState } from "react";
import { divisions, programTypes } from "@/constants/divisions";
import { authFetch } from "@/lib/auth/access";
import { Field } from "@/components/ui/FormField";
import type { AuthUser } from "@/lib/auth/types";
import type { Division, ProgramType } from "@/types/platform";

interface StaffProfileSetupProps {
  user: AuthUser;
  onSaved: (user: AuthUser) => void;
}

export function StaffProfileSetup({ user, onSaved }: StaffProfileSetupProps) {
  const [division, setDivision] = useState<Division>((user.division as Division) || divisions[0]);
  const [business, setBusiness] = useState(user.business ?? "");
  const [subBusiness, setSubBusiness] = useState(user.subBusiness ?? "");
  const [programType, setProgramType] = useState<ProgramType>(
    (user.programType as ProgramType) || programTypes[0],
  );
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setStatus("");

    try {
      const response = await authFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division, business, subBusiness, programType }),
      });
      const data = (await response.json()) as { ok: boolean; user?: AuthUser; error?: string };

      if (!response.ok || !data.ok || !data.user) {
        setStatus(data.error ?? "프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      onSaved(data.user);
    } catch {
      setStatus("프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel p-6">
      <p className="label-machined text-[var(--text-muted)]">Staff Profile</p>
      <h2 className="mt-3 text-2xl font-black uppercase">담당 사업 프로필 설정</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
        한 번만 등록하면 설문 생성 시 본부·사업·유형이 자동으로 채워집니다. 회차와 기간만 입력하면 됩니다.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
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
      </div>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void handleSave()}
        className="focus-ring label-machined mt-8 border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {isSaving ? "저장 중" : "프로필 저장 후 계속"}
      </button>
      {status ? <p className="mt-4 text-sm text-[var(--warning)]">{status}</p> : null}
    </section>
  );
}
