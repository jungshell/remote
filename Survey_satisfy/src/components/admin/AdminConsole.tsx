"use client";

import { useState } from "react";
import { ImprovementActionPanel } from "@/components/admin/ImprovementActionPanel";
import { ManagementExportPanel } from "@/components/admin/ManagementExportPanel";
import { UserApprovalPanel } from "@/components/admin/UserApprovalPanel";
import { ChangePasswordPanel } from "@/components/auth/ChangePasswordPanel";
import { ResponseDashboard } from "@/components/dashboard/ResponseDashboard";
import { Badge } from "@/components/ui/Badge";
import { BrandMark } from "@/components/ui/BrandMark";

type AdminTab = "members" | "kpi" | "excel" | "improvements" | "security";

const TABS: Array<{ id: AdminTab; label: string; hint: string }> = [
  { id: "members", label: "회원·권한", hint: "승인·정보수정·권한부여" },
  { id: "kpi", label: "KPI", hint: "본부·유형 지표" },
  { id: "excel", label: "Excel", hint: "경영평가 내보내기" },
  { id: "improvements", label: "개선과제", hint: "과제 등록·추적" },
  { id: "security", label: "보안", hint: "비밀번호 변경" },
];

export function AdminConsole() {
  const [tab, setTab] = useState<AdminTab>("members");

  return (
    <>
      <section className="animate-enter border-b border-[var(--hairline)] pb-6 sm:pb-8">
        <BrandMark compact />
        <div className="mt-4">
          <Badge tone="info">Admin</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:mt-6 sm:text-5xl">
          총괄 관리
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[var(--text-body)] sm:text-base">
          필요한 메뉴만 선택해서 확인하세요.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`focus-ring min-h-14 border px-3 py-3 text-left sm:min-w-[140px] ${
                tab === item.id
                  ? "border-white bg-white text-black"
                  : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
              }`}
            >
              <span className="block text-sm font-black uppercase">{item.label}</span>
              <span className={`mt-1 block text-[11px] ${tab === item.id ? "text-black/70" : "text-[var(--text-muted)]"}`}>
                {item.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="py-6 sm:py-10">
        {tab === "members" ? <UserApprovalPanel /> : null}
        {tab === "kpi" ? <ResponseDashboard mode="admin" /> : null}
        {tab === "excel" ? <ManagementExportPanel /> : null}
        {tab === "improvements" ? <ImprovementActionPanel /> : null}
        {tab === "security" ? <ChangePasswordPanel /> : null}
      </section>
    </>
  );
}
