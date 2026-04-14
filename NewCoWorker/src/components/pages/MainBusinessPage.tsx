"use client";

import { mainBusinessCategories, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";

export function MainBusinessPage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="mainBusiness"
      className="deck-page justify-center bg-gradient-to-b from-white to-slate-50 text-slate-900"
    >
      <div className="deck-container flex max-w-4xl flex-col gap-3 px-4 text-center md:gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
          사업 안내
        </p>
        <div className="mx-auto flex items-center justify-center gap-2">
          <Briefcase className="size-6 shrink-0 text-[#003366] md:size-7" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">주요사업 범주</h1>
        </div>
        <p className="mx-auto max-w-2xl text-pretty text-sm text-slate-600 md:text-base">
          {ui.mainBusinessLead}
        </p>
      </div>

      <div className="deck-container mt-6 grid max-h-[min(54vh,30rem)] grid-cols-1 gap-3 overflow-y-auto px-4 pb-2 sm:grid-cols-2 md:mt-8 md:max-h-[min(58vh,34rem)] md:gap-4">
        {mainBusinessCategories.map((cat, i) => (
          <motion.article
            key={cat.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getMotionTransition(reduce, { delay: reduce ? 0 : i * 0.05 })}
            className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:p-5"
          >
            <h2 className="text-lg font-semibold text-slate-900">{cat.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cat.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[#003366]/10 px-2.5 py-0.5 text-xs font-medium text-[#003366]"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{cat.summary}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
