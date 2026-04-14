"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DiaryEntry } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

type Props = {
  diaries: DiaryEntry[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCardClick: (diary: DiaryEntry) => void;
  onDeleteClick: (e: React.MouseEvent, diary: DiaryEntry) => void;
  deleteConfirmId: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  loading?: boolean;
  memberColors: Record<string, string>;
};

function parseWeather(weather: string | undefined): { label: string; temp: string } {
  if (!weather?.trim()) return { label: "", temp: "" };
  const match = weather.trim().match(/^(.+?)\s+(-?\d+\s*~\s*-?\d+°C)$/);
  if (match) return { label: match[1].trim(), temp: match[2] };
  return { label: weather.trim(), temp: "" };
}

function groupDiariesByMonth(diaries: DiaryEntry[]): { label: string; entries: DiaryEntry[] }[] {
  const groups: Record<string, DiaryEntry[]> = {};
  diaries.forEach((d) => {
    const key = d.date ? d.date.slice(0, 7) : "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return sortedKeys.map((key) => {
    const [y, m] = key.split("-");
    const label = `${y}년 ${Number(m)}월`;
    return { label, entries: groups[key] };
  });
}

export default function FeedView({
  diaries,
  searchQuery,
  onSearchChange,
  onCardClick,
  onDeleteClick,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
  loading,
  memberColors,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return diaries;
    const q = searchQuery.toLowerCase();
    return diaries.filter(
      (d) =>
        formatDisplayDate(d.date).toLowerCase().includes(q) ||
        (d.location ?? "").toLowerCase().includes(q) ||
        (d.keywords ?? []).some((k) => k.toLowerCase().includes(q)) ||
        (d.summary ?? "").toLowerCase().includes(q) ||
        (d.title ?? "").toLowerCase().includes(q),
    );
  }, [diaries, searchQuery]);

  const groups = useMemo(() => groupDiariesByMonth(filtered), [filtered]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={listRef} className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--background)] pb-3">
        <input
          type="text"
          placeholder="날짜, 키워드, 장소 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input min-h-[44px] flex-1 rounded-2xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="min-h-[44px] rounded-2xl px-3 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        )}
      </div>

      {loading && filtered.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-stone-100 bg-white p-4 animate-pulse">
              <div className="h-4 w-24 rounded bg-stone-200" />
              <div className="mt-3 h-4 w-full rounded bg-stone-100" />
              <div className="mt-2 h-4 w-3/4 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="py-12 text-center text-[var(--muted)]">아직 생성된 일기가 없어요.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ label, entries }) => (
            <section key={label}>
              <h2 className="mb-3 text-sm font-semibold text-amber-700 dark:text-amber-400">{label}</h2>
              <div className="space-y-3">
                {entries.map((diary) => (
                  <div key={diary.id} className="relative">
                    <button
                      type="button"
                      onClick={() => onCardClick(diary)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 pr-10 text-left shadow-warm transition hover:border-amber-200 dark:hover:border-amber-600 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)] pr-6">
                        <span className="shrink-0" suppressHydrationWarning>
                          {formatDisplayDate(diary.date)}
                        </span>
                        <span className="text-[var(--border)] shrink-0">|</span>
                        <span className="truncate min-w-0 flex-1 basis-0">
                          {diary.location || "—"}
                        </span>
                        <span className="text-[var(--border)] shrink-0">|</span>
                        {(() => {
                          const { label, temp } = parseWeather(diary.weather);
                          const weatherText = [label, temp].filter(Boolean).join("  ");
                          return weatherText ? (
                            <span className="shrink-0 font-medium text-stone-600 dark:text-stone-400">
                              {weatherText}
                            </span>
                          ) : (
                            <span>—</span>
                          );
                        })()}
                      </div>
                      {diary.photoUrls && diary.photoUrls.length > 0 && (
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                          {diary.photoUrls.slice(0, 4).map((url, idx) => (
                            <div
                              key={idx}
                              className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100"
                            >
                              <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--foreground)]">
                        {diary.summary || diary.title}
                      </p>
                      {(diary.keywords ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(diary.keywords ?? []).slice(0, 4).map((kw) => (
                            <span
                              key={kw}
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                    {deleteConfirmId === diary.id ? (
                      <div className="absolute -right-2 -top-2 z-[2] flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-1 shadow-lg">
                        <button
                          type="button"
                          className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-medium text-white"
                          onClick={() => onConfirmDelete(diary.id)}
                        >
                          삭제
                        </button>
                        <button
                          type="button"
                          className="rounded-lg tab-inactive px-2 py-1 text-xs font-medium"
                          onClick={onCancelDelete}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="삭제"
                        className="absolute -top-2.5 -right-2.5 z-[2] flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-md hover:bg-stone-200 dark:hover:bg-stone-600 text-sm leading-none"
                        onClick={(e) => onDeleteClick(e, diary)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg sm:bottom-20"
          aria-label="맨 위로"
        >
          ↑
        </button>
      )}
    </div>
  );
}
