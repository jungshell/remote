"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getMotionTransition } from "@/lib/motion";
import { useDeck } from "@/context/DeckContext";

type Direction = 1 | -1;

export function FullPageDeck({
  renderPage,
}: {
  renderPage: (id: string) => React.ReactNode;
}) {
  const reduce = usePrefersReducedMotion();
  const { pages, index, next, prev, goToId } = useDeck();
  const [dir, setDir] = useState<Direction>(1);
  const lockRef = useRef(false);

  const activeId = pages[index]?.id ?? "welcome";

  const unlockSoon = () => {
    window.setTimeout(() => {
      lockRef.current = false;
    }, 550);
  };

  const go = useCallback(
    (d: Direction) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setDir(d);
      if (d === 1) next();
      else prev();
      unlockSoon();
    },
    [next, prev]
  );

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (reduce) return;
      // ignore trackpad micro scroll
      if (Math.abs(e.deltaY) < 18) return;
      e.preventDefault();
      go(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [go, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "Home") {
        e.preventDefault();
        goToId(pages[0]?.id ?? activeId);
      }
      if (e.key === "End") {
        e.preventDefault();
        goToId(pages[pages.length - 1]?.id ?? activeId);
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, go, goToId, pages]);

  // touch swipe
  useEffect(() => {
    let startY = 0;
    let active = false;
    const onTouchStart = (e: TouchEvent) => {
      active = true;
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = startY - y;
      if (Math.abs(dy) < 45) return;
      active = false;
      go(dy > 0 ? 1 : -1);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [go]);

  const variants = useMemo(
    () => ({
      enter: (d: Direction) => ({
        y: d === 1 ? "12%" : "-12%",
        opacity: 0,
        scale: 0.992,
      }),
      center: { y: "0%", opacity: 1, scale: 1 },
      exit: (d: Direction) => ({
        y: d === 1 ? "-12%" : "12%",
        opacity: 0,
        scale: 0.992,
      }),
    }),
    []
  );

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={activeId}
          custom={dir}
          variants={variants}
          initial={reduce ? "center" : "enter"}
          animate="center"
          exit="exit"
          transition={getMotionTransition(reduce, {
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          })}
          className="absolute inset-0"
        >
          <div
            className="box-border h-full min-h-[100svh] w-full overflow-x-hidden overflow-y-auto py-3 pl-[var(--deck-safe-left)] pr-[var(--deck-safe-right)] md:min-h-0 md:py-4"
          >
            {renderPage(activeId)}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

