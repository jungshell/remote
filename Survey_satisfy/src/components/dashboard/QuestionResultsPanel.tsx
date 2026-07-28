"use client";

import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { captureSvgToClipboard } from "@/lib/export-image";
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

/** 문항별 응답 결과를 흰 배경 차트로 도식화 (캡처·복사 및 전체 PDF 지원) */
export function QuestionResultsPanel({ rows, questions }: QuestionResultsPanelProps) {
  const chartQuestions = useMemo(
    () => questions.filter((question) => question.scale === "likert5" || question.scale === "choice"),
    [questions],
  );

  if (rows.length === 0 || chartQuestions.length === 0) {
    return null;
  }

  return (
    <section className="panel p-4 sm:p-6 print-report">
      <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-machined text-[var(--text-muted)]">Per-Question · Export</p>
          <h3 className="mt-2 text-xl font-black uppercase sm:text-2xl">문항별 결과</h3>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            각 문항의 &quot;캡처&quot;를 누르면 그래프가 복사됩니다. 한글 등에 바로 붙여넣기(Ctrl+V)하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="focus-ring label-machined border border-white px-5 py-3 text-white transition-colors hover:bg-white hover:text-black"
        >
          전체 결과 PDF로 보기
        </button>
      </div>

      <p className="print-only mb-6 text-lg font-black text-black">문항별 결과 리포트</p>

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
  const [feedback, setFeedback] = useState("");

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

  async function handleCapture() {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) {
      return;
    }
    const safeLabel = question.label.replace(/[\\/:*?"<>|]/g, "").slice(0, 30).trim();
    const result = await captureSvgToClipboard(
      svg as SVGSVGElement,
      `${index + 1}. ${question.label}`,
      `문항${index + 1}_${safeLabel}`,
    );
    setFeedback(
      result === "copied"
        ? "복사됨! 한글에 붙여넣기(Ctrl+V)"
        : result === "downloaded"
          ? "복사 미지원 브라우저 — PNG로 저장했습니다."
          : "캡처에 실패했습니다.",
    );
    window.setTimeout(() => setFeedback(""), 4000);
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
          onClick={() => void handleCapture()}
          className="focus-ring no-print shrink-0 border border-gray-800 px-3 py-1.5 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-800 hover:text-white"
        >
          캡처
        </button>
      </div>
      {feedback ? <p className="no-print mt-1 text-xs font-bold text-[#23b26d]">{feedback}</p> : null}

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
