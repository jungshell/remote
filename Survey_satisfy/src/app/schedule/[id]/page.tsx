import type { Metadata } from "next";
import { ScheduleResponseForm } from "@/components/schedule/ScheduleResponseForm";
import { pollRowToRecord } from "@/lib/schedule/utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { SchedulePoll } from "@/types/schedule";

interface SchedulePageProps {
  params: Promise<{ id: string }>;
}

/** 링크 미리보기(카톡·문자 등)에 일정조사 제목만 노출 */
export async function generateMetadata({ params }: SchedulePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();
  let title = "일정조사";
  if (supabase) {
    const { data } = await supabase.from("schedule_polls").select("title").eq("id", id).maybeSingle();
    if (data?.title) {
      title = data.title;
    }
  }
  const description = "가능한 날짜·시간을 선택해 주세요.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

type LoadResult =
  | { status: "ok"; poll: SchedulePoll }
  | { status: "not_found" }
  | { status: "closed" }
  | { status: "error" };

async function loadPoll(id: string): Promise<LoadResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { status: "error" };
  }

  const { data, error } = await supabase.from("schedule_polls").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[schedule-page] 조회 실패:", error.message);
    return { status: "error" };
  }

  if (!data || data.status !== "진행중") {
    return { status: "not_found" };
  }

  const poll = pollRowToRecord(data);
  if (poll.deadline && new Date(poll.deadline).getTime() < Date.now()) {
    return { status: "closed" };
  }

  return { status: "ok", poll };
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-black px-4">
      <div className="panel max-w-lg p-8 text-center">
        <h1 className="text-2xl font-black uppercase">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">{body}</p>
      </div>
    </main>
  );
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { id } = await params;
  const result = await loadPoll(id);

  if (result.status === "error") {
    return <Notice title="일시적인 오류가 발생했습니다" body="잠시 후 새로고침해 다시 시도해 주세요. 문제가 계속되면 담당자에게 문의해 주세요." />;
  }
  if (result.status === "not_found") {
    return <Notice title="일정조사를 찾을 수 없습니다" body="진행 중인 조사가 아니거나 링크가 올바르지 않습니다. 담당자에게 문의해 주세요." />;
  }
  if (result.status === "closed") {
    return <Notice title="응답이 마감되었습니다" body="이 일정조사는 응답 기간이 종료되었습니다. 담당자에게 문의해 주세요." />;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 md:py-10">
      <ScheduleResponseForm poll={result.poll} />
    </main>
  );
}
