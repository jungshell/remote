"use client";

import type { PortfolioMockSeries } from "@/content/types";
import { portfolioMockSeries, ui } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";
import { Clapperboard, Cpu, Palette } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const COLORS = ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399"];

function iconFor(card: PortfolioMockSeries) {
  if (card.id === "content") return Palette;
  if (card.id === "ict") return Cpu;
  return Clapperboard;
}

export function PortfolioInfographicPage() {
  const reduce = usePrefersReducedMotion();

  return (
    <section
      id="portfolio"
      className="deck-page justify-center bg-[#003366] text-[var(--color-text-on-dark)]"
    >
      <div className="deck-container flex max-w-5xl flex-col gap-4 md:gap-5">
        <header className="shrink-0 space-y-1.5 text-center md:space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/90 md:text-xs">
            산업 포트폴리오
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">콘텐츠 · ICT · 영상</h1>
          <p className="mx-auto max-w-3xl px-1 text-xs leading-snug text-white/80 md:text-sm">
            {ui.portfolioLegalHint}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:items-stretch">
          {portfolioMockSeries.map((card, i) => {
            const Icon = iconFor(card);
            return (
              <motion.article
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getMotionTransition(reduce, {
                  duration: 0.45,
                  delay: reduce ? 0 : i * 0.06,
                })}
                className="flex min-h-[210px] flex-col rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-sm md:min-h-[220px]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-xl bg-white/10 p-2 text-sky-200">
                    <Icon className="size-6 md:size-7" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold md:text-xl">{card.title}</h2>
                </div>

                <div className="mt-3 h-[138px] w-full md:h-[148px]">
                  {card.chartKind === "bar" ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={card.series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: "rgba(248,250,252,0.78)", fontSize: 10 }} interval={0} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.06)" }}
                          formatter={(v: number) => [`${v}%`, "비중"]}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} name="비중">
                          {card.series.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={card.series}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={62}
                          paddingAngle={2}
                        >
                          {card.series.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [`${v}%`, "비중"]}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
