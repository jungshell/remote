"use client";

import type { DepartmentBudget } from "@/content/types";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";

const maxShare = (items: DepartmentBudget[]) =>
  Math.max(...items.map((h) => h.budgetSharePercentWithinPurpose), 1);

export function DepartmentBudgetChart({ items }: { items: DepartmentBudget[] }) {
  const reduce = usePrefersReducedMotion();
  const cap = maxShare(items);

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-6">
      <h3 className="text-lg font-semibold text-slate-900">본부별 목적사업 예산 비중</h3>
      <p className="mt-2 text-sm text-slate-600">
        목적사업 총액 208.26억 기준으로 본부별 배분 비중을 보여줍니다.
      </p>
      <ul className="mt-5 space-y-3">
        {items.map((d) => (
          <li key={d.department} className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#003366]">{d.department}</span>
              <span className="text-sm text-slate-700">
                {d.budget2026BillionWon}억 · {d.budgetSharePercentWithinPurpose}%
              </span>
            </div>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#003366] to-sky-500"
                initial={{ scaleX: reduce ? 1 : 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={getMotionTransition(reduce, { duration: 0.75 })}
                style={{
                  width: `${(d.budgetSharePercentWithinPurpose / cap) * 100}%`,
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

