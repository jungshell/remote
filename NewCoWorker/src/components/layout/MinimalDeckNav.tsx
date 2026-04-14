"use client";

import { useDeck } from "@/context/DeckContext";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MinimalDeckNav() {
  const { pages, index, next, prev } = useDeck();
  const canPrev = index > 0;
  const canNext = index < pages.length - 1;
  const label = pages[index]?.label ?? "";

  return (
    <div
      className="no-print fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-white/20 bg-[#003366]/88 px-2 py-1.5 text-white shadow-lg backdrop-blur-sm"
      aria-label="Slide controls"
    >
      <span className="max-w-28 truncate px-1 text-xs font-medium text-white/90">{label}</span>
      <button
        type="button"
        onClick={prev}
        disabled={!canPrev}
        aria-label="이전 페이지"
        className={clsx(
          "inline-flex size-8 items-center justify-center rounded-md border transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300",
          canPrev
            ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
            : "cursor-not-allowed border-white/10 bg-white/5 text-white/35"
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={next}
        disabled={!canNext}
        aria-label="다음 페이지"
        className={clsx(
          "inline-flex size-8 items-center justify-center rounded-md border transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300",
          canNext
            ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
            : "cursor-not-allowed border-white/10 bg-white/5 text-white/35"
        )}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

