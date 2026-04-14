"use client";

import { faqItems, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

export function SectionFaq() {
  const reduce = usePrefersReducedMotion();
  const [open, setOpen] = useState<string | null>(faqItems[0]?.id ?? null);

  return (
    <section id="faq" className="deck-page bg-white text-slate-900">
      <div className="deck-container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={getMotionTransition(reduce, { duration: 0.65 })}
          className="flex items-start gap-3"
        >
          <HelpCircle className="mt-1 size-8 shrink-0 text-[#003366]" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#003366]">5 · FAQ</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              신입사원 FAQ
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
              {ui.faqLead}{" "}
              <code className="rounded bg-slate-100 px-1 text-sm">#faq-budget</code>
            </p>
          </div>
        </motion.div>

        <div className="mt-6 space-y-3">
          {faqItems.map((item, index) => {
            const expanded = open === item.id;
            return (
              <motion.div
                key={item.id}
                id={item.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={getMotionTransition(reduce, {
                  duration: 0.45,
                  delay: reduce ? 0 : index * 0.04,
                })}
                className="scroll-mt-28 rounded-2xl border border-slate-200 bg-slate-50"
              >
                <h3 className="sr-only">{item.question}</h3>
                <button
                  type="button"
                  data-print-hide
                  aria-expanded={expanded}
                  aria-controls={`${item.id}-panel`}
                  className={clsx(
                    "flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-slate-900",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                  )}
                  onClick={() => setOpen(expanded ? null : item.id)}
                >
                  {item.question}
                  <span className="text-xs font-normal text-slate-500" aria-hidden>
                    {expanded ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={`${item.id}-panel`}
                  role="region"
                  className={clsx("border-t border-slate-200 px-5 pb-4 text-sm leading-relaxed text-slate-600", !expanded && "hidden")}
                >
                  {item.answer}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
