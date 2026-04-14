/**
 * 가족 구성원별 개인화된 대시보드 컴포넌트
 */
"use client";

import { useEffect, useState } from "react";
import type { DiaryEntry, StatsData } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

type DashboardProps = {
  selectedMember: string | null;
  diaries: DiaryEntry[];
  stats: StatsData | null;
  memberColors: Record<string, string>;
};

export default function Dashboard({
  selectedMember,
  diaries,
  stats,
  memberColors,
}: DashboardProps) {
  const [memberStats, setMemberStats] = useState<any>(null);
  const [recentDiaries, setRecentDiaries] = useState<DiaryEntry[]>([]);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    if (!selectedMember || !diaries.length) {
      setMemberStats(null);
      setRecentDiaries([]);
      setSummary("");
      return;
    }

    // 해당 구성원의 일기만 필터링
    const memberDiaries = diaries.filter((d) =>
      d.members?.includes(selectedMember) ||
      d.goodThingsByMember?.[selectedMember]?.length > 0
    );

    // 최근 5개만
    setRecentDiaries(memberDiaries.slice(0, 5));

    // 통계 계산
    const memberMoodScores = memberDiaries
      .map((d) => d.moodScore)
      .filter(Boolean);
    const avgMood =
      memberMoodScores.length > 0
        ? memberMoodScores.reduce((a, b) => a + b, 0) / memberMoodScores.length
        : 0;

    const memberKeywords: Record<string, number> = {};
    const memberLocations: Record<string, number> = {};
    const datesSet = new Set<string>();
    
    memberDiaries.forEach((d) => {
      d.keywords?.forEach((kw) => {
        memberKeywords[kw] = (memberKeywords[kw] || 0) + 1;
      });
      if (d.location && d.location.trim() && !d.location.includes("사용 불가") && !d.location.includes("장소 없음")) {
        memberLocations[d.location] = (memberLocations[d.location] || 0) + 1;
      }
      if (d.date) datesSet.add(d.date);
    });

    const topLocations = Object.entries(memberLocations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([loc]) => loc);

    setMemberStats({
      totalCount: memberDiaries.length,
      totalDays: datesSet.size, // 실제 작성한 날짜 수 (중복 제거)
      avgMood,
      topKeywords: Object.entries(memberKeywords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([kw]) => kw),
      topLocations,
    });

    // 요약 생성
    if (memberDiaries.length > 0) {
      fetch(`/api/summary?member=${encodeURIComponent(selectedMember)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.summary) setSummary(data.summary);
        })
        .catch(() => {});
    }
  }, [selectedMember, diaries]);

  if (!selectedMember) {
    return (
      <div className="rounded-3xl bg-amber-50/50 border border-amber-100 p-8 text-center">
        <p className="text-stone-600">
          👤 구성원을 선택하면 개인화된 대시보드를 볼 수 있어요
        </p>
      </div>
    );
  }

  const color = memberColors[selectedMember] || "amber";
  const colorClasses: Record<string, string> = {
    pink: "bg-pink-50 text-pink-800 border-pink-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    yellow: "bg-amber-50 text-amber-800 border-amber-200",
    emerald: "bg-amber-50 text-amber-800 border-amber-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className={`rounded-3xl border-2 p-6 ${colorClasses[color]}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {selectedMember === "엄마" ? "👩" : selectedMember === "아빠" ? "👨" : selectedMember === "아이" ? "👶" : "👤"}
          </span>
          <div>
            <h2 className="text-2xl font-bold">{selectedMember}님의 대시보드</h2>
            <p className="text-sm opacity-80">개인화된 일기 통계와 요약</p>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      {memberStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-warm border border-amber-100">
            <p className="text-xs font-semibold text-stone-500 mb-1">총 일기 수</p>
            <p className="text-2xl font-bold text-amber-700">{memberStats.totalCount}개</p>
            {memberStats.totalDays !== undefined && (
              <p className="text-xs text-stone-400 mt-1">{memberStats.totalDays}일 기록</p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-warm border border-amber-100">
            <p className="text-xs font-semibold text-stone-500 mb-1">평균 기분 점수</p>
            <p className="text-2xl font-bold text-amber-600">
              {memberStats.avgMood.toFixed(1)}점
            </p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={s <= Math.round(memberStats.avgMood) ? "text-amber-400 text-xs" : "text-stone-200 text-xs"}
                >
                  {s <= Math.round(memberStats.avgMood) ? "⭐" : "☆"}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-warm border border-amber-100">
            <p className="text-xs font-semibold text-stone-500 mb-1">인기 키워드</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {memberStats.topKeywords && memberStats.topKeywords.length > 0 ? (
                memberStats.topKeywords.map((kw: string) => (
                  <span
                    key={kw}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-xs font-medium text-amber-800"
                  >
                    #{kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-400">없음</span>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-warm border border-amber-100">
            <p className="text-xs font-semibold text-stone-500 mb-1">자주 간 장소</p>
            <div className="flex flex-col gap-1 mt-1">
              {memberStats.topLocations && memberStats.topLocations.length > 0 ? (
                memberStats.topLocations.map((loc: string) => (
                  <span
                    key={loc}
                    className="inline-flex items-center text-xs font-medium text-stone-700"
                  >
                    📍 {loc}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-400">없음</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 요약 */}
      {summary && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5">
          <p className="text-sm font-semibold text-amber-900 mb-2">📝 요약</p>
          <p className="text-sm text-stone-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* 최근 일기 */}
      {recentDiaries.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-warm border border-stone-100">
          <p className="text-sm font-semibold text-stone-700 mb-3">📅 최근 일기</p>
          <div className="space-y-2">
            {recentDiaries.map((diary) => (
              <div
                key={diary.id}
                className="rounded-2xl border border-amber-100 bg-amber-50/30 p-3 hover:bg-amber-50/50 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-700">
                    {formatDisplayDate(diary.date)}
                  </span>
                  <span className="text-xs text-stone-500">{diary.location}</span>
                </div>
                <p className="text-sm text-stone-700 line-clamp-2">{diary.summary}</p>
                {diary.quote && (
                  <p className="text-xs text-stone-500 mt-1 italic line-clamp-1">
                    "{diary.quote}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
