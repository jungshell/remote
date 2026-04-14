"use client";

import { ui } from "@/content/site";
import type { Headquarters } from "@/content/types";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { HeadquartersIcon } from "./HeadquartersIcon";
import clsx from "clsx";
import { useCallback, useId, useState } from "react";

export function HeadquartersOrgDeck({ items }: { items: Headquarters[] }) {
  const reduce = usePrefersReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  const toggle = useCallback((id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
  }, []);

  return (
    <div className="mt-12">
      <h3 className="text-lg font-semibold text-slate-900">{ui.orgDeckTitle}</h3>
      <p className="mt-2 text-sm text-slate-600">{ui.orgDeckHint}</p>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-4 md:flex-wrap md:overflow-visible">
        {items.map((hq, index) => {
          const panelId = `${baseId}-${hq.id}-panel`;
          const expanded = openId === hq.id;
          return (
            <motion.article
              key={hq.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={getMotionTransition(reduce, {
                duration: 0.5,
                delay: reduce ? 0 : index * 0.06,
              })}
              className={clsx(
                "group relative min-w-[14rem] flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:min-w-[12rem]",
                "focus-within:ring-2 focus-within:ring-sky-400"
              )}
            >
              <div className="flex items-center gap-2">
                <HeadquartersIcon name={hq.lucideIcon} className="size-7 text-[#003366]" />
                <h4 className="font-semibold text-slate-900">{hq.name}</h4>
              </div>
              {hq.note && <p className="mt-2 text-xs text-amber-800/90">{hq.note}</p>}

              {/* 데스크톱: 호버 툴팁 (pointer: hover) */}
              <div
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 opacity-0 shadow-lg transition-opacity md:block md:group-hover:opacity-100"
              >
                <p className="font-semibold text-slate-900">2026 주요 목표</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {hq.goals2026.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                data-print-hide
                aria-expanded={expanded}
                aria-controls={panelId}
                className={clsx(
                  "mt-4 w-full rounded-lg border border-[#003366]/25 px-3 py-2 text-xs font-semibold text-[#003366]",
                  "hover:bg-[#003366]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                )}
                onClick={() => toggle(hq.id)}
              >
                {expanded ? "목표 접기" : "목표 보기"}
              </button>

              <div
                id={panelId}
                role="region"
                aria-label={`${hq.name} 2026 목표`}
                className={clsx(
                  "mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700",
                  !expanded && "hidden"
                )}
              >
                <p className="font-semibold text-slate-900">2026 주요 목표</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {hq.goals2026.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
