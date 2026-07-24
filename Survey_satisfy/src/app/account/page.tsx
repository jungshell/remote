import { AuthGate } from "@/components/auth/AuthGate";
import { AccountConsole } from "@/components/account/AccountConsole";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

export default function AccountPage() {
  return (
    <AuthGate
      requiredRole="staff"
      title="내 계정"
      description="로그인한 계정만 마이페이지를 이용할 수 있습니다."
    >
      <RoleAwareTopNav />
      <main className="shell py-8 md:py-16">
        <AccountConsole />
      </main>
    </AuthGate>
  );
}
