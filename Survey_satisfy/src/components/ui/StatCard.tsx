interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClass = {
  default: "text-white",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
};

export function StatCard({ label, value, caption, tone = "default" }: StatCardProps) {
  return (
    <section className="panel animate-rise p-6">
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className={`mt-5 text-4xl font-black tracking-[-0.03em] md:text-5xl ${toneClass[tone]}`}>
        {value}
      </p>
      {caption ? <p className="mt-3 text-sm text-[var(--text-body)]">{caption}</p> : null}
    </section>
  );
}
