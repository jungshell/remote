"use client";

import { useDeck } from "@/context/DeckContext";

export function ScrollProgressBar() {
  const { pages, index } = useDeck();
  const p = pages.length > 1 ? index / (pages.length - 1) : 0;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-1 bg-black/10"
      aria-hidden
    >
      <div
        className="h-full bg-sky-400 transition-[width] duration-150 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, p * 100))}%` }}
      />
    </div>
  );
}
