import type { Timestamp } from "firebase/firestore";

export type TaskTimestamp = Timestamp | { seconds: number; nanoseconds: number };

export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  ownerId: string;
  /** 기한(일시). Firestore Timestamp로 저장 */
  dueDate?: TaskTimestamp | null;
  priority?: TaskPriority;
  /** 장소 (선택) */
  location?: string | null;
  /** 참석 (쉼표 구분 문자열, 선택) */
  attendees?: string | null;
  /** 담당자 (선택) */
  assignee?: string | null;
  /** 상위 목표(업무) ID. 있으면 하위 업무 */
  parentTaskId?: string | null;
  /** true면 최상위 목표로 표시 */
  isGoal?: boolean;
  createdAt: TaskTimestamp;
  updatedAt: TaskTimestamp;
}

export interface TaskInput {
  title: string;
  description?: string;
  completed?: boolean;
  dueDate?: string | null;
  priority?: TaskPriority;
  location?: string | null;
  attendees?: string | null;
  assignee?: string | null;
  parentTaskId?: string | null;
  isGoal?: boolean;
}
