"use client";

import { useMemo, useState } from "react";
import { LIKERT_LABELS } from "@/constants/likert";
import { createProjectRound, submitSurveyResponse } from "@/lib/google/apps-script-client";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getStoredEditToken,
  submitSurveyResponseToSupabase,
} from "@/lib/supabase/responses";
import { surveyRecordToProject } from "@/lib/surveys/utils";
import type { Question, SurveyAnswer, SurveyRecord } from "@/types/platform";

interface SurveyFormProps {
  survey: SurveyRecord;
}

type Step = "intro" | "verify" | "questions" | "complete";

export function SurveyForm({ survey }: SurveyFormProps) {
  const [step, setStep] = useState<Step>("intro");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isExisting, setIsExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const project = useMemo(() => surveyRecordToProject(survey), [survey]);
  const questions = survey.questions;

  const progress = useMemo(() => {
    const answered = questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== "").length;
    return questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
  }, [answers, questions]);

  async function handleVerify() {
    if (!/^\d{4}$/.test(phoneLast4)) {
      setMessage("휴대폰 번호 뒤 4자리를 숫자로 입력해 주세요.");
      return;
    }

    setIsVerifying(true);
    setMessage("");

    const saved = window.localStorage.getItem(getStorageKey(survey.id, phoneLast4));
    const editToken = getStoredEditToken(survey.id, phoneLast4);
    let loaded = false;
    let notice = "";

    if (saved && editToken) {
      setAnswers(JSON.parse(saved) as Record<string, string | number>);
      loaded = true;
      notice = "이 기기에 저장된 기존 응답을 불러왔습니다. 수정 후 다시 제출할 수 있습니다.";
    } else if (isSupabaseConfigured()) {
      try {
        const params = new URLSearchParams({
          survey_id: survey.id,
          phone_last4: phoneLast4,
        });
        if (editToken) {
          params.set("edit_token", editToken);
        }
        const response = await fetch(`/api/survey-responses/lookup?${params.toString()}`);
        const data = (await response.json()) as {
          ok: boolean;
          exists?: boolean;
          canEdit?: boolean;
          answers?: SurveyAnswer[];
          message?: string;
        };

        if (data.ok && data.exists && data.canEdit && Array.isArray(data.answers)) {
          const restored = Object.fromEntries(data.answers.map((answer) => [answer.questionId, answer.value]));
          setAnswers(restored);
          loaded = true;
          notice = "기존 응답을 불러왔습니다. 수정 후 다시 제출할 수 있습니다.";
        } else if (data.ok && data.exists && !data.canEdit) {
          notice = data.message ?? "이미 응답한 번호입니다. 처음 응답한 기기에서만 수정할 수 있습니다.";
        }
      } catch {
        // local only fallback
      }
    }

    setIsExisting(loaded);
    setMessage(notice);
    setStep("questions");
    setIsVerifying(false);
  }

  async function handleSubmit() {
    const missing = questions.find((question) => question.required && (answers[question.id] === undefined || answers[question.id] === ""));

    if (missing) {
      setMessage(`필수 문항에 응답해 주세요: ${missing.label}`);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const normalizedAnswers: SurveyAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    const response = {
      surveyId: survey.id,
      phoneLast4,
      submittedAt: new Date().toISOString(),
      answers: normalizedAnswers,
    };

    window.localStorage.setItem(getStorageKey(survey.id, phoneLast4), JSON.stringify(answers));

    try {
      if (isSupabaseConfigured()) {
        await submitSurveyResponseToSupabase({
          surveyId: survey.id,
          phoneLast4,
          answers: normalizedAnswers,
        });
      } else if (process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL) {
        await createProjectRound(project, survey.id, questions);
        await submitSurveyResponse(response, project, questions);
      }

      setStep("complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "응답 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl pb-[max(6rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 mb-5 bg-black/95 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="label-machined text-[var(--accent)]">CCON</p>
          <p className="truncate text-xs text-[var(--text-muted)]">충남콘텐츠진흥원</p>
        </div>
        <div
          className="h-1.5 overflow-hidden bg-[var(--surface-card)]"
          role="progressbar"
          aria-label="설문 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={step === "questions" ? progress : step === "complete" ? 100 : 8}
        >
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${step === "questions" ? progress : step === "complete" ? 100 : 8}%` }}
          />
        </div>
        {step === "questions" ? (
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">응답 진행 {progress}%</p>
        ) : null}
      </div>

      <div className="panel animate-fade-scale overflow-hidden">
        <div className="border-b border-[var(--hairline)] p-5 sm:p-6">
          <p className="label-machined text-[var(--accent)]">충남콘텐츠진흥원 · 만족도 조사</p>
          <p className="label-machined mt-3 text-[var(--text-muted)]">
            {survey.year} · {survey.division} · {survey.round}회차
          </p>
          <h1 className="mt-3 text-2xl font-black uppercase leading-tight sm:mt-4 sm:text-3xl">{survey.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
            {survey.business} / {survey.subBusiness}
          </p>
        </div>

        {step === "intro" ? (
          <div className="p-5 sm:p-6">
            <h2 className="text-xl font-bold">개인정보·익명성 안내</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-body)]">
              <p>본 조사는 사업 만족도 분석과 차년도 사업 개선 목적으로만 활용됩니다.</p>
              <p>휴대폰 뒤 4자리는 중복응답 방지와 응답 수정 확인용으로만 사용되며, 전체 전화번호는 수집하지 않습니다.</p>
              <p>주관식 의견은 통계 및 개선과제 도출 목적으로 검토되며, 보고 시 개인을 특정하지 않도록 처리합니다.</p>
            </div>
            <button
              type="button"
              className="focus-ring label-machined mt-8 min-h-12 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black"
              onClick={() => setStep("verify")}
            >
              동의하고 시작
            </button>
          </div>
        ) : null}

        {step === "verify" ? (
          <div className="p-5 sm:p-6">
            <h2 className="text-xl font-bold">응답 확인</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
              휴대폰 번호 뒤 4자리를 입력해 주세요. 같은 설문에서 기존 응답이 있으면 수정할 수 있습니다.
            </p>
            <input
              inputMode="numeric"
              maxLength={4}
              autoComplete="one-time-code"
              value={phoneLast4}
              onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, "").slice(0, 4))}
              className="focus-ring mt-6 h-16 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-center text-3xl font-black tracking-[0.35em] text-white"
              placeholder="0000"
            />
            {message ? <p className="mt-4 text-sm text-[var(--warning)]">{message}</p> : null}
            <button
              type="button"
              disabled={isVerifying}
              className="focus-ring label-machined mt-8 min-h-12 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:opacity-50"
              onClick={() => void handleVerify()}
            >
              {isVerifying ? "확인 중" : "응답하기"}
            </button>
          </div>
        ) : null}

        {step === "questions" ? (
          <div className="p-5 pb-28 sm:p-6 sm:pb-6">
            {isExisting ? (
              <div className="mb-6 border border-[var(--warning)] p-4 text-sm leading-6 text-[var(--warning)]">
                기존 응답을 수정 중입니다. 제출하면 이전 응답이 새 응답으로 갱신됩니다.
              </div>
            ) : null}

            <div className="space-y-8">
              {questions.map((question, index) => (
                <QuestionField
                  key={question.id}
                  index={index}
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                />
              ))}
            </div>

            {message ? <p className="mt-6 text-sm text-[var(--warning)]">{message}</p> : null}
            <button
              type="button"
              disabled={isSubmitting}
              className="focus-ring label-machined mt-8 hidden min-h-12 w-full border border-white px-6 py-4 transition-colors hover:bg-white hover:text-black disabled:cursor-wait disabled:opacity-50 sm:block"
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? "저장 중" : isExisting ? "수정 제출" : "제출"}
            </button>
          </div>
        ) : null}

        {step === "complete" ? (
          <div className="p-5 sm:p-6">
            <p className="label-machined text-[var(--success)]">Complete</p>
            <h2 className="mt-4 text-3xl font-black uppercase">응답이 저장되었습니다</h2>
            <p className="mt-4 leading-7 text-[var(--text-body)]">
              참여해 주셔서 감사합니다. 입력하신 뒤 4자리로 조사 기간 내 다시 접속하면 응답을 수정할 수 있습니다.
            </p>
          </div>
        ) : null}
      </div>

      {step === "questions" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--hairline)] bg-black/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <button
            type="button"
            disabled={isSubmitting}
            className="focus-ring label-machined min-h-12 w-full border border-white bg-white px-6 py-4 text-black disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "저장 중" : isExisting ? "수정 제출" : "제출"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function QuestionField({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: Question;
  value?: string | number;
  onChange: (value: string | number) => void;
}) {
  return (
    <fieldset className="border-b border-[var(--hairline)] pb-8 last:border-b-0">
      <legend className="text-lg font-bold leading-7">
        <span className="mr-3 text-[var(--text-muted)]">{String(index + 1).padStart(2, "0")}</span>
        {question.label}
      </legend>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {question.category ?? question.group} {question.required ? "· 필수" : "· 선택"}
      </p>

      {question.scale === "likert5" ? (
        <div className="mt-5 grid gap-2">
          {LIKERT_LABELS.map((item) => (
            <button
              key={item.score}
              type="button"
              aria-pressed={value === item.score}
              className={`focus-ring grid min-h-14 grid-cols-[48px_1fr] items-center border px-4 py-3.5 text-left transition-colors ${
                value === item.score
                  ? "border-white bg-white text-black"
                  : "border-[var(--hairline)] bg-[var(--surface-soft)] text-white hover:border-white"
              }`}
              onClick={() => onChange(item.score)}
            >
              <span className="text-lg font-black">{item.short}</span>
              <span className="text-sm leading-5">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {question.scale === "nps" ? (
        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, score) => (
            <button
              key={score}
              type="button"
              aria-pressed={value === score}
              className={`focus-ring min-h-12 border text-sm font-black transition-colors ${
                value === score
                  ? "border-white bg-white text-black"
                  : "border-[var(--hairline)] bg-[var(--surface-soft)] text-white hover:border-white"
              }`}
              onClick={() => onChange(score)}
            >
              {score}
            </button>
          ))}
        </div>
      ) : null}

      {question.scale === "choice" && question.options ? (
        <div className="mt-5 grid gap-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              className={`focus-ring min-h-12 border px-4 py-3.5 text-left text-sm transition-colors ${
                value === option
                  ? "border-white bg-white text-black"
                  : "border-[var(--hairline)] bg-[var(--surface-soft)] text-white hover:border-white"
              }`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      {question.scale === "text" ? (
        <textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring mt-5 min-h-36 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] p-4 text-base leading-7 text-white"
          placeholder="의견을 입력해 주세요."
        />
      ) : null}
    </fieldset>
  );
}

function getStorageKey(surveyId: string, phoneLast4: string) {
  return `survey-response:${surveyId}:${phoneLast4}`;
}
