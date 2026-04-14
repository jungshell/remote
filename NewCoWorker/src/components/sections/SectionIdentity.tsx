"use client";

import { getInstitutionDisplayName, institutionOverview } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

export function SectionIdentity() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="identity"
      className="deck-page justify-center bg-white text-slate-900"
    >
      <div className="deck-container max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { duration: 0.55 })}
          className="flex items-start gap-3"
        >
          <Building2 className="mt-0.5 size-7 shrink-0 text-[#003366] md:size-8" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#003366] md:text-xs">
              기관 정체성
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">일반현황</h2>
            <p className="mt-2 max-w-3xl text-sm leading-snug text-slate-600 md:text-base">
              <strong className="font-semibold text-slate-800">{getInstitutionDisplayName()}</strong>의
              설립근거·연혁·업무·시설을 요약합니다. (다음 슬라이드: 취지·출연 흐름)
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { duration: 0.5, delay: 0.05 })}
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:mt-5 md:p-5"
        >
          <h3 className="text-base font-semibold text-slate-900 md:text-lg">우리 기관소개 · 일반현황</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:gap-4">
            <article className="rounded-xl border border-slate-200 bg-white p-3.5 md:p-4">
              <h4 className="text-sm font-semibold text-[#003366] md:text-base">설립근거</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-700 md:text-sm">
                {institutionOverview.legalBasis.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-3.5 md:p-4">
              <h4 className="text-sm font-semibold text-[#003366] md:text-base">주요연혁</h4>
              <ol className="mt-2 space-y-1.5">
                {institutionOverview.milestones.map((m) => (
                  <li key={`${m.year}-${m.text}`} className="flex gap-2 text-xs text-slate-700 md:text-sm">
                    <span className="w-12 shrink-0 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center text-[10px] font-semibold text-slate-700 md:w-14 md:text-xs">
                      {m.year}
                    </span>
                    <span className="leading-snug">{m.text}</span>
                  </li>
                ))}
              </ol>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-3.5 md:p-4">
              <h4 className="text-sm font-semibold text-[#003366] md:text-base">주요업무</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {institutionOverview.keyWork.map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 md:text-xs"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-3.5 md:p-4">
              <h4 className="text-sm font-semibold text-[#003366] md:text-base">주요시설</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-700 md:text-sm">
                {institutionOverview.facilities.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
