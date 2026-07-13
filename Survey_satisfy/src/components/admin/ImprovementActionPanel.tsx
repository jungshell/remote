"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth/access";
import type { ImprovementSuggestion, ImprovementStatus } from "@/lib/improvement/suggest";
import type { ImprovementActionRow, SurveyRow } from "@/lib/supabase/database.types";

const STATUSES: ImprovementStatus[] = ["등록", "진행중", "완료", "보류"];

export function ImprovementActionPanel() {
  const [rows, setRows] = useState<ImprovementActionRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [divisionFilter, setDivisionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [draftSurveyId, setDraftSurveyId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftOwner, setDraftOwner] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [draftMemo, setDraftMemo] = useState("");

  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set([
          new Date().getFullYear(),
          ...surveys.map((survey) => survey.year ?? new Date().getFullYear()),
          ...rows.map((row) => row.year),
        ]),
      ).sort((a, b) => b - a),
    [surveys, rows],
  );

  const divisionOptions = useMemo(
    () => Array.from(new Set(surveys.map((survey) => survey.division))),
    [surveys],
  );

  async function loadAll() {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (yearFilter) params.set("year", yearFilter);
    if (divisionFilter) params.set("division", divisionFilter);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const [actionRes, surveyRes, suggestRes] = await Promise.all([
        authFetch(`/api/improvement-actions?${params.toString()}`),
        authFetch("/api/surveys"),
        authFetch(`/api/improvement-actions/suggest?year=${yearFilter || ""}`),
      ]);

      const actionData = (await actionRes.json()) as { ok: boolean; rows?: ImprovementActionRow[]; error?: string };
      const surveyData = (await surveyRes.json()) as { ok: boolean; rows?: SurveyRow[]; error?: string };
      const suggestData = (await suggestRes.json()) as {
        ok: boolean;
        suggestions?: ImprovementSuggestion[];
        error?: string;
      };

      if (actionData.ok && actionData.rows) {
        setRows(actionData.rows);
      } else {
        setStatus(actionData.error ?? "개선과제를 불러오지 못했습니다. migration_004 SQL을 실행했는지 확인해 주세요.");
      }

      if (surveyData.ok && surveyData.rows) {
        setSurveys(surveyData.rows);
        if (!draftSurveyId && surveyData.rows[0]) {
          setDraftSurveyId(surveyData.rows[0].id);
        }
      }

      if (suggestData.ok && suggestData.suggestions) {
        setSuggestions(suggestData.suggestions);
      }
    } catch {
      setStatus("데이터 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, divisionFilter, statusFilter]);

  async function handleCreate() {
    if (!draftSurveyId || !draftTitle.trim()) {
      setStatus("설문과 과제명을 입력해 주세요.");
      return;
    }

    setStatus("과제를 등록하는 중입니다.");
    const response = await authFetch("/api/improvement-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surveyId: draftSurveyId,
        title: draftTitle,
        ownerName: draftOwner,
        dueDate: draftDue || null,
        memo: draftMemo,
        source: "manual",
      }),
    });

    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "등록에 실패했습니다.");
      return;
    }

    setDraftTitle("");
    setDraftMemo("");
    setStatus("개선과제를 등록했습니다.");
    void loadAll();
  }

  async function handleStatusChange(id: string, nextStatus: ImprovementStatus) {
    const response = await authFetch(`/api/improvement-actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "상태 변경에 실패했습니다.");
      return;
    }
    void loadAll();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 개선과제를 삭제할까요?")) {
      return;
    }

    const response = await authFetch(`/api/improvement-actions/${id}`, { method: "DELETE" });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    setStatus("삭제했습니다.");
    void loadAll();
  }

  async function handleRegisterSuggestions() {
    if (suggestions.length === 0) {
      setStatus("등록할 초안이 없습니다.");
      return;
    }

    setStatus("초안을 개선과제로 등록하는 중입니다.");
    const response = await authFetch("/api/improvement-actions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions }),
    });
    const data = (await response.json()) as { ok: boolean; rows?: ImprovementActionRow[]; error?: string };

    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "초안 등록에 실패했습니다.");
      return;
    }

    setStatus(`${data.rows?.length ?? 0}건의 초안을 등록했습니다.`);
    void loadAll();
  }

  const counts = useMemo(() => {
    return {
      total: rows.length,
      open: rows.filter((row) => row.status === "등록" || row.status === "진행중").length,
      done: rows.filter((row) => row.status === "완료").length,
    };
  }, [rows]);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--hairline)] p-6">
        <p className="label-machined text-[var(--text-muted)]">Action Loop</p>
        <h2 className="mt-2 text-2xl font-black uppercase">개선과제 관리</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
          낮은 만족도 문항·주관식 의견을 바탕으로 초안을 만들고, 담당·기한·상태를 관리합니다.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Summary label="전체" value={`${counts.total}`} />
          <Summary label="진행·등록" value={`${counts.open}`} />
          <Summary label="완료" value={`${counts.done}`} />
          <Summary label="초안 대기" value={`${suggestions.length}`} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FilterSelect
            label="연도"
            value={yearFilter}
            onChange={setYearFilter}
            options={yearOptions.map((year) => ({ value: String(year), label: `${year}년` }))}
          />
          <FilterSelect
            label="본부"
            value={divisionFilter}
            onChange={setDivisionFilter}
            options={divisionOptions.map((division) => ({ value: division, label: division }))}
          />
          <FilterSelect
            label="상태"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUSES.map((item) => ({ value: item, label: item }))}
          />
        </div>
      </div>

      <div className="border-b border-[var(--hairline)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-machined text-[var(--text-muted)]">Auto Draft</p>
            <h3 className="mt-2 text-xl font-bold">응답 기반 초안</h3>
            <p className="mt-2 text-sm text-[var(--text-body)]">
              리커트 평균 3.5점 미만 문항, 주관식 의견이 있는 설문을 초안으로 제안합니다.
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading || suggestions.length === 0}
            onClick={() => void handleRegisterSuggestions()}
            className="focus-ring label-machined border border-white px-5 py-3 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
          >
            초안 일괄 등록 ({suggestions.length})
          </button>
        </div>

        {suggestions.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">현재 조건에서 새 초안이 없습니다.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {suggestions.slice(0, 8).map((item) => (
              <article key={`${item.surveyId}-${item.source}-${item.relatedQuestionId ?? item.title}`} className="border border-[var(--hairline)] p-4">
                <p className="font-bold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--text-body)]">
                  {item.division} · {item.surveyTitle} · {item.source === "low_score" ? "낮은 점수" : "주관식"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)]">{item.memo}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-[var(--hairline)] p-6">
        <p className="label-machined text-[var(--text-muted)]">Manual Create</p>
        <h3 className="mt-2 text-xl font-bold">직접 등록</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="설문">
            <select
              value={draftSurveyId}
              onChange={(event) => setDraftSurveyId(event.target.value)}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
            >
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.year} · {survey.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="담당자">
            <input
              value={draftOwner}
              onChange={(event) => setDraftOwner(event.target.value)}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
              placeholder="사업 담당자명"
            />
          </Field>
          <Field label="과제명">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
              placeholder="예: 사전 안내 문구 보완"
            />
          </Field>
          <Field label="기한">
            <input
              type="date"
              value={draftDue}
              onChange={(event) => setDraftDue(event.target.value)}
              className="focus-ring h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="메모">
              <textarea
                value={draftMemo}
                onChange={(event) => setDraftMemo(event.target.value)}
                rows={3}
                className="focus-ring w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 py-3 text-white"
              />
            </Field>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          className="focus-ring label-machined mt-4 border border-white px-5 py-3 transition-colors hover:bg-white hover:text-black"
        >
          과제 등록
        </button>
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">등록된 개선과제가 없습니다.</p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="grid gap-4 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="font-bold text-white">{row.title}</p>
                <p className="mt-2 text-sm text-[var(--text-body)]">
                  {row.year}년 · {row.division} · {sourceLabel(row.source)}
                  {row.owner_name ? ` · 담당 ${row.owner_name}` : ""}
                  {row.due_date ? ` · 기한 ${row.due_date}` : ""}
                </p>
                {row.related_question_label ? (
                  <p className="mt-2 text-sm text-[var(--text-muted)]">관련 문항: {row.related_question_label}</p>
                ) : null}
                {row.memo ? <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-body)]">{row.memo}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={row.status}
                  onChange={(event) => void handleStatusChange(row.id, event.target.value as ImprovementStatus)}
                  className="focus-ring h-11 border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
                >
                  {STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="focus-ring label-machined border border-[var(--hairline)] px-4 py-2 text-[var(--text-body)] hover:border-white hover:text-white"
                >
                  삭제
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {status ? <p className="border-t border-[var(--hairline)] p-6 text-sm text-[var(--text-body)]">{status}</p> : null}
    </section>
  );
}

function sourceLabel(source: string) {
  if (source === "low_score") return "낮은 점수";
  if (source === "opinion") return "주관식";
  return "직접 등록";
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--hairline)] p-4">
      <p className="label-machined text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="label-machined text-[var(--text-muted)]">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-3 text-white"
      >
        <option value="">전체</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-machined text-[var(--text-muted)]">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
