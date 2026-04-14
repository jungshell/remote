'use client';

import { useState, useRef, useEffect } from 'react';

type TemplateListProps = {
  title: string;
  items: string[];
  /** 이 섹션이 무슨 기능인지 한 줄 설명 */
  subtitle?: string;
  /** 어떻게 사용하는지 상세 도움말 */
  helpText?: string;
};

export default function TemplateList({
  title,
  items,
  subtitle,
  helpText,
}: TemplateListProps) {
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHelp) return;
    const close = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showHelp]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold dark:text-zinc-100">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {helpText && (
          <div className="relative shrink-0" ref={helpRef}>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              aria-label="사용 방법 안내"
            >
              <span className="text-sm">ⓘ</span>
            </button>
            {showHelp && (
              <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-2xl border border-zinc-200 bg-white p-3 text-left text-xs shadow-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <p className="whitespace-pre-wrap font-medium text-zinc-700 dark:text-zinc-200">
                  {helpText}
                </p>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="mt-2 text-zinc-500 underline dark:text-zinc-400"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        {items.map((item) => (
          <p key={item} className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-700/50 dark:text-zinc-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
