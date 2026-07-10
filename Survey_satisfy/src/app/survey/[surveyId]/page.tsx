import { SurveyForm } from "@/components/survey/SurveyForm";
import type { SurveyRecord } from "@/types/platform";

interface SurveyPageProps {
  params: Promise<{
    surveyId: string;
  }>;
}

async function loadSurvey(surveyId: string): Promise<SurveyRecord | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/surveys/public/${surveyId}`, { cache: "no-store" });
    const data = (await response.json()) as { ok: boolean; survey?: SurveyRecord };

    if (response.ok && data.ok && data.survey) {
      return data.survey;
    }
  } catch {
    return null;
  }

  return null;
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { surveyId } = await params;
  const survey = await loadSurvey(surveyId);

  if (!survey) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-4">
        <div className="panel max-w-lg p-8 text-center">
          <h1 className="text-2xl font-black uppercase">설문을 찾을 수 없습니다</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
            진행 중인 설문이 아니거나 링크가 올바르지 않습니다. 담당자에게 문의해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 md:py-10">
      <SurveyForm survey={survey} />
    </main>
  );
}
