import type { Project, Question, SurveyResponse } from "@/types/platform";

const SCRIPT_PROXY_URL = "/api/google-script";

type AppsScriptAction =
  | "createProjectRound"
  | "submitResponse"
  | "findResponse"
  | "generateReport"
  | "getDashboardData";

interface AppsScriptRequest {
  action: AppsScriptAction;
  payload: unknown;
}

export async function callAppsScript<T>(request: AppsScriptRequest): Promise<T> {
  const response = await fetch(SCRIPT_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Apps Script request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok: boolean; result?: T; error?: string };

  if (!data.ok) {
    throw new Error(data.error ?? "Apps Script returned an unknown error.");
  }

  return data.result as T;
}

export function createProjectRound(project: Project, surveyId: string, questions: Question[] = []) {
  return callAppsScript<{ folderPath: string[]; sheetId: string }>({
    action: "createProjectRound",
    payload: { project, surveyId, questions },
  });
}

export function submitSurveyResponse(response: SurveyResponse, project: Project, questions: Question[]) {
  return callAppsScript<{ updated: boolean; submittedAt: string }>({
    action: "submitResponse",
    payload: { response, project, questions },
  });
}

export function findSurveyResponse(surveyId: string, phoneLast4: string) {
  return callAppsScript<{ exists: boolean; response?: SurveyResponse }>({
    action: "findResponse",
    payload: { surveyId, phoneLast4 },
  });
}

export function generateReport(surveyId: string, reportType: "official" | "internal") {
  return callAppsScript<{ fileId: string; url: string; docUrl?: string; message?: string }>({
    action: "generateReport",
    payload: { projectId: surveyId, reportType },
  });
}

export interface LiveDashboardData {
  project: Record<string, string | number>;
  summary: Record<string, string | number>;
  actionItems: Array<Record<string, string | number>>;
  opinions: Array<Record<string, string | number>>;
  responseCount: number;
}

export function getDashboardData(surveyId: string) {
  return callAppsScript<LiveDashboardData>({
    action: "getDashboardData",
    payload: { surveyId },
  });
}

export function isAppsScriptConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL);
}
