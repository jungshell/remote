"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function WriteModal({ open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex min-h-[56px] items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-xl font-medium text-stone-600 hover:bg-stone-100"
        >
          ← 닫기
        </button>
        <span className="text-base font-semibold text-stone-800">오늘 기록하기</span>
        <div className="min-w-[44px]" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
