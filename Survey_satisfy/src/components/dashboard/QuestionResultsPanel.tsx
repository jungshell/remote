"use client";

import { useMemo, useRef } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downloadSvgAsPng } from "@/lib/export-image";
import type { SurveyResponseRow } from "@/lib/supabase/database.types";
import type { Question, SurveyAnswer } from "@/types/platform";

interface QuestionResultsPanelProps {
  rows: SurveyResponseRow[];
  questions: Question[];
}

function parseAnswers(raw: unknown): SurveyAnswer[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is SurveyAnswer =>
      typeof item === "object" &&
      item !== null &&
      "questionId" in item &&
      "value" in item &&
      typeof (item as SurveyAnswer).questionId === "string",
  );
}

function likertColor(score: number) {
  if (score >= 4) return "#23b26d";
  if (score === 3) return "#f4b400";
  return "#ff5c5c";
}

/** 문항별 응답 결과를 흰 배경 차트로 도식화하고 각 차트를 PNG로 저장 (한글 문서 첨부용) */
export function QuestionResultsPanel({ rows, questions }: QuestionResultsPanelProps) {
  const chartQuestions = useMemo(
    () => questions.filter((question) => question.scale === "likert5" || question.scale === "choice"),
    [questions],
  );

  if (rows.length === 0 || chartQuestions.length === 0) {
    return null;
  }

  return (
    <section className="panel p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-machined text-[var(--text-muted)]">Per-Question · Export</p>
          <h3 className="mt-2 text-xl font-black uppercase sm:text-2xl">문항별 결과 (이미지 저장)</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">각 문항의 &quot;PNG 저장&quot;으로 흰 배경 그래프를 받아 한글 문서에 삽입하세요.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {chartQuestions.map((question, index) => (
          <QuestionCard key={question.id} index={index} question={question} rows={rows} />
        ))}
      </div>
    </section>
  );
}

function QuestionCard({ index, question, rows }: { index: number; question: Question; rows: SurveyResponseRow[] }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const { data, average, total } = useMemo(() => {
    const answers = rows.flatMap((row) => parseAnswers(row.answers)).filter((answer) => answer.questionId === question.id);

    if (question.scale === "likert5") {
      const distribution = [1, 2, 3, 4, 5].map((score) => ({
        name: `${score}점`,
        count: answers.filter((answer) => answer.value === score).length,
        color: likertColor(score),
      }));
      const scores = answers
        .map((answer) => answer.value)
        .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 5);
      const avg = scores.length > 0 ? Math.round((scores.reduce((sum, v) => sum + v, 0) / scores.length) * 100) / 100 : 0;
      return { data: distribution, average: avg, total: scores.length };
    }

    const options = question.options ?? [];
    const distribution = options.map((option) => ({
      name: option,
      count: answers.filter((answer) => answer.value === option).length,
      color: "#2f7dff",
    }));
    return { data: distribution, average: 0, total: answers.filter((answer) => typeof answer.value === "string").length };
  }, [question, rows]);

  function handleSave() {
    const svg = chartRef.current?.querySelector("svg");
    if (svg) {
      const safeLabel = question.label.replace(/[\\/:*?"<>|]/g, "").slice(0, 30).trim();
      downloadSvgAsPng(svg as SVGSVGElement, `문항${index + 1}_${safeLabel}`, `${index + 1}. ${question.label}`);
    }
  }

  return (
    <div className="border border-[var(--hairline)] bg-white p-4 text-black">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-6 text-black">
            {index + 1}. {question.label}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {question.scale === "likert5" ? `평균 ${average}점 · ` : ""}
            응답 {total}건
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="focus-ring shrink-0 border border-gray-800 px-3 py-1.5 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-800 hover:text-white"
        >
          PNG 저장
        </button>
      </div>

      <div ref={chartRef} className="mt-3 h-56 bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: question.scale === "choice" ? 40 : 8 }}>
            <CartesianGrid stroke="#e5e5e5" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#333333"
              tick={{ fontSize: 12, fill: "#333333" }}
              tickLine={false}
              interval={0}
              angle={question.scale === "choice" ? -20 : 0}
              textAnchor={question.scale === "choice" ? "end" : "middle"}
              height={question.scale === "choice" ? 50 : 20}
            />
            <YAxis stroke="#333333" tick={{ fontSize: 12, fill: "#333333" }} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ background: "#fff", border: "1px solid #ccc" }} />
            <Bar dataKey="count" radius={0} isAnimationActive={false}>
              <LabelList dataKey="count" position="top" fill="#111" fontSize={12} />
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
