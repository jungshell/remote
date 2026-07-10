import { AuthGate } from "@/components/auth/AuthGate";
import { ManagerConsole } from "@/components/manager/ManagerConsole";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

export default function ManagerPage() {
  return (
    <AuthGate
      requiredRole="staff"
      title="사업 담당자 접근"
      description="승인된 사업담당자 계정으로 로그인해야 설문 생성·운영 화면을 이용할 수 있습니다."
    >
      <RoleAwareTopNav />
      <main className="shell py-12 md:py-16">
        <ManagerConsole />
      </main>
    </AuthGate>
  );
}
