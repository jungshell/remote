"use client";

import { useState, useEffect } from "react";
import type { DiaryEntry } from "@/lib/types";

// 어떤 섹션에서 열렸는지 구분 (필드별 수정용)
export type EditSection =
  | "date"
  | "summary"
  | "quote"
  | "locationWeather"
  | "mood"
  | "timeline"
  | "keywords"
  | "goodThings"
  | "all";

type PatchPayload = {
  title?: string;
  summary?: string;
  quote?: string;
  /** YYYY-MM-DD 형식 날짜 */
  date?: string;
  timeline?: string[];
  goodThingsByMember?: Record<string, string[]>;
  keywords?: string[];
  location?: string;
  weather?: string;
  moodScore?: number;
};

type Props = {
  diary: DiaryEntry;
  /** 어떤 필드를 수정 중인지 (null이면 전체 수정) */
  section?: EditSection;
  onSave: (id: string, payload: PatchPayload) => Promise<void>;
  onClose: () => void;
};

export default function EditDiaryModal({ diary, section = "all", onSave, onClose }: Props) {
  const [title, setTitle] = useState(diary.title ?? "");
  const [summary, setSummary] = useState(diary.summary ?? "");
  const [quote, setQuote] = useState(diary.quote ?? "");
  const [date, setDate] = useState(diary.date ?? "");
  const [location, setLocation] = useState(diary.location ?? "");
  const [weather, setWeather] = useState(diary.weather ?? "");
  const [moodScore, setMoodScore] = useState(diary.moodScore ?? 0);
  const [timelineText, setTimelineText] = useState((diary.timeline ?? []).join("\n"));
  const [keywordsText, setKeywordsText] = useState((diary.keywords ?? []).join(", "));
  const [goodThingsText, setGoodThingsText] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init: Record<string, string> = {};
    const memberNames =
      diary.goodThingsByMember && Object.keys(diary.goodThingsByMember).length > 0
        ? Object.keys(diary.goodThingsByMember)
        : ["엄마", "아빠", "아이"];
    memberNames.forEach((name) => {
      const items = diary.goodThingsByMember?.[name];
      init[name] = Array.isArray(items) ? items.join("\n") : "";
    });
    setGoodThingsText(init);
  }, [diary.goodThingsByMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const timeline = timelineText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const keywords = keywordsText
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const goodThingsByMember: Record<string, string[]> = {};
      Object.entries(goodThingsText).forEach(([name, text]) => {
        const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
        if (items.length > 0) goodThingsByMember[name] = items;
      });
      // 우선 전체 payload 구성
      let payload: PatchPayload = {
        title: title || undefined,
        summary: summary || undefined,
        quote: quote || undefined,
        date: date || undefined,
        location: location || undefined,
        weather: weather || undefined,
        moodScore: moodScore || undefined,
        timeline: timeline.length ? timeline : undefined,
        keywords: keywords.length ? keywords : undefined,
        goodThingsByMember: Object.keys(goodThingsByMember).length ? goodThingsByMember : undefined,
      };

      // 섹션별로 허용 필드만 남기기
      if (section && section !== "all") {
        const allowedBySection: Record<Exclude<EditSection, "all">, (keyof PatchPayload)[]> = {
          date: ["date"],
          summary: ["summary"],
          quote: ["quote"],
          locationWeather: ["location", "weather"],
          mood: ["moodScore"],
          timeline: ["timeline"],
          keywords: ["keywords"],
          goodThings: ["goodThingsByMember"],
        };
        const allowed = allowedBySection[section as Exclude<EditSection, "all">] ?? [];
        const filtered: PatchPayload = {};
        allowed.forEach((key) => {
          const value = payload[key];
          if (value !== undefined) {
            (filtered as any)[key] = value;
          }
        });
        payload = filtered;
      }

      // 비어 있으면 서버에 보내지 않음
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      await onSave(diary.id, payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const members =
    diary.goodThingsByMember && Object.keys(diary.goodThingsByMember).length > 0
      ? Object.keys(diary.goodThingsByMember)
      : ["엄마", "아빠", "아이"];

  /** 섹션별로 해당 필드만 보여줄지 여부 (section이 all이면 전부 표시) */
  const showAll = !section || section === "all";
  const show = (s: EditSection) => showAll || section === s;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex min-h-[56px] items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-xl font-medium text-stone-600 hover:bg-stone-100"
        >
          ← 취소
        </button>
        <span className="text-base font-semibold text-stone-800">
          {showAll ? "일기 수정" : section === "summary" ? "본문 수정" : section === "quote" ? "오늘의 한 문장 수정" : section === "date" ? "날짜 수정" : section === "locationWeather" ? "장소·날씨 수정" : section === "mood" ? "기분 수정" : section === "timeline" ? "오늘 있었던 일 수정" : section === "keywords" ? "키워드 수정" : section === "goodThings" ? "좋았던 일 수정" : "일기 수정"}
        </span>
        <div className="min-w-[44px]" />
      </header>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-4 py-6 pb-24">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {showAll && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              제목
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
            </label>
          )}
          {show("summary") && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              요약 (본문)
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
            </label>
          )}
          {show("date") && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              날짜
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
            </label>
          )}
          {show("quote") && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              오늘의 한 문장 (따옴표 없이)
              <input
                type="text"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
            </label>
          )}
          {show("locationWeather") && (
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                장소
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                날씨
                <input
                  type="text"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
                />
              </label>
            </div>
          )}
          {show("mood") && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              오늘의 기분 (1~5)
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMoodScore(n)}
                    className={`h-10 w-10 rounded-xl text-lg ${
                      moodScore >= n ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {moodScore >= n ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            </label>
          )}
          {show("timeline") && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              오늘 있었던 일 (한 줄에 하나씩)
              <textarea
                value={timelineText}
                onChange={(e) => setTimelineText(e.target.value)}
                rows={3}
                placeholder="첫 번째 일&#10;두 번째 일"
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
            </label>
          )}
          {show("keywords") && (
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              키워드 (쉼표로 구분)
              <input
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="키워드1, 키워드2"
                className="rounded-2xl border border-stone-200 px-4 py-3 text-sm"
              />
            </label>
          )}
          {show("goodThings") && members.length > 0 && (
            <div className="grid gap-3">
              <span className="text-sm font-medium text-stone-700">좋았던 일 (구성원별, 한 줄에 하나)</span>
              {members.map((name) => (
                <label key={name} className="grid gap-1 text-sm text-stone-600">
                  {name}
                  <textarea
                    value={goodThingsText[name] ?? ""}
                    onChange={(e) => setGoodThingsText((prev) => ({ ...prev, [name]: e.target.value }))}
                    rows={2}
                    className="rounded-2xl border border-stone-200 px-4 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] rounded-2xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white disabled:bg-amber-300"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
