"use client";

import type { PurposeProjectBudget } from "@/content/types";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useMemo, useState } from "react";

const formatEok = (n: number) => n.toFixed(2).replace(/\.00$/, "");

export function PurposeProjectBudgetChart({
  items,
}: {
  items: PurposeProjectBudget[];
}) {
  const reduce = usePrefersReducedMotion();
  const departments = useMemo(
    () => ["전체", ...Array.from(new Set(items.map((i) => i.department)))],
    [items]
  );
  const [selected, setSelected] = useState("전체");

  const filtered = useMemo(() => {
    const list = selected === "전체" ? items : items.filter((i) => i.department === selected);
    return [...list].sort((a, b) => b.budget2026BillionWon - a.budget2026BillionWon);
  }, [items, selected]);

  const max = Math.max(...filtered.map((f) => f.budget2026BillionWon), 1);

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <h3 className="text-lg font-semibold text-slate-900">목적사업별 예산 분포</h3>
      <p className="mt-2 text-sm text-slate-600">
        본부 필터를 선택하면 사업별 예산 우선순위를 바로 확인할 수 있습니다.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {departments.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setSelected(d)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              selected === d
                ? "border-[#003366] bg-[#003366] text-white"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[26rem] space-y-2.5 overflow-y-auto pr-1">
        {filtered.map((p, i) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{p.project}</p>
              <span className="text-xs text-slate-700">
                {formatEok(p.budget2026BillionWon)}억 ({p.department})
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                initial={{ scaleX: reduce ? 1 : 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={getMotionTransition(reduce, { duration: 0.6, delay: reduce ? 0 : i * 0.015 })}
                style={{
                  width: `${(p.budget2026BillionWon / max) * 100}%`,
                  transformOrigin: "left center",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

