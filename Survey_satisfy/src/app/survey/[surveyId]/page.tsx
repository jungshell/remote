import { SurveyForm } from "@/components/survey/SurveyForm";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { surveyRowToRecord } from "@/lib/surveys/utils";
import type { SurveyRecord } from "@/types/platform";

interface SurveyPageProps {
  params: Promise<{
    surveyId: string;
  }>;
}

type LoadResult =
  | { status: "ok"; survey: SurveyRecord }
  | { status: "not_found" }
  | { status: "error" };

async function loadSurvey(surveyId: string): Promise<LoadResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { status: "error" };
  }

  const { data, error } = await supabase.from("surveys").select("*").eq("id", surveyId).maybeSingle();

  if (error) {
    console.error("[survey-page] 설문 조회 실패:", error.message);
    return { status: "error" };
  }

  if (!data || data.status !== "진행중") {
    return { status: "not_found" };
  }

  return { status: "ok", survey: surveyRowToRecord(data) };
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { surveyId } = await params;
  const result = await loadSurvey(surveyId);

  if (result.status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-4">
        <div className="panel max-w-lg p-8 text-center">
          <h1 className="text-2xl font-black uppercase">일시적인 오류가 발생했습니다</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
            잠시 후 새로고침해 다시 시도해 주세요. 문제가 계속되면 담당자에게 문의해 주세요.
          </p>
        </div>
      </main>
    );
  }

  if (result.status === "not_found") {
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
      <SurveyForm survey={result.survey} />
    </main>
  );
}
