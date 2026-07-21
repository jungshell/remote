interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className = "" }: BrandMarkProps) {
  return (
    <div className={`animate-enter ${className}`}>
      <p className="label-machined text-[var(--accent)]">CCON · Survey KPI</p>
      <p className={`mt-1 font-black tracking-[-0.03em] text-white ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
        충남콘텐츠진흥원
      </p>
      {!compact ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">사업 만족도 · 성과 보고</p>
      ) : null}
    </div>
  );
}
