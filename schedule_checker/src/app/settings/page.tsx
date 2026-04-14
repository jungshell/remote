"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getReportSettings, setReportSettings } from "@/lib/user-settings";

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [dailyReport, setDailyReport] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState(false);

  const loadSettings = useCallback(() => {
    if (!user) return;
    setSettingsError(false);
    setLoadingSettings(true);
    getReportSettings(user.uid)
      .then((s) => {
        setDailyReport(s.dailyReportEnabled);
        setGoogleCalendarConnected(s.googleCalendarConnected ?? false);
        setLoadingSettings(false);
      })
      .catch(() => {
        setLoadingSettings(false);
        setSettingsError(true);
        toast("설정을 불러오지 못했어요.", "error");
      });
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    loadSettings();
  }, [user, router, loadSettings]);

  useEffect(() => {
    const calendar = searchParams.get("calendar");
    if (calendar === "connected") toast("Google 캘린더가 연동되었어요.");
    if (calendar === "error") toast("Google 캘린더 연동에 실패했어요.", "error");
  }, [searchParams, toast]);

  async function handleToggle(enabled: boolean) {
    if (!user || saving) return;
    setSaving(true);
    try {
      await setReportSettings(user.uid, {
        dailyReportEnabled: enabled,
        email: user.email ?? undefined,
      });
      setDailyReport(enabled);
      toast(enabled ? "매일 9시에 보고서를 받습니다." : "보고서 수신을 끄셨습니다.");
    } catch {
      toast("설정 저장에 실패했어요.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">설정 불러오는 중…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/tasks" className="text-slate-600 hover:text-slate-900 font-medium">← 업무</Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-800 mb-6">설정</h1>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700 mb-2">업무 보고서 이메일</h2>
          <p className="text-sm text-slate-500 mb-4">매일 오전 9시에 어제 완료·오늘 할 일·이번 주 마감을 정리한 보고서를 이메일로 받을 수 있습니다.</p>
          {loadingSettings ? (
            <p className="text-slate-400 text-sm">불러오는 중…</p>
          ) : settingsError ? (
            <div className="flex flex-col gap-2">
              <p className="text-slate-600 text-sm">설정을 불러오지 못했습니다.</p>
              <button type="button" onClick={loadSettings} className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50">
                다시 시도
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dailyReport}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={saving}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-slate-700">매일 9시 업무 보고서 받기</span>
            </label>
          )}
          {dailyReport && user.email && (
            <p className="mt-2 text-xs text-slate-400">수신 주소: {user.email}</p>
          )}
        </div>
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-700 mb-2">Google 캘린더 연동</h2>
          <p className="text-sm text-slate-500 mb-4">할 일을 Google 캘린더에 자동으로 추가할 수 있습니다. 연동 후 새로 추가하는 할 일이 캘린더에 반영됩니다.</p>
          {googleCalendarConnected ? (
            <p className="text-sm text-emerald-600 font-medium">연동됨</p>
          ) : (
            <a
              href={user ? `/api/auth/google-calendar?uid=${encodeURIComponent(user.uid)}` : "#"}
              className="inline-block min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              Google 캘린더 연동하기
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-500">설정 불러오는 중…</p>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
