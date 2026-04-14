"use client";

import { ui, videoClips } from "@/content/site";
import clsx from "clsx";
import { ChevronDown, ListVideo } from "lucide-react";
import { useMemo, useState } from "react";

function buildEmbedUrl(
  youtubeId: string,
  opts?: { startSeconds?: number; autoplay?: boolean; mute?: boolean }
) {
  const base = `https://www.youtube-nocookie.com/embed/${youtubeId}`;
  const params = new URLSearchParams();
  params.set("rel", "0");
  params.set("modestbranding", "1");
  params.set("playsinline", "1");
  if (opts?.startSeconds && opts.startSeconds > 0) params.set("start", String(opts.startSeconds));
  if (opts?.autoplay) params.set("autoplay", "1");
  if (opts?.mute) params.set("mute", "1");
  return `${base}?${params.toString()}`;
}

export function MediaPage() {
  const featured = videoClips.find((v) => v.id === "official-promo") ?? videoClips[0];
  const [activeId, setActiveId] = useState(featured?.id ?? "");
  const [clipsOpen, setClipsOpen] = useState(false);

  const active = useMemo(
    () => videoClips.find((v) => v.id === activeId) ?? featured,
    [activeId, featured]
  );

  const embedSrc =
    active &&
    buildEmbedUrl(active.youtubeId, {
      startSeconds: active.startSeconds,
      autoplay: true,
      mute: true,
    });

  return (
    <section
      id="media"
      className="flex h-[100svh] min-h-0 flex-col overflow-hidden bg-[#003366] text-[var(--color-text-on-dark)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/90 md:text-xs">
            홍보영상
          </p>
          <h2 className="truncate text-base font-semibold tracking-tight text-white md:text-lg">
            {active?.title ?? "영상"}
          </h2>
        </div>
        <button
          type="button"
          data-print-hide
          onClick={() => setClipsOpen((o) => !o)}
          className={clsx(
            "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300",
            clipsOpen
              ? "border-sky-300/50 bg-white/15 text-white"
              : "border-white/20 bg-white/10 text-white/90 hover:bg-white/15"
          )}
          aria-expanded={clipsOpen}
        >
          <ListVideo className="size-4" aria-hidden />
          클립 목록
          <ChevronDown
            className={clsx("size-4 transition-transform", clipsOpen && "rotate-180")}
            aria-hidden
          />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 pt-2 md:px-4 md:pb-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/15 bg-black shadow-lg">
          {embedSrc && active && (
            <iframe
              key={`${active.youtubeId}:${active.startSeconds ?? 0}:${active.id}`}
              className="h-full min-h-[42svh] w-full flex-1 border-0 md:min-h-0"
              src={embedSrc}
              title={active.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>

        <p className="mt-2 shrink-0 px-1 text-center text-[11px] leading-snug text-sky-100/80 md:text-xs">
          {ui.mediaAutoplayHint}
        </p>

        {clipsOpen && (
          <div
            className="mt-3 max-h-[38svh] shrink-0 overflow-y-auto rounded-xl border border-white/15 bg-[#00264d]/95 p-3 md:max-h-[32svh]"
            data-print-hide
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-200/90">
              재생할 클립
            </p>
            <div className="mt-3 space-y-2">
              {videoClips.map((v) => {
                const selected = v.id === activeId || (!activeId && v.id === featured?.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveId(v.id)}
                    className={clsx(
                      "w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300",
                      selected
                        ? "border-sky-300/50 bg-white text-[#003366]"
                        : "border-white/15 bg-[#003366]/50 text-white/90 hover:bg-white/10"
                    )}
                  >
                    <div className="font-semibold">{v.title}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {typeof v.startSeconds === "number" ? `${v.startSeconds}s부터` : "처음부터"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-white/15 bg-[#003366] p-3 text-xs text-white/80">
              채널 전체는{" "}
              <a
                className="font-semibold text-sky-200 underline underline-offset-2"
                href="https://www.youtube.com/@%EC%B6%A9%EB%82%A8%EC%BD%98%ED%85%90%EC%B8%A0%EC%A7%84%ED%9D%A5%EC%9B%90/videos"
                target="_blank"
                rel="noreferrer"
              >
                YouTube 채널
              </a>
              에서 확인할 수 있습니다.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
