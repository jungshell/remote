"use client";

import { HashScrollHandler } from "@/components/HashScrollHandler";
import { MinimalDeckNav } from "@/components/layout/MinimalDeckNav";
import { ScrollProgressBar } from "@/components/layout/ScrollProgressBar";
import { DeckProvider, type DeckPage } from "@/context/DeckContext";
import { navSections } from "@/content/site";

const deckPages: DeckPage[] = [{ id: "welcome", label: "환영" }, ...navSections];

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <DeckProvider pages={deckPages}>
      <HashScrollHandler />
      <ScrollProgressBar />
      <MinimalDeckNav />
      {children}
    </DeckProvider>
  );
}
