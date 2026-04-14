"use client";

import { departmentBudgets2026, headquarters2026, purposeProjectBudgets2026 } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";

const totalBudget = headquarters2026.reduce((acc, cur) => acc + cur.budget2026BillionWon, 0);
const purposeShare = headquarters2026.find((h) => h.id === "core-business")?.budgetSharePercent ?? 0;
const topProjects = [...purposeProjectBudgets2026]
  .sort((a, b) => b.budget2026BillionWon - a.budget2026BillionWon)
  .slice(0, 3);
const largestDepartment = [...departmentBudgets2026].sort(
  (a, b) => b.budget2026BillionWon - a.budget2026BillionWon
)[0];

const format = (n: number) => n.toFixed(2).replace(/\.00$/, "");

export function KeyStatsDashboard() {
  const reduce = usePrefersReducedMotion();

  return (
    <section className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm md:p-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold text-white md:text-3xl">핵심 숫자 대시보드</h2>
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
          2026년 1차 추경 기준
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {[
          { label: "총 예산", value: `${format(totalBudget)}억` },
          { label: "목적사업 비중", value: `${purposeShare}%` },
          { label: "최대 본부", value: largestDepartment?.department ?? "-" },
          { label: "의회 대응", value: "경영혁신본부" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={getMotionTransition(reduce, { duration: 0.45, delay: reduce ? 0 : i * 0.05 })}
            className="rounded-xl border border-white/15 bg-[#00264d] p-4"
          >
            <p className="text-xs tracking-widest text-sky-200/90">{card.label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/15 bg-[#00264d] p-4">
        <p className="text-xs tracking-widest text-sky-200/90">목적사업 TOP 3</p>
        <ol className="mt-3 space-y-2 text-sm text-white/90">
          {topProjects.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span>{p.project}</span>
              <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-xs">
                {format(p.budget2026BillionWon)}억
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

