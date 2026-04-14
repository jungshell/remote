"use client";

import { regionHubs } from "@/content/site";
import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

export function RegionNetworkPage() {
  const reduce = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState(regionHubs[0]?.id ?? "");
  const active = useMemo(
    () => regionHubs.find((h) => h.id === activeId) ?? regionHubs[0],
    [activeId]
  );

  return (
    <section
      id="region"
      className="deck-page justify-center bg-gradient-to-br from-slate-100 via-white to-sky-50 text-slate-900"
    >
      <div className="deck-container grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <header className="md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003366] md:text-xs">
            15개 시·군 네트워크
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 md:mt-2 md:text-3xl lg:text-4xl">
            <Share2 className="size-7 shrink-0 text-[#003366] md:size-8" aria-hidden />
            충남 거점 · 특화 키워드
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs text-slate-600 md:text-sm">
            시·군별 거점과 권역 키워드입니다. 실루엣·좌표는 안내용입니다.
          </p>
        </header>

        <div className="relative flex min-h-[240px] items-stretch justify-center md:min-h-[270px]">
          <p className="absolute left-0 top-0 z-10 flex items-center gap-1 text-[10px] font-medium text-slate-500 md:text-xs">
            <MapPin className="size-3.5" aria-hidden />
            도 실루엣 · 거점
          </p>
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full max-w-md drop-shadow-md"
            role="img"
            aria-label="충청남도 단순화 지도와 시군 거점"
          >
            <defs>
              <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            <path
              fill="url(#land)"
              stroke="#64748b"
              strokeWidth="0.6"
              d="M 32 14 C 48 10 68 12 78 24 C 88 36 90 52 84 66 C 78 82 62 90 44 88 C 28 86 14 72 12 52 C 10 36 18 22 32 14 Z"
            />
            {regionHubs.map((hub) => {
              const cx = hub.x * 72 + 14;
              const cy = hub.y * 58 + 18;
              const isOn = hub.id === active?.id;
              return (
                <g key={hub.id}>
                  <motion.circle
                    role="button"
                    tabIndex={0}
                    aria-label={`${hub.label} 선택`}
                    cx={cx}
                    cy={cy}
                    r={isOn ? 3.2 : 2.4}
                    fill={isOn ? "#0ea5e9" : "#475569"}
                    stroke="#f8fafc"
                    strokeWidth="0.9"
                    className="cursor-pointer outline-none"
                    onClick={() => setActiveId(hub.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveId(hub.id);
                      }
                    }}
                    initial={false}
                    animate={{ scale: isOn ? 1.06 : 1 }}
                    transition={getMotionTransition(reduce, { duration: 0.25 })}
                  />
                  <text
                    x={cx + 4}
                    y={cy - 4}
                    className="fill-slate-700"
                    style={{ fontSize: "3.2px", fontWeight: 600 }}
                  >
                    {hub.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex min-h-[240px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:min-h-[270px]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#003366]">마인드맵</p>
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={getMotionTransition(reduce, { duration: 0.35 })}
                className="mt-4 flex flex-1 flex-col"
              >
                <div className="rounded-xl bg-[#003366] px-4 py-3 text-center text-white shadow-md">
                  <p className="text-xs text-sky-200/90">선택 거점</p>
                  <p className="text-xl font-semibold">{active.label}</p>
                </div>
                <div className="relative mt-6 flex flex-1 flex-wrap content-start justify-center gap-3 pl-4 before:absolute before:left-2 before:top-0 before:h-[calc(100%-0.5rem)] before:w-px before:bg-slate-200 before:content-['']">
                  {active.keywords.map((kw, i) => (
                    <motion.span
                      key={kw}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={getMotionTransition(reduce, {
                        delay: reduce ? 0 : 0.05 * i,
                      })}
                      className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-950"
                    >
                      {kw}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
