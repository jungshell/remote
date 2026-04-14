"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DeckPage = {
  id: string;
  label: string;
};

type DeckContextValue = {
  pages: DeckPage[];
  index: number;
  setIndex: (next: number) => void;
  goToId: (id: string) => void;
  next: () => void;
  prev: () => void;
};

const DeckContext = createContext<DeckContextValue | null>(null);

export function DeckProvider({
  pages,
  children,
}: {
  pages: DeckPage[];
  children: React.ReactNode;
}) {
  const [index, setIndexRaw] = useState(0);

  const setIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, next));
      setIndexRaw(clamped);
      const id = pages[clamped]?.id;
      if (id) {
        history.replaceState(null, "", `#${id}`);
      }
    },
    [pages]
  );

  const goToId = useCallback(
    (id: string) => {
      const idx = pages.findIndex((p) => p.id === id);
      if (idx >= 0) setIndex(idx);
    },
    [pages, setIndex]
  );

  const next = useCallback(() => setIndex(index + 1), [index, setIndex]);
  const prev = useCallback(() => setIndex(index - 1), [index, setIndex]);

  const value = useMemo(
    () => ({ pages, index, setIndex, goToId, next, prev }),
    [pages, index, setIndex, goToId, next, prev]
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck(): DeckContextValue {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("DeckContext is missing. Wrap with <DeckProvider/>.");
  return ctx;
}

