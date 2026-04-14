"use client";

import { navSections } from "@/content/site";
import { useDeck } from "@/context/DeckContext";
import clsx from "clsx";

export function SectionNav() {
  const { pages, index, goToId } = useDeck();
  const active = pages[index]?.id ?? navSections[0]?.id ?? "welcome";

  return (
    <nav
      aria-label="Section navigation"
      className={clsx(
        "no-print fixed z-50 flex flex-col gap-1 rounded-l-lg border border-white/15 bg-[#003366]/92 p-2 shadow-lg backdrop-blur-sm transition-transform duration-200 ease-out",
        "right-0 top-1/2 -translate-y-1/2 md:translate-x-[calc(100%-2.75rem)] md:hover:translate-x-0 md:focus-within:translate-x-0",
        "max-md:top-auto max-md:bottom-4 max-md:right-4 max-md:flex-row max-md:rounded-lg max-md:translate-x-0 max-md:translate-y-0"
      )}
    >
      {navSections.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            data-print-hide
            onClick={() => goToId(s.id)}
            className={clsx(
              "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300",
              isActive
                ? "bg-white text-[#003366]"
                : "text-white/90 hover:bg-white/10"
            )}
            aria-current={isActive ? "true" : undefined}
          >
            <span
              className={clsx(
                "size-2 shrink-0 rounded-full border border-white/40",
                isActive ? "bg-sky-400 border-sky-200" : "bg-white/25"
              )}
              aria-hidden
            />
            <span className="max-md:sr-only">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
