"use client";

import { useEffect, useState } from "react";
import { authFetch, fetchCurrentUser } from "@/lib/auth/access";
import { Badge } from "@/components/ui/Badge";
import { ScheduleResults } from "@/components/admin/ScheduleResults";
import { DatePickerField } from "@/components/manager/DatePickerField";
import { MultiDatePicker } from "@/components/schedule/MultiDatePicker";
import { formatScheduleDeadline } from "@/lib/schedule/utils";
import type { SchedulePoll, SchedulePollType, ScheduleTimeSlot } from "@/types/schedule";

const HOUR_OPTIONS = [9, 10, 11, 13, 14, 15, 16, 17, 18];
const DEFAULT_HOURS = [10, 11, 13, 14, 15];
const DEADLINE_HOURS = [12, 13, 14, 15, 16, 17];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type EditorMode = "create" | "edit" | "copy";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** 저장된 시간대에서 시각(시) 목록 복원 — 편집·복사 시 사용 */
function hoursFromSlots(slots: ScheduleTimeSlot[]): number[] {
  const hours = slots
    .map((slot) => {
      const match = slot.id.match(/^h(\d+)$/);
      return match ? Number(match[1]) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
  return hours.length > 0 ? hours : DEFAULT_HOURS;
}

/** 폼 입력(마감 날짜 + 시각) → 서버 저장용 ISO. KST 기준을 UTC로 고정 변환 */
function toDeadlineIso(date: string, hour: number | null): string | null {
  if (!date) {
    return null;
  }
  if (hour == null) {
    return date; // 날짜만 지정(기존 동작): 서버가 자정 기준으로 저장
  }
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 9, 0, 0)).toISOString();
}

/** 저장된 마감(UTC ISO) → 폼 편집용 { 날짜, 시각 } 복원 */
function splitDeadline(iso: string | null | undefined): { date: string; hour: number | null } {
  if (!iso) {
    return { date: "", hour: null };
  }
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) {
    return { date: "", hour: null };
  }
  const kst = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  const date = `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}`;
  const hour = kst.getUTCHours();
  return { date, hour: DEADLINE_HOURS.includes(hour) ? hour : null };
}

/** 안내 문구용 마감 표기: "8월 5일(수) 17시" */
function deadlinePhrase(date: string, hour: number | null): string {
  if (!date) {
    return "";
  }
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const datePart = `${m}월 ${d}일(${weekday})`;
  return hour != null ? `${datePart} ${hour}시` : datePart;
}

/** 제목으로 안내 문구 초안 생성 (유형·마감·확정일시 반영) */
function generateDescription(
  title: string,
  name: string,
  deadlineText: string,
  pollType: SchedulePollType,
  confirmedText: string,
): string {
  const base = title.replace(/\s*일정\s*(조사|재확인|확인)?\s*$/, "").trim();
  if (!base) {
    return "";
  }
  const roundMatch = base.match(/^제\s*(\d+)\s*차\s*(.+)$/);
  const round = roundMatch?.[1];
  const committee = (roundMatch?.[2] ?? base).trim();
  const meeting = round ? `제${round}차 ${committee}` : committee;
  const greeter = name ? `충남콘텐츠진흥원 ${name}입니다.` : "충남콘텐츠진흥원입니다.";
  const deadlineClause = deadlineText ? `${deadlineText}까지 ` : "";

  if (pollType === "confirm") {
    const scheduleLine = confirmedText ? `\n\n▶ 일시: ${confirmedText}` : "";
    return `안녕하세요. ${greeter}

${committee} 참여해주셔서 감사드립니다.
아래 확정된 일정에 참석 가능 여부를 ${deadlineClause}회신 부탁드립니다.${scheduleLine}

감사합니다.`;
  }

  return `안녕하세요. ${greeter}

${committee} 참여해주셔서 감사드립니다.
관련하여 ${meeting}를 진행하고자 하오니 ${deadlineClause}가능한 일정 투표 부탁드립니다.

감사합니다.`;
}

type View = "list" | "editor" | "results";

function scheduleUrl(id: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/schedule/${id}`;
}

export function ScheduleConsole() {
  const [polls, setPolls] = useState<SchedulePoll[]>([]);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<SchedulePoll | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorInitial, setEditorInitial] = useState<SchedulePoll | null>(null);
  const [status, setStatus] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [nowTs, setNowTs] = useState(0);

  function openEditor(mode: EditorMode, poll: SchedulePoll | null) {
    setEditorMode(mode);
    setEditorInitial(poll);
    setStatus("");
    setView("editor");
  }

  useEffect(() => {
    const controller = new AbortController();
    authFetch("/api/schedule-polls", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ok: boolean; polls?: SchedulePoll[]; error?: string }) => {
        if (data.ok && data.polls) {
          setPolls(data.polls);
          setNowTs(Date.now());
        } else {
          setStatus(data.error ?? "일정조사를 불러오지 못했습니다.");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("일정조사를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  async function handleCopyLink(id: string) {
    try {
      await navigator.clipboard.writeText(scheduleUrl(id));
      setStatus("참여 링크를 복사했습니다.");
    } catch {
      setStatus(scheduleUrl(id));
    }
  }

  async function handleToggleStatus(poll: SchedulePoll) {
    const next = poll.status === "진행중" ? "종료" : "진행중";
    const response = await authFetch(`/api/schedule-polls/${poll.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "상태 변경에 실패했습니다.");
      return;
    }
    setReloadKey((key) => key + 1);
  }

  async function handleDelete(poll: SchedulePoll) {
    if (!window.confirm(`"${poll.title}" 일정조사를 삭제할까요? 응답도 함께 삭제됩니다.`)) {
      return;
    }
    const response = await authFetch(`/api/schedule-polls/${poll.id}`, { method: "DELETE" });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setStatus(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    setStatus("삭제했습니다.");
    setReloadKey((key) => key + 1);
  }

  if (view === "editor") {
    return (
      <SchedulePollEditor
        mode={editorMode}
        initial={editorInitial}
        onCancel={() => setView("list")}
        onSaved={(message) => {
          setView("list");
          setStatus(message);
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  if (view === "results" && selected) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView("list")}
            className="label-machined text-[var(--text-body)] transition-colors hover:text-white"
          >
            ← 일정조사 목록
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLink(selected.id)}
              className="focus-ring label-machined min-h-10 border border-[var(--hairline)] px-4 text-sm text-[var(--text-body)] hover:border-white hover:text-white"
            >
              참여 링크 복사
            </button>
          </div>
        </div>
        <ScheduleResults poll={selected} />
        {status ? <p className="text-sm text-[var(--text-body)]">{status}</p> : null}
      </div>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--hairline)] p-4 sm:p-6">
        <div>
          <p className="label-machined text-[var(--text-muted)]">Schedule</p>
          <h2 className="mt-2 text-2xl font-black uppercase">위원 일정조사</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            후보 날짜·시간대를 정해 링크를 배포하면, 위원별 가능 시간을 취합해 한눈에 봅니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor("create", null)}
          className="focus-ring label-machined border border-white px-5 py-3 hover:bg-white hover:text-black"
        >
          + 새 일정조사
        </button>
      </div>

      <div className="divide-y divide-[var(--hairline)]">
        {polls.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">아직 만든 일정조사가 없습니다. &quot;+ 새 일정조사&quot;로 시작하세요.</p>
        ) : (
          polls.map((poll) => {
            const closedByDeadline =
              poll.status === "진행중" &&
              !!poll.deadline &&
              nowTs > 0 &&
              new Date(poll.deadline).getTime() < nowTs;
            return (
            <article key={poll.id} className="grid gap-3 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={poll.status === "진행중" ? "success" : "default"}>{poll.status}</Badge>
                  {closedByDeadline ? <Badge tone="warning">마감됨</Badge> : null}
                  <Badge tone={poll.pollType === "confirm" ? "info" : "default"}>
                    {poll.pollType === "confirm" ? "참석 확인" : "가용시간"}
                  </Badge>
                  <h3 className="text-lg font-bold text-white">{poll.title}</h3>
                </div>
                <p className="mt-2 text-sm text-[var(--text-body)]">
                  {poll.pollType === "confirm"
                    ? `확정 ${poll.dates[0] ? poll.dates[0].slice(5) : "-"} ${poll.timeSlots[0]?.label ?? ""}`
                    : `후보 ${poll.dates.length}일 · 시간대 ${poll.timeSlots.length}개`}
                  {poll.includeLunch ? " · 오찬" : ""}
                  {poll.includeDinner ? " · 석식" : ""}
                  {poll.deadline ? ` · 마감 ${formatScheduleDeadline(poll.deadline)}` : ""}
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-muted)]">{scheduleUrl(poll.id)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  label="결과 보기"
                  primary
                  onClick={() => {
                    setSelected(poll);
                    setView("results");
                  }}
                />
                <ActionButton label="링크 복사" onClick={() => void handleCopyLink(poll.id)} />
                <ActionButton label="수정" onClick={() => openEditor("edit", poll)} />
                <ActionButton label="복사본 만들기" onClick={() => openEditor("copy", poll)} />
                <ActionButton
                  label={poll.status === "진행중" ? "종료" : "재개"}
                  onClick={() => void handleToggleStatus(poll)}
                />
                <ActionButton label="삭제" danger onClick={() => void handleDelete(poll)} />
              </div>
            </article>
            );
          })
        )}
      </div>

      {status ? <p className="border-t border-[var(--hairline)] p-4 text-sm text-[var(--text-body)] sm:p-6">{status}</p> : null}
    </section>
  );
}

function ActionButton({
  label,
  primary,
  danger,
  onClick,
}: {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const tone = primary
    ? "border-white text-white hover:bg-white hover:text-black"
    : danger
      ? "border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-black"
      : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white";
  return (
    <button type="button" onClick={onClick} className={`focus-ring label-machined min-h-11 border px-4 text-xs ${tone}`}>
      {label}
    </button>
  );
}

function SchedulePollEditor({
  mode,
  initial,
  onCancel,
  onSaved,
}: {
  mode: EditorMode;
  initial: SchedulePoll | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = mode === "edit";
  const initialDeadline = splitDeadline(initial?.deadline);
  const initialDeadlinePhrase = deadlinePhrase(initialDeadline.date, initialDeadline.hour);
  const [pollType, setPollType] = useState<SchedulePollType>(initial?.pollType ?? "availability");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [lastAutoDesc, setLastAutoDesc] = useState("");
  const [userName, setUserName] = useState("");
  const [dates, setDates] = useState<string[]>(initial?.dates ?? []);
  const [hours, setHours] = useState<number[]>(
    initial ? hoursFromSlots(initial.timeSlots) : DEFAULT_HOURS,
  );
  const [includeLunch, setIncludeLunch] = useState(initial?.includeLunch ?? false);
  const [includeDinner, setIncludeDinner] = useState(initial?.includeDinner ?? false);
  const [deadline, setDeadline] = useState(initialDeadline.date);
  const [deadlineHour, setDeadlineHour] = useState<number | null>(initialDeadline.hour);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isConfirm = pollType === "confirm";

  useEffect(() => {
    void fetchCurrentUser().then((user) => {
      if (user?.name) {
        setUserName(user.name);
      }
    });
  }, []);

  const heading = isEdit ? "일정조사 수정" : mode === "copy" ? "일정조사 복사본 만들기" : "새 일정조사";
  const eyebrow = isEdit ? "Edit Schedule" : mode === "copy" ? "Copy Schedule" : "New Schedule";
  const submitLabel = isEdit ? "수정 내용 저장" : "일정조사 생성 · 링크 발급";
  const savingLabel = isEdit ? "저장 중" : "생성 중";

  // 확정 일정 유형에서 "확정 일시" 문구 — dates[0]/hours[0] 기준
  function confirmedTextFrom(ds: string[], hs: number[]): string {
    return pollType === "confirm" ? deadlinePhrase(ds[0] ?? "", hs[0] ?? null) : "";
  }

  // 현재 문구가 "자동 생성분 그대로"인지 판정 — 수정 화면에서 불러온 자동 문구도 인식한다
  function isAutoDescription(current: string, forTitle: string): boolean {
    if (current === "" || current === lastAutoDesc) {
      return true;
    }
    const confirmedText = confirmedTextFrom(dates, hours);
    // 제목만으로 만든 형태(마감 없음)
    if (current === generateDescription(forTitle, userName, "", pollType, confirmedText)) {
      return true;
    }
    // 처음 불러온 시점의 마감을 포함해 만든 형태
    if (
      initialDeadlinePhrase &&
      current === generateDescription(forTitle, userName, initialDeadlinePhrase, pollType, confirmedText)
    ) {
      return true;
    }
    return false;
  }

  // 안내 문구가 자동 생성분 그대로면(직접 편집 전) 최신 값으로 다시 채운다
  function maybeAutoDescription(next: {
    title?: string;
    deadlineDate?: string;
    deadlineHour?: number | null;
    dates?: string[];
    hours?: number[];
  }) {
    const t = next.title ?? title;
    if (!isAutoDescription(description, t)) {
      return;
    }
    const dDate = next.deadlineDate ?? deadline;
    const dHour = next.deadlineHour !== undefined ? next.deadlineHour : deadlineHour;
    const confirmedText = confirmedTextFrom(next.dates ?? dates, next.hours ?? hours);
    const draft = generateDescription(t, userName, deadlinePhrase(dDate, dHour), pollType, confirmedText);
    setDescription(draft);
    setLastAutoDesc(draft);
  }

  function handlePollType(next: SchedulePollType) {
    if (next === pollType) {
      return;
    }
    // 유형 전환 시 확정형은 날짜·시각 1개만 유지
    const nextDates = next === "confirm" ? dates.slice(0, 1) : dates;
    const nextHours = next === "confirm" ? hours.slice(0, 1) : hours;
    setPollType(next);
    setDates(nextDates);
    setHours(nextHours);
    // 유형이 바뀌면 문구 템플릿도 갱신 (자동 문구인 경우)
    if (isAutoDescription(description, title)) {
      const confirmedText = next === "confirm" ? deadlinePhrase(nextDates[0] ?? "", nextHours[0] ?? null) : "";
      const draft = generateDescription(title, userName, deadlinePhrase(deadline, deadlineHour), next, confirmedText);
      setDescription(draft);
      setLastAutoDesc(draft);
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    maybeAutoDescription({ title: value });
  }

  function handleDeadlineDate(value: string) {
    setDeadline(value);
    maybeAutoDescription({ deadlineDate: value });
  }

  function handleDeadlineHour(hour: number) {
    const next = deadlineHour === hour ? null : hour;
    setDeadlineHour(next);
    maybeAutoDescription({ deadlineHour: next });
  }

  function clearDeadline() {
    setDeadline("");
    setDeadlineHour(null);
    maybeAutoDescription({ deadlineDate: "", deadlineHour: null });
  }

  // 후보/확정 날짜 변경 (확정형은 단일 선택)
  function handleDatesChange(nextAll: string[]) {
    const next = isConfirm ? nextAll.slice(-1) : nextAll;
    setDates(next);
    maybeAutoDescription({ dates: next });
  }

  // 시각 토글 — 가용형은 복수, 확정형은 단일
  function toggleHour(hour: number) {
    const next = isConfirm
      ? hours.includes(hour)
        ? []
        : [hour]
      : hours.includes(hour)
        ? hours.filter((h) => h !== hour)
        : [...hours, hour];
    setHours(next);
    maybeAutoDescription({ hours: next });
  }

  function regenerateDescription() {
    const draft = generateDescription(
      title,
      userName,
      deadlinePhrase(deadline, deadlineHour),
      pollType,
      confirmedTextFrom(dates, hours),
    );
    setDescription(draft);
    setLastAutoDesc(draft);
  }

  async function handleSave() {
    if (!title.trim()) {
      setStatus("조사 제목을 입력해 주세요.");
      return;
    }
    if (isConfirm) {
      if (dates.length !== 1) {
        setStatus("확정 날짜를 하나 선택해 주세요.");
        return;
      }
      if (hours.length !== 1) {
        setStatus("확정 시각을 하나 선택해 주세요.");
        return;
      }
    } else {
      if (dates.length === 0) {
        setStatus("후보 날짜를 1개 이상 선택해 주세요.");
        return;
      }
      if (hours.length === 0) {
        setStatus("가능 시각을 1개 이상 선택해 주세요.");
        return;
      }
    }
    const timeSlots = [...hours].sort((a, b) => a - b).map((hour) => ({ id: `h${hour}`, label: `${hour}시` }));

    setIsSaving(true);
    setStatus("");
    try {
      const payload = {
        title,
        description,
        pollType,
        dates: isConfirm ? dates.slice(0, 1) : dates,
        timeSlots,
        includeLunch,
        includeDinner,
        deadline: toDeadlineIso(deadline, deadlineHour),
      };
      const response = await authFetch(
        isEdit ? `/api/schedule-polls/${initial!.id}` : "/api/schedule-polls",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus(data.error ?? "저장에 실패했습니다.");
        return;
      }
      onSaved(isEdit ? "수정했습니다." : mode === "copy" ? "복사본을 만들었습니다." : "일정조사를 만들었습니다.");
    } catch {
      setStatus("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-machined text-[var(--text-muted)]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black uppercase">{heading}</h2>
          {mode === "copy" ? (
            <p className="mt-2 text-sm text-[var(--text-body)]">
              기존 조사 내용을 복사했습니다. 제목·날짜 등을 수정한 뒤 새 조사로 발급됩니다.
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onCancel} className="label-machined text-[var(--text-body)] hover:text-white">
          ← 목록
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {/* 조사 유형 */}
        <div>
          <span className="label-machined text-[var(--text-muted)]">조사 유형</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <TypeCard
              active={!isConfirm}
              title="가용시간 조사"
              desc="여러 후보 날짜·시각 중 가능한 시간을 복수로 받습니다."
              onClick={() => handlePollType("availability")}
            />
            <TypeCard
              active={isConfirm}
              title="참석 확인"
              desc="확정된 하나의 일정에 참석/불참/미정을 받습니다."
              onClick={() => handlePollType("confirm")}
            />
          </div>
        </div>

        <label className="block">
          <span className="label-machined text-[var(--text-muted)]">제목</span>
          <input
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder={isConfirm ? "예: 제2차 임원추천위원회 일정 참석 확인" : "예: 제1차 임원추천위원회 일정조사"}
            className="focus-ring mt-2 h-12 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] px-4 text-white"
          />
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="label-machined text-[var(--text-muted)]">안내 문구 (제목 입력 시 자동 생성 · 수정 가능)</span>
            <button
              type="button"
              onClick={regenerateDescription}
              className="focus-ring text-xs text-[var(--text-muted)] underline underline-offset-4 hover:text-white"
            >
              제목으로 다시 생성
            </button>
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={7}
            placeholder="제목을 입력하면 안내 문구 초안이 자동으로 채워집니다."
            className="focus-ring mt-2 w-full border border-[var(--hairline)] bg-[var(--surface-soft)] p-3 text-sm leading-6 text-white"
          />
        </div>

        {/* 날짜 선택 (가용형=복수 / 확정형=1개) */}
        <div>
          <span className="label-machined text-[var(--text-muted)]">
            {isConfirm ? "확정 날짜 (달력에서 1개 선택)" : "후보 날짜 (달력에서 여러 개 클릭)"}
          </span>
          <div className="mt-2">
            <MultiDatePicker value={dates} onChange={handleDatesChange} />
          </div>
        </div>

        {/* 시각 선택 (가용형=복수 / 확정형=1개) */}
        <div>
          <span className="label-machined text-[var(--text-muted)]">
            {isConfirm ? "확정 시각 (1개 선택)" : "가능 시각 선택 (복수)"}
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {HOUR_OPTIONS.map((hour) => {
              const active = hours.includes(hour);
              return (
                <button
                  key={hour}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleHour(hour)}
                  className={`focus-ring min-h-11 border px-4 text-sm transition-colors ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
                  }`}
                >
                  {hour}시
                </button>
              );
            })}
          </div>
        </div>

        {/* 오찬/석식 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField label="오찬 참석 조사 포함" active={includeLunch} onClick={() => setIncludeLunch((v) => !v)} />
          <ToggleField label="석식 참석 조사 포함" active={includeDinner} onClick={() => setIncludeDinner((v) => !v)} />
        </div>

        {/* 응답 마감 (날짜 + 시각) */}
        <div>
          <div className="flex items-center justify-between">
            <span className="label-machined text-[var(--text-muted)]">응답 마감 (선택)</span>
            {deadline ? (
              <button
                type="button"
                onClick={clearDeadline}
                className="focus-ring text-xs text-[var(--text-muted)] underline underline-offset-4 hover:text-white"
              >
                마감 지우기
              </button>
            ) : null}
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <DatePickerField label="마감 날짜" value={deadline} onChange={handleDeadlineDate} />
            <div>
              <span className="label-machined text-[var(--text-muted)]">마감 시각 (12~17시 중 선택)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEADLINE_HOURS.map((hour) => {
                  const active = deadlineHour === hour;
                  return (
                    <button
                      key={hour}
                      type="button"
                      aria-pressed={active}
                      disabled={!deadline}
                      onClick={() => handleDeadlineHour(hour)}
                      className={`focus-ring min-h-11 border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? "border-white bg-white text-black"
                          : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
                      }`}
                    >
                      {hour}시
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {deadline
                  ? "시각을 선택하면 안내 문구에 회신 마감이 자동 반영됩니다."
                  : "먼저 마감 날짜를 선택하세요."}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
          className="focus-ring label-machined mt-2 border border-white px-6 py-4 hover:bg-white hover:text-black disabled:opacity-50"
        >
          {isSaving ? savingLabel : submitLabel}
        </button>
        {status ? <p className="text-sm text-[var(--warning)]">{status}</p> : null}
      </div>
    </section>
  );
}

function TypeCard({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring border p-4 text-left transition-colors ${
        active
          ? "border-white bg-white text-black"
          : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
      }`}
    >
      <span className="block text-base font-bold">
        {active ? "✓ " : ""}
        {title}
      </span>
      <span className={`mt-1 block text-xs leading-5 ${active ? "text-black/70" : "text-[var(--text-muted)]"}`}>
        {desc}
      </span>
    </button>
  );
}

function ToggleField({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring min-h-[3.75rem] border px-4 text-sm transition-colors ${
        active
          ? "border-white bg-white text-black"
          : "border-[var(--hairline)] text-[var(--text-body)] hover:border-white hover:text-white"
      }`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
