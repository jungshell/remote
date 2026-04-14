export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type User = {
  id: string;
  name: string;
  email: string;
  timezone: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  dueDate?: Date | any; // Firestore Timestamp
  ownerId: string;
  assigneeId?: string; // 담당자 ID
  assigner?: string; // 지시자 (누가 지시했는지)
  receivedAt?: string; // 업무접수일 (업무를 접수한 날, ISO 문자열)
  calendarEventId?: string; // Google Calendar 이벤트 ID
  createdAt?: Date | any; // Firestore Timestamp
  updatedAt?: Date | any; // Firestore Timestamp
};

export type TaskAssignee = {
  id: string;
  taskId: string;
  assigneeId: string;
  role: "owner" | "collaborator";
};

export type Schedule = {
  id: string;
  taskId: string;
  startAt?: string;
  endAt?: string;
  timezone: string;
};

export type Notification = {
  id: string;
  taskId?: string;
  type: "summary" | "reminder" | "delay" | "suggestion";
  nextFireAt?: string;
  cadence: "6h" | "12h" | "24h" | "custom";
  isEnabled: boolean;
};

export type Contact = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  ownerId?: string;
};

export type CopyReview = {
  id: string;
  taskId?: string;
  inputText: string;
  suggestedText: string;
  tone: "friendly" | "concise" | "formal";
  createdAt: string;
};

export type DashboardMetric = {
  id: string;
  userId: string;
  date: string;
  completionRate: number;
  delayCount: number;
  focusScore?: number;
};

export type Template = {
  id: string;
  name: string;
  description?: string;
  checklist: string[];
  repeatInterval?: "daily" | "weekly" | "monthly";
  createdAt?: Date | any;
  ownerId?: string;
};

export type Alert = {
  id: string;
  type: "delay" | "reminder_adjust" | "summary" | "suggestion";
  message: string;
  taskId?: string;
  createdAt?: Date | any;
  isRead?: boolean;
  ownerId?: string;
};

/** Meeting / PDF 분석 등 워크 로그 (SmartWork 통합) */
export type WorkLog = {
  id: string;
  ownerId: string;
  content_text: string;
  analysis_json: Record<string, unknown>;
  tags?: string[];
  importance?: number;
  version?: number;
  mode?: string;
  source_type?: string;
  source_filename?: string;
  created_at?: string;
};
