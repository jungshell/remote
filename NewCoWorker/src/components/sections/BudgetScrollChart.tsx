"use client";

import { ui } from "@/content/site";
import type { Headquarters } from "@/content/types";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { HeadquartersIcon } from "./HeadquartersIcon";

const maxShare = (items: Headquarters[]) =>
  Math.max(...items.map((h) => h.budgetSharePercent), 1);

export function BudgetScrollChart({ items }: { items: Headquarters[] }) {
  const reduce = usePrefersReducedMotion();
  const cap = maxShare(items);

  return (
    <div className="mt-6 space-y-5">
      <h3 className="text-lg font-semibold text-white">{ui.budgetBlockTitle}</h3>
      <p className="text-sm text-white/75">{ui.budgetBlockHint}</p>
      <ul className="space-y-4">
        {items.map((hq) => (
          <li key={hq.id} className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <HeadquartersIcon name={hq.lucideIcon} className="size-6 text-sky-300" />
              <span className="font-medium text-white">{hq.name}</span>
              <span className="text-sm text-white/80">
                {hq.budget2026BillionWon}억 원 · {hq.budgetSharePercent}%
              </span>
            </div>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-black/25"
              role="presentation"
              aria-label={`${hq.name} 예산 비중 ${hq.budgetSharePercent}%`}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
                initial={{ scaleX: reduce ? 1 : 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={getMotionTransition(reduce, {
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                })}
                style={{
                  width: `${(hq.budgetSharePercent / cap) * 100}%`,
                  transformOrigin: "left center",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
