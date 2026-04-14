"use client";

import { ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { FundingFlowCard } from "./FundingFlowCard";
import { Landmark } from "lucide-react";

export function SectionIdentityContext() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="identityContext"
      className="deck-page justify-center bg-white text-slate-900"
    >
      <div className="deck-container flex min-h-min max-w-6xl flex-col gap-4 md:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { duration: 0.55 })}
          className="flex items-start gap-3"
        >
          <Landmark className="mt-0.5 size-7 shrink-0 text-[#003366] md:size-8" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#003366] md:text-xs">
              기관 정체성 · 이어서
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">취지 요약 · 출연 구조</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
              설립 취지와 도·기관·도민 간 자금·서비스 흐름을 한 슬라이드에서 다룹니다.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { duration: 0.55, delay: 0.04 })}
          className="grid gap-4 md:grid-cols-2 md:gap-5"
        >
          <div className="rounded-2xl border border-[#003366]/20 bg-[#003366] p-5 text-white shadow-md md:p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-sky-200/90 md:text-sm">
              {ui.identityPurposeLabel}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/95 md:mt-4 md:text-base">
              정관 목적에 따라 산업 경쟁력과 도민 체감을 연결하고, 사업계획·보고 서문과 표현을 맞춥니다.
            </p>
          </div>
          <FundingFlowCard />
        </motion.div>
      </div>
    </section>
  );
}
