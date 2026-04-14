'use client';

import { useState } from 'react';
import { suggestCopy, type CopyTone } from '@/lib/copyReview';

const TONE_OPTIONS: { value: CopyTone; label: string }[] = [
  { value: 'concise', label: '간결하게' },
  { value: 'friendly', label: '친절하게' },
  { value: 'formal', label: '정중하게' },
];

export default function CopyReviewSection() {
  const [input, setInput] = useState('');
  const [tone, setTone] = useState<CopyTone>('friendly');
  const [suggested, setSuggested] = useState('');

  const handleSuggest = () => {
    setSuggested(suggestCopy(input, tone));
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
      <h2 className="text-lg font-semibold dark:text-zinc-100">✍️ 문구 점검</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        보고·안내 문구를 선택한 톤으로 바꿔 제안합니다.
      </p>
      <div className="mt-4 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="점검할 문구를 붙여넣으세요."
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
          rows={3}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">톤:</span>
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                tone === opt.value
                  ? 'bg-black text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSuggest}
            disabled={!input.trim()}
            className="ml-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:opacity-50"
          >
            제안받기
          </button>
        </div>
        {suggested && (
          <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">제안 문구</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{suggested}</p>
          </div>
        )}
      </div>
    </div>
  );
}
