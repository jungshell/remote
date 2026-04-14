"use client";

import { HeroConvergenceGraphic } from "@/components/infographics/HeroConvergenceGraphic";
import { institution, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";

export function WelcomePage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section className="deck-page justify-center bg-[#003366] text-[var(--color-text-on-dark)]">
      <div className="deck-container flex max-w-4xl flex-col items-center gap-4 text-center md:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { duration: 0.65, ease: [0.22, 1, 0.36, 1] })}
          className="space-y-2"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-200/90">
            {ui.introKicker}
          </p>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
            환영합니다 · {institution.traineeHonorific}님
          </h1>
          <p className="text-sm text-white/80 md:text-base">{institution.officialName}</p>
        </motion.div>

        <HeroConvergenceGraphic className="w-full max-w-xl md:max-w-2xl" />

        <p className="text-[11px] text-white/55 md:text-xs">휠 · 스와이프 · 목차로 이동</p>
      </div>
    </section>
  );
}
