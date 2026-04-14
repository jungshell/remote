"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  TOAST_DURATION_DEFAULT_MS,
  TOAST_DURATION_ERROR_MS,
  TOAST_DURATION_LONG_MS,
} from "@/lib/constants";

type ToastMessage = string;
export type ToastType = "default" | "error" | "long";

function getDuration(type: ToastType, messageLength: number): number {
  if (type === "error") return TOAST_DURATION_ERROR_MS;
  if (type === "long") return TOAST_DURATION_LONG_MS;
  return messageLength > 30 ? TOAST_DURATION_LONG_MS : TOAST_DURATION_DEFAULT_MS;
}

interface ToastContextValue {
  toast: (message: ToastMessage, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);

  const show = useCallback((msg: ToastMessage, type: ToastType = "default") => {
    setMessage(msg);
    const duration = getDuration(type, msg.length);
    const t = setTimeout(() => setMessage(null), duration);
    return () => clearTimeout(t);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: show }}>
      {children}
      {message != null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium shadow-lg animate-toast-in"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: (_m: string, _t?: ToastType) => {} };
  return ctx;
}
