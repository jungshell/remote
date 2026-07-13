"use client";

import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { Question } from "@/types/platform";

interface QuestionPickerProps {
  title: string;
  hint: string;
  groups: Array<{ category: string; items: Question[] }>;
  selectedIds: string[];
  openCategories: Record<string, boolean>;
  onToggleOpen: (category: string) => void;
  onSetSelectedIds: (updater: (prev: string[]) => string[]) => void;
  onToggleCategory: (ids: string[], selectAll: boolean) => void;
}

function questionKindLabel(question: Question) {
  if (question.group === "지침") {
    return { text: "교육 표준문항", tone: "info" as const, desc: "교육 지침에 맞춘 강의 품질 문항" };
  }
  if (question.tier === "core") {
    return { text: "추천 포함", tone: "success" as const, desc: "기본으로 넣는 핵심 문항" };
  }
  return { text: "추가 선택", tone: "default" as const, desc: "필요할 때만 넣는 문항" };
}

export function QuestionPicker({
  title,
  hint,
  groups,
  selectedIds,
  openCategories,
  onToggleOpen,
  onSetSelectedIds,
  onToggleCategory,
}: QuestionPickerProps) {
  const lastClickedId = useRef<string | null>(null);
  const dragState = useRef<{
    active: boolean;
    selectMode: boolean;
    touched: Set<string>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const applyIds = useCallback(
    (ids: string[], shouldSelect: boolean) => {
      onSetSelectedIds((prev) => {
        if (shouldSelect) {
          return Array.from(new Set([...prev, ...ids]));
        }
        const remove = new Set(ids);
        return prev.filter((id) => !remove.has(id));
      });
    },
    [onSetSelectedIds],
  );

  function handleItemPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    questionId: string,
    orderedIds: string[],
  ) {
    if (event.button !== 0) {
      return;
    }

    const currentlySelected = selectedIds.includes(questionId);

    if (event.shiftKey && lastClickedId.current) {
      const start = orderedIds.indexOf(lastClickedId.current);
      const end = orderedIds.indexOf(questionId);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        const range = orderedIds.slice(from, to + 1);
        applyIds(range, true);
        lastClickedId.current = questionId;
        return;
      }
    }

    const nextSelectMode = !currentlySelected;
    applyIds([questionId], nextSelectMode);
    lastClickedId.current = questionId;

    dragState.current = {
      active: true,
      selectMode: nextSelectMode,
      touched: new Set([questionId]),
    };
    setIsDragging(true);

    const onMove = (moveEvent: PointerEvent) => {
      if (!dragState.current?.active) {
        return;
      }
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const card = el?.closest("[data-question-id]") as HTMLElement | null;
      const id = card?.dataset.questionId;
      if (!id || !orderedIds.includes(id) || dragState.current.touched.has(id)) {
        return;
      }
      dragState.current.touched.add(id);
      applyIds([id], dragState.current.selectMode);
    };

    const onUp = () => {
      dragState.current = null;
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="border border-[var(--hairline)]">
      <div className="border-b border-[var(--hairline)] p-4">
        <p className="label-machined text-[var(--text-muted)]">{title}</p>
        <p className="mt-2 text-sm text-[var(--text-body)]">{hint}</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          네모 박스를 클릭해 선택/해제 · Shift+클릭으로 구간 선택 · 드래그로 여러 개 선택
          {isDragging ? " · 드래그 중" : ""}
        </p>
      </div>
      <div className="divide-y divide-[var(--hairline)]">
        {groups.map((group) => {
          const ids = group.items.map((item) => item.id);
          const selectedCount = ids.filter((id) => selectedIds.includes(id)).length;
          const allSelected = selectedCount === ids.length && ids.length > 0;
          const isOpen = openCategories[group.category] ?? true;

          return (
            <div key={group.category}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button type="button" onClick={() => onToggleOpen(group.category)} className="text-left">
                  <p className="font-bold text-white">{group.category}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {selectedCount}/{ids.length} 선택 · {isOpen ? "접기" : "펼치기"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCategory(ids, !allSelected)}
                  className="focus-ring label-machined border border-[var(--hairline)] px-3 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
                >
                  {allSelected ? "이 묶음 해제" : "이 묶음 전체"}
                </button>
              </div>
              {isOpen ? (
                <div className="grid gap-2 px-4 pb-4 select-none">
                  {group.items.map((question) => {
                    const selected = selectedIds.includes(question.id);
                    const kind = questionKindLabel(question);
                    return (
                      <button
                        key={question.id}
                        type="button"
                        data-question-id={question.id}
                        onPointerDown={(event) => handleItemPointerDown(event, question.id, ids)}
                        className={`focus-ring grid grid-cols-[28px_1fr] gap-3 border p-4 text-left transition-colors ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--text-body)] hover:border-white"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 place-items-center border text-xs font-black ${
                            selected ? "border-black bg-black text-white" : "border-[var(--hairline)]"
                          }`}
                          aria-hidden
                        >
                          {selected ? "✓" : ""}
                        </span>
                        <span>
                          <span className={`block text-sm leading-6 ${selected ? "text-black" : "text-white"}`}>
                            {question.label}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone={kind.tone}>{kind.text}</Badge>
                            <span className={`text-xs ${selected ? "text-black/70" : "text-[var(--text-muted)]"}`}>
                              {kind.desc}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
