"use client";

import { governanceTree, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { GovernanceTree } from "./GovernanceTree";

export function SectionGovernance() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="governance"
      className="deck-page bg-[#003366] text-[var(--color-text-on-dark)]"
    >
      <div className="deck-container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={getMotionTransition(reduce, { duration: 0.65 })}
          className="flex items-start gap-3"
        >
          <Network className="mt-1 size-8 shrink-0 text-sky-300" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-200/90">
              2 · 거버넌스
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              거버넌스
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
              {ui.governanceLead()}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={getMotionTransition(reduce, { duration: 0.55 })}
          className="mt-6 overflow-x-auto rounded-2xl border border-white/15 bg-[#00264d] p-5 md:p-6"
        >
          <GovernanceTree root={governanceTree} />
        </motion.div>
      </div>
    </section>
  );
}
