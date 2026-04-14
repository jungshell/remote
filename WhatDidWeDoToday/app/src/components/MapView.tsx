"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapPlace, MapPlaceDiary } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

type MapViewProps = {
  onOpenDiary: (id: string) => void;
};

const NOMINATIM_DELAY_MS = 1100;
const KOREA_CENTER: [number, number] = [36.35, 127.77];
const DEFAULT_ZOOM = 7;

async function geocode(query: string): Promise<[number, number] | null> {
  const q = query.trim();
  if (!q || q === "장소 없음") return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + " 대한민국")}&limit=1`,
      { headers: { "Accept-Language": "ko" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const lat = parseFloat(data[0]?.lat);
    const lon = parseFloat(data[0]?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
  } catch {
    // ignore
  }
  return null;
}

function buildPopupHtml(location: string, diaries: MapPlaceDiary[], mounted: boolean): string {
  const items = diaries.slice(0, 10).map(
    (d) =>
      `<button type="button" class="map-popup-item" data-diary-id="${d.id}">
        <span class="map-popup-date">${mounted ? formatDisplayDate(d.date) : d.date}</span>
        <span class="map-popup-title">${escapeHtml(d.title)}</span>
      </button>`,
  );
  const more = diaries.length > 10 ? `<p class="map-popup-more">외 ${diaries.length - 10}편</p>` : "";
  return `
    <div class="map-popup" style="min-width:200px;max-width:280px;padding:4px;">
      <p class="map-popup-loc">📍 ${escapeHtml(location)}</p>
      <p class="map-popup-count">일기 ${diaries.length}편</p>
      <ul class="map-popup-list">${items.map((html) => `<li>${html}</li>`).join("")}</ul>
      ${more}
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function MapView({ onOpenDiary }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof import("leaflet").map> | null>(null);
  const markersRef = useRef<ReturnType<typeof import("leaflet").marker>[]>([]);
  const onOpenDiaryRef = useRef(onOpenDiary);
  onOpenDiaryRef.current = onOpenDiary;

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocodeProgress, setGeocodeProgress] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setupMap = useCallback(() => {
    if (typeof window === "undefined" || !containerRef.current) return null;
    const L = require("leaflet");
    if (mapRef.current) return mapRef.current;
    const map = L.map(containerRef.current).setView(KOREA_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    return map;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cache = new Map<string, [number, number] | null>();

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/map");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list: MapPlace[] = data.places ?? [];
        setPlaces(list);

        const map = setupMap();
        if (!map || cancelled) return;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const withLocation = list.filter((p) => p.location && p.location !== "장소 없음");
        for (let i = 0; i < withLocation.length && !cancelled; i++) {
          const place = withLocation[i];
          setGeocodeProgress(`${place.location} (${i + 1}/${withLocation.length})`);
          let coords = cache.get(place.location);
          if (coords === undefined) {
            coords = await geocode(place.location);
            cache.set(place.location, coords);
            await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
          }
          if (coords && !cancelled) {
            const L = require("leaflet");
            const popupEl = document.createElement("div");
            popupEl.innerHTML = buildPopupHtml(place.location, place.diaries, mounted);
            popupEl.addEventListener("click", (e) => {
              const btn = (e.target as HTMLElement).closest(".map-popup-item");
              const id = btn?.getAttribute("data-diary-id");
              if (id) onOpenDiaryRef.current(id);
            });
            const marker = L.marker(coords).addTo(map);
            marker.bindPopup(popupEl, { maxWidth: 320 });
            markersRef.current.push(marker);
          }
        }
        setGeocodeProgress("");
      } catch {
        if (!cancelled) setGeocodeProgress("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setupMap, mounted]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-3xl bg-white overflow-hidden shadow-warm border border-stone-100">
      <div className="p-4 border-b border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900">📍 방문 장소 지도</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          일기에서 기록한 장소를 지도에 표시해요. 마커를 누르면 해당 장소의 일기를 볼 수 있어요.
        </p>
        {loading && (
          <p className="text-xs text-amber-700 mt-2">
            {geocodeProgress ? `위치 조회 중: ${geocodeProgress}` : "장소 목록 불러오는 중…"}
          </p>
        )}
      </div>
      <div ref={containerRef} className="h-[400px] w-full" />
      {!loading && places.length === 0 && (
        <div className="p-6 text-center text-stone-500 text-sm">
          기록된 장소가 없어요. 일기에 장소를 적으면 여기에 표시돼요.
        </div>
      )}
      {!loading && places.some((p) => p.location === "장소 없음") && (
        <div className="px-4 pb-4">
          <p className="text-xs text-stone-500">
            「장소 없음」으로 기록된 일기는 지도에 표시되지 않아요.
          </p>
        </div>
      )}
    </div>
  );
}
