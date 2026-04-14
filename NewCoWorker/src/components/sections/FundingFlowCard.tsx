"use client";

import { fundingFlowSteps, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Landmark } from "lucide-react";
import clsx from "clsx";
import { useCallback, useId, useState } from "react";

export function FundingFlowCard() {
  const reduce = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const flowId = useId();

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className="rounded-2xl border border-[#003366]/15 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Landmark className="size-9 text-[#003366]" aria-hidden />
        <h3 className="text-xl font-semibold text-slate-900">{ui.fundingFlowTitle}</h3>
      </div>
      <p className="mt-3 text-slate-600">{ui.fundingFlowIntro}</p>
      <button
        type="button"
        data-print-hide
        aria-expanded={open}
        aria-controls={`${flowId}-flow`}
        className={clsx(
          "mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
          "bg-[#003366] text-white hover:bg-[#004080]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        )}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        {open ? ui.fundingFlowCtaHide : ui.fundingFlowCtaShow}
        <ArrowRight className={clsx("size-4 transition-transform", open && "rotate-90")} aria-hidden />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            id={`${flowId}-flow`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={getMotionTransition(reduce, { duration: 0.35 })}
            className="mt-6 space-y-4 overflow-hidden"
          >
            {fundingFlowSteps.map((step, i) => (
              <motion.li
                key={step.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={getMotionTransition(reduce, {
                  duration: 0.45,
                  delay: reduce ? 0 : i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                })}
                className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#003366] text-xs font-bold text-white"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{step.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
