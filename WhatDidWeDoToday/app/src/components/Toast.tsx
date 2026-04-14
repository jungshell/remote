"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type Props = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  autoHideMs?: number;
};

export default function Toast({ toasts, onDismiss, autoHideMs = 4000 }: Props) {
  useEffect(() => {
    if (toasts.length === 0 || autoHideMs <= 0) return;
    const id = toasts[toasts.length - 1].id;
    const t = setTimeout(() => onDismiss(id), autoHideMs);
    return () => clearTimeout(t);
  }, [toasts, onDismiss, autoHideMs]);

  return (
    <div className="fixed bottom-20 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${
            t.type === "success"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : t.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-stone-200 bg-white text-stone-800"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{t.message}</span>
            <button
              type="button"
              aria-label="닫기"
              className="shrink-0 rounded-full p-1 hover:bg-black/5"
              onClick={() => onDismiss(t.id)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
