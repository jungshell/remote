import type { SurveyAnswer } from "@/types/platform";
import { isLikertScore } from "@/lib/kpi";
import { parseQuestions } from "@/lib/surveys/utils";
import type { SurveyResponseRow, SurveyRow } from "@/lib/supabase/database.types";

export type ImprovementSource = "manual" | "low_score" | "opinion";
export type ImprovementStatus = "등록" | "진행중" | "완료" | "보류";

export interface ImprovementSuggestion {
  surveyId: string;
  surveyTitle: string;
  division: string;
  year: number;
  title: string;
  source: Exclude<ImprovementSource, "manual">;
  relatedQuestionId?: string;
  relatedQuestionLabel?: string;
  memo: string;
}

const LOW_SCORE_THRESHOLD = 3.5;
const MIN_RESPONSES_FOR_SCORE = 3;

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

/** 낮은 점수 문항·주관식 의견 기반 개선과제 초안 */
export function buildImprovementSuggestions(
  surveys: SurveyRow[],
  responses: SurveyResponseRow[],
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  for (const survey of surveys) {
    const surveyResponses = responses.filter((row) => row.survey_id === survey.id);
    if (surveyResponses.length === 0) {
      continue;
    }

    const questions = parseQuestions(survey.custom_questions);
    const year = survey.year ?? new Date().getFullYear();

    for (const question of questions) {
      if (question.scale !== "likert5") {
        continue;
      }

      const scores = surveyResponses
        .flatMap((row) => parseAnswers(row.answers))
        .filter((answer) => answer.questionId === question.id && isLikertScore(answer.value))
        .map((answer) => answer.value as number);

      if (scores.length < MIN_RESPONSES_FOR_SCORE) {
        continue;
      }

      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (average >= LOW_SCORE_THRESHOLD) {
        continue;
      }

      suggestions.push({
        surveyId: survey.id,
        surveyTitle: survey.title,
        division: survey.division,
        year,
        title: `[낮은 만족] ${question.category ?? "문항"} 개선 — ${survey.sub_business}`,
        source: "low_score",
        relatedQuestionId: question.id,
        relatedQuestionLabel: question.label,
        memo: `평균 ${Math.round(average * 100) / 100}점 (기준 ${LOW_SCORE_THRESHOLD}점 미만, 응답 ${scores.length}건)`,
      });
    }

    const opinionQuestions = questions.filter((question) => question.scale === "text");
    const opinionSnippets: string[] = [];

    for (const question of opinionQuestions) {
      for (const row of surveyResponses) {
        const answer = parseAnswers(row.answers).find((item) => item.questionId === question.id);
        if (typeof answer?.value === "string" && answer.value.trim().length >= 8) {
          opinionSnippets.push(answer.value.trim().slice(0, 120));
        }
      }
    }

    if (opinionSnippets.length > 0) {
      const unique = Array.from(new Set(opinionSnippets)).slice(0, 5);
      suggestions.push({
        surveyId: survey.id,
        surveyTitle: survey.title,
        division: survey.division,
        year,
        title: `[주관식] ${survey.sub_business} 개선의견 반영`,
        source: "opinion",
        relatedQuestionId: opinionQuestions[0]?.id,
        relatedQuestionLabel: opinionQuestions[0]?.label,
        memo: unique.map((text, index) => `${index + 1}. ${text}`).join("\n"),
      });
    }
  }

  return suggestions;
}
