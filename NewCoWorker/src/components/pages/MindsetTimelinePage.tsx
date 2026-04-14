"use client";

import { mindsetTimeline } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, GitBranch, Scale } from "lucide-react";

const principleIcons = {
  Scale,
  BadgeCheck,
} as const;

export function MindsetTimelinePage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="mindset"
      className="deck-page justify-center bg-[#003366] text-[var(--color-text-on-dark)]"
    >
      <div className="deck-container flex max-w-5xl flex-col justify-center gap-4 md:gap-5">
        <header className="shrink-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/90 md:text-xs">
            공공기관 마인드셋
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:mt-2 md:text-3xl">
            직무 수행 로드맵
          </h1>
        </header>

        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          {mindsetTimeline.principles.map((p, i) => {
            const Icon = p.id === "fair" ? principleIcons.Scale : principleIcons.BadgeCheck;
            return (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getMotionTransition(reduce, { delay: reduce ? 0 : i * 0.06 })}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium"
              >
                <Icon className="size-4 text-sky-200" aria-hidden />
                {p.keyword}
              </motion.span>
            );
          })}
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-center md:gap-2">
          {mindsetTimeline.steps.map((step, i) => (
            <div key={step.id} className="flex items-center md:flex-1">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getMotionTransition(reduce, {
                  duration: 0.55,
                  delay: reduce ? 0 : 0.1 + i * 0.12,
                })}
                className="flex w-full flex-col rounded-2xl border border-white/15 bg-[#00264d] p-4 md:min-h-[7rem]"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-sky-200/90">
                  <GitBranch className="size-3.5" aria-hidden />
                  STEP {i + 1}
                </span>
                <p className="mt-2 text-lg font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-sm text-white/70">{step.hint}</p>
              </motion.div>
              {i < mindsetTimeline.steps.length - 1 && (
                <ArrowRight
                  className="mx-2 hidden size-8 shrink-0 text-sky-300/80 md:block"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
