"use client";

import { getMotionTransition } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motion } from "framer-motion";

const stages = [
  {
    idx: "01",
    time: "0~10분",
    title: "탐색",
    desc: ["톤앤매너 체감", "진흥원 규모 확인"],
  },
  {
    idx: "02",
    time: "10~30분",
    title: "거버넌스",
    desc: ["도의회 보고 이유", "도청과 협의 흐름"],
  },
  {
    idx: "03",
    time: "30~50분",
    title: "사업 매칭",
    desc: ["내 본부 예산 위치", "협업 지점 찾기"],
  },
  {
    idx: "04",
    time: "50~60분",
    title: "질의응답",
    desc: ["FAQ로 즉시 확인", "남은 궁금증 정리"],
  },
];

export function CourseTimeline() {
  const reduce = usePrefersReducedMotion();

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-200/90">
            30~60분 코스
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            교육 흐름을 따라가세요
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/80">
          스크롤로 섹션을 이동하면서, 각 파트에서 “보고-예산-협업” 감각을
          잡는 구조입니다.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {stages.map((s, i) => (
          <motion.div
            key={s.idx}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={getMotionTransition(reduce, {
              duration: 0.5,
              delay: reduce ? 0 : i * 0.05,
            })}
            className="rounded-xl border border-white/15 bg-[#00264d] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-widest text-sky-200/90">
                  {s.time}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-white/90">{s.idx}</div>
                  <div className="text-lg font-semibold text-white">{s.title}</div>
                </div>
              </div>
              <div className="h-10 w-10 shrink-0 rounded-full border border-white/20 bg-white/5" />
            </div>
            <ul className="mt-3 space-y-1 text-sm text-white/85">
              {s.desc.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 size-1.5 rounded-full bg-sky-300" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

