"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DiaryEntry = {
  id: string;
  title: string;
  summary: string;
  timeline: string[];
  goodThingsByMember: Record<string, string[]>;
  date: string;
  location: string;
  weather: string;
  combinedImageUrl?: string;
};

function formatDisplayDate(value: string) {
  const match = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return value;
  const [, year, monthRaw, dayRaw] = match;
  const month = monthRaw.padStart(2, "0");
  const day = dayRaw.padStart(2, "0");
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00`);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()] ?? "";
  return `${year}. ${month}. ${day}.(${weekday})`;
}

export default function SharePage() {
  const params = useParams();
  const id = params.id as string;
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/diary?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("일기를 찾을 수 없어요.");
        return res.json();
      })
      .then((data) => {
        setDiary(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-stone-600">로딩 중...</p>
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-rose-600">{error || "일기를 찾을 수 없어요."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-12">
      <main className="mx-auto w-full max-w-2xl px-6">
        <article className="rounded-3xl border border-amber-100 bg-white p-6 sm:p-8 shadow-warm">
          <div className="mb-4 flex items-center justify-between text-xs text-stone-600">
            <span className="inline-flex items-center gap-1">
              <span>📅</span>
              {formatDisplayDate(diary.date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <span>☁️</span>
              {diary.weather}
            </span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-stone-900">{diary.title}</h1>
          <div className="mb-4 text-sm text-stone-600">
            <span className="inline-flex items-center gap-1">
              <span>📍</span>
              {diary.location}
            </span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-stone-700">
            <span className="mr-1.5">✨</span>
            {diary.summary}
          </p>
          {diary.timeline?.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
                <span>📝</span>
                오늘 있었던 일
              </h2>
              <ul className="space-y-1.5 pl-4">
                {diary.timeline.map((item, index) => (
                  <li key={index} className="inline-flex items-start gap-1.5 text-sm text-stone-600">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diary.goodThingsByMember && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-stone-900 inline-flex items-center gap-1.5">
                <span>💝</span>
                좋았던 일 3가지
              </h2>
              <div className="space-y-3">
                {Object.entries(diary.goodThingsByMember).map(([name, items]) => (
                  <div key={name}>
                    <p className="mb-1 text-sm font-medium text-stone-700 inline-flex items-center gap-1.5">
                      <span>{name === "엄마" ? "👩" : name === "아빠" ? "👨" : name === "아이" ? "👶" : "👤"}</span>
                      {name}
                    </p>
                    {items.length > 0 ? (
                      <ul className="space-y-1 pl-4 text-sm text-stone-600">
                        {items.map((item, index) => (
                          <li key={index} className="inline-flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5">⭐</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-400 inline-flex items-center gap-1">
                        <span>😔</span>
                        내용 없음
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {diary.combinedImageUrl && (
            <div className="mt-6">
              <img
                src={diary.combinedImageUrl}
                alt="4컷 그림"
                className="w-full rounded-2xl"
              />
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
