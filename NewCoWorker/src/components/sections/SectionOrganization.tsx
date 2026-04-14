"use client";

import {
  departmentBudgets2026,
  departmentPrograms2026,
  headquarters2026,
  purposeProjectBudgets2026,
  ui,
} from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { BudgetScrollChart } from "./BudgetScrollChart";
import { DepartmentBudgetChart } from "./DepartmentBudgetChart";
import { HeadquartersOrgDeck } from "./HeadquartersOrgDeck";
import { PurposeProjectBudgetChart } from "./PurposeProjectBudgetChart";
import { useState } from "react";

export function SectionOrganization() {
  const reduce = usePrefersReducedMotion();
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  return (
    <section
      id="organization"
      className="deck-page bg-white text-slate-900"
    >
      <div className="deck-container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={getMotionTransition(reduce, { duration: 0.65 })}
          className="flex items-start gap-3"
        >
          <Layers className="mt-1 size-8 shrink-0 text-[#003366]" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#003366]">
              3 · 조직 및 사업
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              조직 및 사업
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
              {ui.organizationLead()}
            </p>
            <p className="mt-3 max-w-3xl rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 md:text-sm">
              {ui.organizationDataNotice}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={getMotionTransition(reduce, { duration: 0.55 })}
          className="mt-6 rounded-2xl border border-[#003366]/20 bg-[#003366] p-5 md:p-6"
        >
          <BudgetScrollChart items={headquarters2026} />
        </motion.div>

        <DepartmentBudgetChart items={departmentBudgets2026} />

        <PurposeProjectBudgetChart items={purposeProjectBudgets2026} />

        <HeadquartersOrgDeck items={headquarters2026} />

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">부서별 주요 사업</h3>
          <p className="mt-1.5 text-sm text-slate-600">
            기본은 “대표 3개”만 보여줍니다. 필요하면 펼쳐서 전체 사업을 확인하세요.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {departmentPrograms2026.map((d) => {
              const expanded = expandedDept === d.department;
              const programs = expanded ? d.programs : d.programs.slice(0, 3);

              return (
                <article
                  key={d.department}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h4 className="font-semibold text-[#003366]">{d.department}</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {programs.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  {d.programs.length > 3 && (
                    <button
                      type="button"
                      data-print-hide
                      className="mt-3 w-full rounded-lg border border-[#003366]/25 bg-white px-3 py-2 text-xs font-semibold text-[#003366] hover:bg-[#003366]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
                      onClick={() =>
                        setExpandedDept((cur) =>
                          cur === d.department ? null : d.department
                        )
                      }
                    >
                      {expanded ? "접기" : "전체 보기"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
