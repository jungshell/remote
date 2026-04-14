"use client";

import { supportPrograms2026, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";

export function SupportPrograms2026Page() {
  const reduce = usePrefersReducedMotion();

  return (
    <section id="support2026" className="deck-page justify-center bg-[#003366] text-slate-50">
      <div className="deck-container flex max-w-4xl flex-col gap-2 px-4 text-center md:gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/90 md:text-xs">
          사업 안내
        </p>
        <div className="mx-auto flex items-center justify-center gap-2">
          <ClipboardList className="size-6 shrink-0 text-sky-200 md:size-7" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">2026 지원사업 요약</h1>
        </div>
        <p className="mx-auto max-w-2xl text-pretty text-sm text-white/80 md:text-base">
          {ui.support2026Lead}
        </p>
        <p className="text-xs text-sky-200/80 md:text-sm">
          {ui.support2026AsOfLabel}: {ui.organizationDataNotice}
        </p>
      </div>

      <div className="deck-container mt-5 grid max-h-[min(52vh,28rem)] grid-cols-1 gap-3 overflow-y-auto px-4 pb-2 sm:grid-cols-2 md:mt-6 md:max-h-[min(56vh,30rem)] md:gap-4">
        {supportPrograms2026.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getMotionTransition(reduce, { delay: reduce ? 0 : i * 0.04 })}
            className="rounded-2xl border border-white/15 bg-[#00264d] p-4 text-left shadow-sm"
          >
            <h2 className="text-base font-semibold text-white md:text-lg">{p.name}</h2>
            <dl className="mt-2 space-y-1.5 text-sm text-white/85">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sky-200/90">
                  대상
                </dt>
                <dd>{p.audience}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-sky-200/90">
                  목적
                </dt>
                <dd>{p.purpose}</dd>
              </div>
              {p.period ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-sky-200/90">
                    시기·형태
                  </dt>
                  <dd>{p.period}</dd>
                </div>
              ) : null}
              {p.scaleNote ? (
                <p className="border-t border-white/10 pt-2 text-xs text-sky-100/90">{p.scaleNote}</p>
              ) : null}
            </dl>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
