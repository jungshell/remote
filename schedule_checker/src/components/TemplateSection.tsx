'use client';

import type { Template } from '@/types/models';

type TemplateSectionProps = {
  templates: Template[];
  onUseTemplate: (template: Template) => void;
};

export default function TemplateSection({ templates, onUseTemplate }: TemplateSectionProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
      <h2 className="text-lg font-semibold dark:text-zinc-100">🧩 반복 업무 템플릿</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        주/월 단위 반복 업무를 템플릿으로 한 번에 생성합니다.
      </p>
      <div className="mt-4 space-y-3">
        {templates.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            등록된 템플릿이 없습니다.
          </p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-700/50"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.description}</p>
                )}
                {t.checklist?.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    체크리스트 {t.checklist.length}개
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(t)}
                className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                이 템플릿으로 업무 생성
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
