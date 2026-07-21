"use client";

import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  durationMs?: number;
  suffix?: string;
  className?: string;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 900,
  suffix = "",
  className = "",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const from = 0;
    const delta = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + delta * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));

  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}
