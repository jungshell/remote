"use client";

import { facilitiesDetailed, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { Building2, ExternalLink } from "lucide-react";
import Link from "next/link";

const facilitiesInfoUrl = "https://ccon.kr/" as const;

export function FacilitiesPage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="facilities"
      className="deck-page justify-center bg-gradient-to-b from-slate-50 to-white text-slate-900"
    >
      <div className="deck-container flex max-w-4xl flex-col gap-3 px-4 text-center md:gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
          사업 안내
        </p>
        <div className="mx-auto flex items-center justify-center gap-2">
          <Building2 className="size-6 shrink-0 text-[#003366] md:size-7" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">운영 시설</h1>
        </div>
        <p className="mx-auto max-w-2xl text-pretty text-sm text-slate-600 md:text-base">
          {ui.facilitiesLead}
        </p>
        <p>
          <Link
            href={facilitiesInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#003366] underline-offset-4 hover:underline"
          >
            충남콘텐츠진흥원 홈페이지
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>

      <div className="deck-container mt-6 grid max-h-[min(52vh,28rem)] grid-cols-1 gap-3 overflow-y-auto px-4 pb-2 sm:grid-cols-2 md:mt-8 md:max-h-[min(58vh,32rem)] md:gap-4">
        {facilitiesDetailed.map((f, i) => (
          <motion.article
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={getMotionTransition(reduce, { delay: reduce ? 0 : i * 0.04 })}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm md:p-5"
          >
            <h2 className="text-base font-semibold text-slate-900 md:text-lg">{f.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.role}</p>
            {f.location ? (
              <p className="mt-2 text-xs text-slate-500">{f.location}</p>
            ) : null}
          </motion.article>
        ))}
      </div>
    </section>
  );
}
