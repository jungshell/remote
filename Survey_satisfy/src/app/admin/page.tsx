import { AuthGate } from "@/components/auth/AuthGate";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

export default function AdminPage() {
  return (
    <AuthGate
      requiredRole="admin"
      title="총괄 관리자 접근"
      description="승인된 관리자 계정으로 로그인해야 전 사업 KPI 관제 화면을 이용할 수 있습니다."
    >
      <RoleAwareTopNav />
      <main className="shell py-8 md:py-16">
        <AdminConsole />
      </main>
    </AuthGate>
  );
}
