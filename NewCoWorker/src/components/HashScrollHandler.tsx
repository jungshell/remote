"use client";

import { useDeck } from "@/context/DeckContext";
import { useEffect } from "react";

/**
 * 최초 로드 시 `#faq-budget` 등 해시가 있으면 해당 섹션으로 스크롤합니다.
 */
export function HashScrollHandler() {
  const { goToId } = useDeck();

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const id = raw.split("?")[0] ?? raw;
    requestAnimationFrame(() => goToId(id));
  }, [goToId]);

  return null;
}
