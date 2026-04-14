"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type LenisContextValue = {
  scrollToId: (id: string) => void;
};

const LenisContext = createContext<LenisContextValue | null>(null);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      touchMultiplier: 1.15,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [prefersReducedMotion]);

  const scrollToId = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(el, { offset: -72, immediate: prefersReducedMotion });
      } else {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    },
    [prefersReducedMotion]
  );

  const value = useMemo(() => ({ scrollToId }), [scrollToId]);

  return <LenisContext.Provider value={value}>{children}</LenisContext.Provider>;
}

export function useLenisNav(): LenisContextValue {
  const ctx = useContext(LenisContext);
  const prefersReducedMotion = usePrefersReducedMotion();
  if (!ctx) {
    return {
      scrollToId: (id: string) => {
        const el = document.getElementById(id);
        el?.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      },
    };
  }
  return ctx;
}
