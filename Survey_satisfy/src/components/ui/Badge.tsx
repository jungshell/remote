interface BadgeProps {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

const toneClass = {
  default: "border-[var(--hairline)] text-[var(--text-body)]",
  success: "border-[var(--success)] text-[var(--success)]",
  warning: "border-[var(--warning)] text-[var(--warning)]",
  danger: "border-[var(--danger)] text-[var(--danger)]",
  info: "border-[var(--accent)] text-white",
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  return (
    <span className={`label-machined inline-flex border px-3 py-1 ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
