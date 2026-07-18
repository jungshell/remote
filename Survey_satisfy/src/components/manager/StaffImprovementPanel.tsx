"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { authFetch } from "@/lib/auth/access";
import type { ImprovementActionRow } from "@/lib/supabase/database.types";
import type { SurveyRecord } from "@/types/platform";

interface StaffImprovementPanelProps {
  survey: SurveyRecord;
  ownerName?: string;
}

export function StaffImprovementPanel({ survey, ownerName }: StaffImprovementPanelProps) {
  const [rows, setRows] = useState<ImprovementActionRow[]>([]);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const response = await authFetch(`/api/improvement-actions?survey_id=${encodeURIComponent(survey.id)}`);
      const data = (await response.json()) as { ok: boolean; rows?: ImprovementActionRow[]; error?: string };
      if (data.ok && data.rows) {
        setRows(data.rows);
      } else {
        setStatus(data.error ?? "개선과제를 불러오지 못했습니다.");
      }
    } catch {
      setStatus("개선과제 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [survey.id]);

  async function handleCreate() {
    if (!title.trim()) {
      setStatus("과제명을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setStatus("등록 중...");
    try {
      const response = await authFetch("/api/improvement-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: survey.id,
          title: title.trim(),
          source: "manual",
          ownerName: ownerName ?? "",
          memo: memo.trim(),
          division: survey.division,
          year: survey.year,
          status: "등록",
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setTitle("");
      setMemo("");
      setStatus("개선과제를 등록했습니다.");
      await load();
    } catch {
      setStatus("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(id: string, next: string) {
    const response = await authFetch(`/api/improvement-actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "상태 변경 실패");
      return;
    }
    await load();
  }

  return (
    <section className="panel p-4 sm:p-6">
      <p className="label-machined text-[var(--text-muted)]">Improvements</p>
      <h2 className="mt-2 text-xl font-black uppercase sm:text-2xl">개선과제</h2>
      <p className="mt-2 text-sm text-[var(--text-body)]">이 설문에서 나온 개선 포인트를 바로 등록·추적하세요.</p>

      <div className="mt-6 grid gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="과제명 (예: 안내 문자 발송 시점 개선)"
          className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-sm text-white"
        />
        <textarea
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 (선택)"
          className="focus-ring min-h-24 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] p-4 text-sm text-white"
        />
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleCreate()}
          className="focus-ring label-machined min-h-12 border border-white px-4 hover:bg-white hover:text-black disabled:opacity-50"
        >
          {isSaving ? "등록 중" : "개선과제 등록"}
        </button>
      </div>

      {status ? <p className="mt-3 text-sm text-[var(--text-body)]">{status}</p> : null}
      {isLoading ? <p className="mt-4 text-sm text-[var(--text-muted)]">불러오는 중...</p> : null}

      <div className="mt-6 space-y-3">
        {rows.length === 0 && !isLoading ? (
          <p className="text-sm text-[var(--text-muted)]">등록된 개선과제가 없습니다.</p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="border border-[var(--hairline)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={row.status === "완료" ? "success" : row.status === "진행중" ? "info" : "warning"}>
                  {row.status}
                </Badge>
                <span className="text-xs text-[var(--text-muted)]">{row.source}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">{row.title}</h3>
              {row.memo ? <p className="mt-2 text-xs leading-5 text-[var(--text-body)]">{row.memo}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {["등록", "진행중", "완료", "보류"].map((next) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() => void handleStatus(row.id, next)}
                    className="focus-ring min-h-10 border border-[var(--hairline)] px-3 text-[11px] text-[var(--text-body)] hover:border-white hover:text-white"
                  >
                    {next}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
