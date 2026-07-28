"use client";

import { useEffect, useState } from "react";
import { divisions } from "@/constants/divisions";
import { authFetch } from "@/lib/auth/access";
import { BusinessListEditor } from "@/components/auth/BusinessListEditor";
import { Field } from "@/components/ui/FormField";
import type { AuthUser, BusinessAssignment } from "@/lib/auth/types";
import type { Division } from "@/types/platform";

interface StaffProfileSetupProps {
  user: AuthUser;
  onSaved: (user: AuthUser) => void;
}

export function StaffProfileSetup({ user, onSaved }: StaffProfileSetupProps) {
  const [division, setDivision] = useState<Division>((user.division as Division) || divisions[0]);
  const [businesses, setBusinesses] = useState<BusinessAssignment[]>(user.businesses ?? []);
  const [businessTypeMap, setBusinessTypeMap] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleSave() {
    const filledBusinesses = businesses.filter(
      (item) => item.business.trim() && item.subBusiness.trim() && item.programType.trim(),
    );
    if (filledBusinesses.length === 0) {
      setStatus("담당 사업(사업명·유형·세부사업)을 1개 이상 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      const response = await authFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division, businesses: filledBusinesses }),
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
        한 번만 등록하면 설문 생성 시 본부·사업·유형이 자동으로 채워집니다. 맡은 사업이 여러 개면 모두 추가하세요.
      </p>

      <div className="mt-8 grid gap-4">
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

        <div>
          <p className="label-machined text-[var(--text-muted)]">담당 사업 (여러 개 가능)</p>
          <p className="mt-1 mb-2 text-xs text-[var(--text-muted)]">
            사업명을 먼저 입력하면 사업유형이 자동 선택됩니다.
          </p>
          <BusinessListEditor value={businesses} onChange={setBusinesses} businessTypeMap={businessTypeMap} />
        </div>
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
