"use client";

import { institutionHistory, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";

export function HistoryTimelinePage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="history"
      className="deck-page justify-center bg-gradient-to-b from-white to-slate-50 text-slate-900"
    >
      <div className="deck-container flex max-w-3xl flex-col gap-3 px-4 text-center md:gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
          진흥원 소개
        </p>
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2">
          <CalendarClock className="size-6 shrink-0 text-[#003366] md:size-7" aria-hidden />
          <h1 className="text-balance text-xl font-semibold tracking-tight md:text-2xl">연혁</h1>
        </div>
        <p className="mx-auto max-w-xl text-pretty text-sm text-slate-600 md:text-base">
          {ui.historyLead}
        </p>
      </div>

      <div className="deck-container mt-6 max-h-[min(52vh,28rem)] w-full max-w-lg overflow-y-auto px-4 pb-2 md:mt-8 md:max-h-[min(58vh,32rem)]">
        <div className="relative ms-3 border-s-2 border-[#003366]/25 ps-6 md:ms-4 md:ps-8">
          {institutionHistory.map((entry, i) => (
            <motion.article
              key={entry.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={getMotionTransition(reduce, {
                delay: reduce ? 0 : i * 0.05,
              })}
              className="relative pb-6 last:pb-0"
            >
              <span
                className="absolute -start-[calc(0.5rem+2px)] top-1.5 size-3 rounded-full border-2 border-[#003366] bg-white md:-start-[calc(1rem+2px)]"
                aria-hidden
              />
              <p className="text-xs font-bold uppercase tracking-wider text-[#003366]">
                {entry.year}
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-900 md:text-lg">{entry.title}</h2>
              {entry.detail ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{entry.detail}</p>
              ) : null}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
