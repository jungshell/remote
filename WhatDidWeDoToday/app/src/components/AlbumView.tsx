"use client";

import { useMemo, useState } from "react";
import type { DiaryEntry } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

type PhotoItem = {
  url: string;
  diaryId: string;
  date: string;
  diary?: DiaryEntry;
};

type Props = {
  diaries: DiaryEntry[];
  onOpenDiary: (diaryId: string) => void;
};

export default function AlbumView({ diaries, onOpenDiary }: Props) {
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);

  const photos = useMemo(() => {
    const list: PhotoItem[] = [];
    diaries.forEach((d) => {
      const urls = d.photoUrls ?? [];
      urls.forEach((url) => {
        list.push({
          url,
          diaryId: d.id,
          date: d.date ?? "",
          diary: d,
        });
      });
    });
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [diaries]);

  if (photos.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-warm border border-stone-100">
        <p className="text-stone-500">아직 앨범에 담긴 사진이 없어요.</p>
        <p className="mt-1 text-sm text-stone-400">일기에 사진을 올리면 여기에 모여요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-stone-600">
        📷 총 {photos.length}장 · 일기에서 추린 사진이에요
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {photos.map((item, idx) => (
          <button
            key={`${item.diaryId}-${idx}-${item.url.slice(0, 30)}`}
            type="button"
            onClick={() => setLightbox(item)}
            className="aspect-square overflow-hidden rounded-2xl bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <img
              src={item.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 min-h-[44px] min-w-[44px] rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ✕
          </button>
          <img
            src={lightbox.url}
            alt=""
            className="max-h-[70vh] max-w-full rounded-lg object-contain"
          />
          <div className="mt-4 flex flex-col items-center gap-2 text-white">
            {lightbox.date && (
              <span className="text-sm text-white/80" suppressHydrationWarning>
                {formatDisplayDate(lightbox.date)}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setLightbox(null);
                onOpenDiary(lightbox.diaryId);
              }}
              className="min-h-[44px] rounded-2xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              해당 일기 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
