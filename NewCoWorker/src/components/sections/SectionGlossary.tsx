"use client";

import { glossary, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { BookMarked } from "lucide-react";

export function SectionGlossary() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="glossary"
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
          <BookMarked className="mt-1 size-8 shrink-0 text-sky-300" aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-200/90">
              4 · 용어
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{ui.glossaryTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/85 md:text-base">{ui.glossaryLead}</p>
          </div>
        </motion.div>

        <dl className="mt-6 space-y-4">
          {glossary.map((entry, i) => (
            <motion.div
              key={entry.term}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={getMotionTransition(reduce, {
                duration: 0.45,
                delay: reduce ? 0 : i * 0.05,
              })}
              className="rounded-2xl border border-white/15 bg-[#00264d] px-4 py-3.5"
            >
              <dt className="font-semibold text-sky-200">{entry.term}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-white/88">{entry.definition}</dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
