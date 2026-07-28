import { Badge } from "@/components/ui/Badge";
import { HomeCta } from "@/components/home/HomeCta";
import { HomeShortcuts } from "@/components/home/HomeShortcuts";
import { RoleAwareTopNav } from "@/components/ui/RoleAwareTopNav";

export default function Home() {
  return (
    <>
      <RoleAwareTopNav />
      <main className="shell py-12 md:py-20">
        <section className="grid gap-10 border-b border-[var(--hairline)] pb-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="animate-enter">
            <Badge tone="info">충남콘텐츠진흥원 · 통합 설문 플랫폼</Badge>
            <h1 className="mt-8 max-w-5xl text-5xl font-black uppercase leading-none tracking-[-0.04em] md:text-7xl">
              만족도 KPI
              <br />
              통합관리 플랫폼
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-light leading-8 text-[var(--text-body)]">
              사업담당자는 가입 후 총괄 관리자 승인을 받아야 플랫폼에 접근할 수 있습니다. 승인 후 설문 생성·배포와
              KPI 확인이 가능합니다.
            </p>
            <HomeCta />
          </div>

          <div className="panel animate-rise p-6">
            <p className="label-machined text-[var(--text-muted)]">Access Flow</p>
            <ol className="mt-6 space-y-4 text-sm leading-7 text-[var(--text-body)]">
              <li>1. 사업담당자 회원가입 (승인 대기)</li>
              <li>2. 총괄 관리자가 회원 승인</li>
              <li>3. 승인 후 로그인 → 설문 생성·활성화</li>
              <li>4. QR·링크 배포 및 KPI·Excel 확인</li>
            </ol>
          </div>
        </section>

        <HomeShortcuts />
      </main>
    </>
  );
}
