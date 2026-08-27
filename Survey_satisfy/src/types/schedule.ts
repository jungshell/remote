export interface ScheduleTimeSlot {
  id: string;
  label: string;
}

export type SchedulePollStatus = "진행중" | "종료";

/** 조사 유형: availability = 가용시간 조사(복수 후보 중 선택), confirm = 확정 일정 참석 확인 */
export type SchedulePollType = "availability" | "confirm";

/** 확정 일정 참석 응답: 참석 / 불참 / 미정 */
export type AttendanceStatus = "attend" | "absent" | "tentative";

export interface SchedulePoll {
  id: string;
  title: string;
  description?: string | null;
  pollType: SchedulePollType;
  dates: string[]; // "yyyy-mm-dd"
  timeSlots: ScheduleTimeSlot[];
  includeLunch: boolean;
  includeDinner: boolean;
  status: SchedulePollStatus;
  deadline?: string | null;
  createdAt?: string;
}

/** 응답자가 특정 날짜에 대해 선택한 가능 시간대·식사 */
export interface ScheduleDateSelection {
  date: string;
  slots: string[]; // 가능한 시간대 id 목록 (참석확인 유형에서는 빈 배열)
  status?: AttendanceStatus; // 참석확인 유형에서만 사용
  lunch?: boolean;
  dinner?: boolean;
}

export interface ScheduleResponseInput {
  respondentName: string;
  selections: ScheduleDateSelection[];
  note?: string;
}

export interface ScheduleResponseRecord extends ScheduleResponseInput {
  id: string;
  submittedAt: string;
}

/** 기본 제공 시간대 */
export const DEFAULT_TIME_SLOTS: ScheduleTimeSlot[] = [
  { id: "am", label: "오전 10~11" },
  { id: "pm", label: "오후 13~15" },
];
