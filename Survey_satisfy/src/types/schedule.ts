export interface ScheduleTimeSlot {
  id: string;
  label: string;
}

export type SchedulePollStatus = "진행중" | "종료";

export interface SchedulePoll {
  id: string;
  title: string;
  description?: string | null;
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
  slots: string[]; // 가능한 시간대 id 목록
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
