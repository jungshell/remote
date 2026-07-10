import { AuthGate } from "@/components/auth/AuthGate";
import { ManagementExportPanel } from "@/components/admin/ManagementExportPanel";
import { UserApprovalPanel } from "@/components/admin/UserApprovalPanel";
import { ResponseDashboard } from "@/components/dashboard/ResponseDashboard";
import { Badge } from "@/components/ui/Badge";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

export default function AdminPage() {
  return (
    <AuthGate
      requiredRole="admin"
      title="총괄 관리자 접근"
      description="승인된 관리자 계정으로 로그인해야 전 사업 KPI 관제 화면을 이용할 수 있습니다."
    >
      <RoleAwareTopNav />
      <main className="shell py-12 md:py-16">
        <section className="border-b border-[var(--hairline)] pb-12">
          <Badge tone="info">Admin Command</Badge>
          <h1 className="mt-6 text-5xl font-black uppercase leading-none tracking-[-0.04em] md:text-6xl">
            총괄 관리자
            <br />
            KPI 관제
          </h1>
          <p className="mt-6 max-w-3xl text-[var(--text-body)]">
            회원 승인, 본부·사업유형 KPI, 경영평가 Excel보내기를 제공합니다.
          </p>
        </section>

        <section className="py-12">
          <UserApprovalPanel />
        </section>

        <section className="py-12">
          <ResponseDashboard role="admin" mode="admin" />
        </section>

        <section className="pb-12">
          <ManagementExportPanel />
        </section>

        <section className="pb-12">
          <div className="panel p-6">
            <p className="label-machined text-[var(--text-muted)]">Action Loop</p>
            <h2 className="mt-2 text-2xl font-black uppercase">개선과제 관리</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
              주관식 키워드·낮은 만족도 기반 개선과제 등록 기능은 다음 단계에서 연동됩니다.
            </p>
          </div>
        </section>
      </main>
    </AuthGate>
  );
}
