"use client";

import { sectionSummaries, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { LayoutDashboard } from "lucide-react";
import { KeyStatsDashboard } from "@/components/infographics/KeyStatsDashboard";

function summaryFor(id: string) {
  return sectionSummaries.find((s) => s.id === id);
}

export function SectionIntro() {
  const reduce = usePrefersReducedMotion();
  const summary = summaryFor("intro");

  return (
    <section
      id="intro"
      className="deck-page bg-[#003366] text-[var(--color-text-on-dark)]"
    >
      <div className="deck-container flex max-w-5xl flex-col gap-5 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { duration: 0.7, ease: [0.22, 1, 0.36, 1] })}
          className="flex items-start gap-4"
        >
          <LayoutDashboard className="mt-1 size-10 shrink-0 text-sky-300" aria-hidden />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-200/90">
              핵심 숫자 · 대시보드
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
              예산·사업 구조 한눈에
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-white/75">{ui.dashboardNumericBanner}</p>
          </div>
        </motion.div>

        {summary && (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm md:p-8">
            <h2 className="text-lg font-semibold text-white">키워드</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.bullets.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/20 bg-[#00264d]/40 px-3 py-2 text-sm font-medium text-white/90"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        <KeyStatsDashboard />
      </div>
    </section>
  );
}
