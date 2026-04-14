"use client";

import { institutionalGoals, ui, visionValuesFlow } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Handshake,
  Landmark,
  Layers,
  LineChart,
  LucideIcon,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Fragment } from "react";

const iconMap: Record<(typeof visionValuesFlow)[number]["lucide"], LucideIcon> = {
  TrendingUp,
  Layers,
  Handshake,
};

const goalIconMap: Record<(typeof institutionalGoals)[number]["lucide"], LucideIcon> = {
  Target,
  LineChart,
  Users,
  Landmark,
};

function ValueCard({
  step,
  i,
  reduce,
}: {
  step: (typeof visionValuesFlow)[number];
  i: number;
  reduce: boolean;
}) {
  const Icon = iconMap[step.lucide];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getMotionTransition(reduce, {
        duration: 0.4,
        delay: reduce ? 0 : i * 0.06,
      })}
      className="flex w-full max-w-[15.5rem] flex-col items-center rounded-2xl border border-slate-200/90 bg-white px-5 py-5 shadow-sm sm:max-w-[16.5rem] md:w-[min(100%,15rem)] md:max-w-none md:py-5"
    >
      <span className="rounded-full bg-[#003366]/10 p-2.5 text-[#003366]">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="mt-3 text-lg font-semibold text-slate-900 md:text-xl">{step.keyword}</p>
      <p className="mt-1.5 text-center text-xs text-slate-600 md:text-sm">{step.hint}</p>
    </motion.article>
  );
}

export function VisionValuesPage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="vision"
      className="deck-page justify-center bg-gradient-to-b from-slate-50 to-white text-slate-900"
    >
      <div className="deck-container max-w-3xl px-0 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
          비전 · 핵심 가치 · 경영 방향
        </p>
        <div className="mx-auto mt-3 flex max-w-2xl items-center justify-center gap-2 md:mt-4 md:gap-3">
          <Target className="size-6 shrink-0 text-[#003366] md:size-7" aria-hidden />
          <h1 className="text-balance text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-lg md:text-xl lg:text-2xl">
            {ui.infographicVisionLine}
          </h1>
        </div>
      </div>

      <div className="deck-container mt-6 flex max-w-4xl flex-col items-center justify-center gap-4 md:mt-8 md:flex-row md:gap-1 md:px-2 lg:gap-2">
        {visionValuesFlow.map((step, i) => (
          <Fragment key={step.id}>
            <ValueCard step={step} i={i} reduce={reduce} />
            {i < visionValuesFlow.length - 1 && (
              <div className="hidden shrink-0 md:flex md:items-center" aria-hidden>
                <ChevronRight className="size-6 text-[#003366]/35 lg:size-7" strokeWidth={1.75} />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="deck-container mt-8 max-w-4xl px-2 md:mt-10">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
          경영·연간 목표(요약)
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {institutionalGoals.map((g, i) => {
            const GIcon = goalIconMap[g.lucide];
            return (
              <motion.article
                key={g.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getMotionTransition(reduce, {
                  delay: reduce ? 0 : 0.12 + i * 0.05,
                })}
                className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-sm md:px-5 md:py-4"
              >
                <span className="mt-0.5 shrink-0 rounded-lg bg-[#003366]/10 p-2 text-[#003366]">
                  <GIcon className="size-5 md:size-6" aria-hidden />
                </span>
                <div className="min-w-0 text-left">
                  <h2 className="text-sm font-semibold text-slate-900 md:text-base">{g.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 md:text-sm">
                    {g.shortDescription}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
