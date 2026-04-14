"use client";

import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";

const labels = [
  { text: "콘텐츠", color: "#7dd3fc", angle: -118 },
  { text: "ICT", color: "#c4b5fd", angle: 12 },
  { text: "영상", color: "#fde047", angle: 122 },
] as const;

export function HeroConvergenceGraphic({ className }: { className?: string }) {
  const reduce = usePrefersReducedMotion();

  return (
    <div className={className ?? ""} aria-hidden>
      <svg
        viewBox="0 0 520 360"
        className="mx-auto h-full w-full max-w-3xl overflow-visible"
        role="img"
        aria-label="콘텐츠·ICT·영상이 충남 지역으로 수렴하는 추상 그래픽"
      >
        <defs>
          <radialGradient id="heroGlow" cx="50%" cy="46%" r="58%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#0ea5e9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#003366" stopOpacity="0" />
          </radialGradient>
          <filter id="heroBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
          </filter>
        </defs>

        {/* abstract province silhouette */}
        <motion.path
          fill="url(#heroGlow)"
          filter="url(#heroBlur)"
          initial={{ opacity: reduce ? 1 : 0.55 }}
          animate={{ opacity: reduce ? 1 : [0.55, 0.95, 0.7, 0.95, 0.7] }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }
          d="M188 42 C240 28 312 36 348 78 C392 118 402 168 382 218 C362 268 308 306 252 312 C196 318 138 292 106 248 C74 204 68 152 96 108 C124 64 158 50 188 42 Z"
        />
        <path
          fill="none"
          stroke="white"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          d="M188 42 C240 28 312 36 348 78 C392 118 402 168 382 218 C362 268 308 306 252 312 C196 318 138 292 106 248 C74 204 68 152 96 108 C124 64 158 50 188 42 Z"
        />

        {/* convergence arcs */}
        {[
          { d: "M 78 108 Q 180 200 260 178", color: labels[0].color },
          { d: "M 442 98 Q 340 188 260 178", color: labels[1].color },
          { d: "M 260 312 Q 260 248 260 178", color: labels[2].color },
        ].map((arc, i) => (
          <motion.path
            key={arc.d}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.85"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={getMotionTransition(reduce, {
              duration: 1.1,
              delay: reduce ? 0 : 0.15 + i * 0.12,
              ease: [0.22, 1, 0.36, 1],
            })}
          />
        ))}

        <circle cx="260" cy="178" r="10" fill="#f8fafc" fillOpacity="0.95" />
        <circle cx="260" cy="178" r="22" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />

        {labels.map((L, i) => {
          const rad = (L.angle * Math.PI) / 180;
          const cx = 260 + Math.cos(rad) * 168;
          const cy = 178 + Math.sin(rad) * 112;
          return (
            <motion.g
              key={L.text}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={getMotionTransition(reduce, {
                duration: 0.5,
                delay: reduce ? 0 : 0.45 + i * 0.08,
              })}
            >
              <rect
                x={cx - 44}
                y={cy - 16}
                width={88}
                height={32}
                rx={16}
                fill="#00264d"
                stroke={L.color}
                strokeOpacity="0.85"
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={cy + 5}
                textAnchor="middle"
                fill="#f8fafc"
                style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 600 }}
              >
                {L.text}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
