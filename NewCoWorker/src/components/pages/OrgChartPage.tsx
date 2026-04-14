"use client";

import { orgChartExternalUrl, orgChartRoot, ui } from "@/content/site";
import type { OrgUnit } from "@/content/types";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, ExternalLink, Network } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function OrgBranch({
  unit,
  depth,
  reduce,
  index,
}: {
  unit: OrgUnit;
  depth: number;
  reduce: boolean;
  index: number;
}) {
  const kids = unit.children;
  const hasKids = Boolean(kids?.length);
  const [open, setOpen] = useState(depth === 0 || depth === 1);

  return (
    <div className={depth > 0 ? "ms-3 border-s border-slate-200 ps-3 md:ms-4 md:ps-4" : ""}>
      <div className="flex items-start gap-2">
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 rounded-md p-0.5 text-[#003366] hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            aria-expanded={open}
            aria-label={open ? "하위 접기" : "하위 펼치기"}
          >
            {open ? (
              <ChevronDown className="size-5" aria-hidden />
            ) : (
              <ChevronRight className="size-5" aria-hidden />
            )}
          </button>
        ) : (
          <span className="inline-block w-6 shrink-0" aria-hidden />
        )}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reduce, { delay: reduce ? 0 : index * 0.04 })}
          className="min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm md:px-4 md:py-3"
        >
          <p className="font-semibold text-slate-900">{unit.label}</p>
          {unit.subtitle ? <p className="mt-0.5 text-sm text-slate-600">{unit.subtitle}</p> : null}
        </motion.div>
      </div>
      {hasKids && open && kids ? (
        <div className="mt-2 space-y-2">
          {kids.map((child, i) => (
            <OrgBranch key={child.id} unit={child} depth={depth + 1} reduce={reduce} index={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OrgChartPage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="orgChart"
      className="deck-page justify-center bg-gradient-to-b from-slate-50 to-white text-slate-900"
    >
      <div className="deck-container flex max-w-2xl flex-col gap-3 px-4 text-center md:gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
          진흥원 소개
        </p>
        <div className="mx-auto flex items-center justify-center gap-2">
          <Network className="size-6 shrink-0 text-[#003366] md:size-7" aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">조직도 요약</h1>
        </div>
        <p className="mx-auto max-w-xl text-pretty text-sm text-slate-600 md:text-base">
          {ui.orgChartLead()}
        </p>
        <p>
          <Link
            href={orgChartExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#003366] underline-offset-4 hover:underline"
          >
            공식 홈페이지 조직도
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>

      <div className="deck-container mt-6 max-h-[min(50vh,26rem)] w-full max-w-xl overflow-y-auto px-4 pb-2 md:mt-8 md:max-h-[min(56vh,30rem)]">
        <OrgBranch unit={orgChartRoot} depth={0} reduce={reduce} index={0} />
      </div>
    </section>
  );
}
