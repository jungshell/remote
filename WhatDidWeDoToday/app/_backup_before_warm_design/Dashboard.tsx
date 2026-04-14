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
    memberDiaries.forEach((d) => {
      d.keywords?.forEach((kw) => {
        memberKeywords[kw] = (memberKeywords[kw] || 0) + 1;
      });
    });

    setMemberStats({
      totalCount: memberDiaries.length,
      avgMood,
      topKeywords: Object.entries(memberKeywords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([kw]) => kw),
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
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-center text-zinc-500">
          👤 구성원을 선택하면 개인화된 대시보드를 볼 수 있어요
        </p>
      </div>
    );
  }

  const color = memberColors[selectedMember] || "emerald";
  const colorClasses: Record<string, string> = {
    pink: "bg-pink-100 text-pink-700 border-pink-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
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
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
            <p className="text-xs font-semibold text-zinc-500 mb-1">총 일기 수</p>
            <p className="text-2xl font-bold text-emerald-600">{memberStats.totalCount}개</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
            <p className="text-xs font-semibold text-zinc-500 mb-1">평균 기분 점수</p>
            <p className="text-2xl font-bold text-amber-600">
              {memberStats.avgMood.toFixed(1)}점
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
            <p className="text-xs font-semibold text-zinc-500 mb-1">인기 키워드</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {memberStats.topKeywords.map((kw: string) => (
                <span
                  key={kw}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 요약 */}
      {summary && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 p-4">
          <p className="text-sm font-semibold text-emerald-900 mb-2">📝 요약</p>
          <p className="text-sm text-emerald-800 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* 최근 일기 */}
      {recentDiaries.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100">
          <p className="text-sm font-semibold text-zinc-700 mb-3">📅 최근 일기</p>
          <div className="space-y-2">
            {recentDiaries.map((diary) => (
              <div
                key={diary.id}
                className="rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-600">
                    {formatDisplayDate(diary.date)}
                  </span>
                  <span className="text-xs text-zinc-400">{diary.location}</span>
                </div>
                <p className="text-sm text-zinc-700 line-clamp-2">{diary.summary}</p>
                {diary.quote && (
                  <p className="text-xs text-zinc-500 mt-1 italic line-clamp-1">
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
