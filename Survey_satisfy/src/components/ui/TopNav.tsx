import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/manager", label: "Manager" },
  { href: "/admin", label: "Admin" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-black/92 backdrop-blur">
      <nav className="shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center border border-white text-sm font-black">K</span>
          <span>
            <span className="label-machined block text-white">KPI Survey</span>
            <span className="block text-xs text-[var(--text-muted)]">Satisfaction Command Platform</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="label-machined text-[var(--text-body)] transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
