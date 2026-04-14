import type { Timestamp } from "firebase/firestore";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string | null;
  ownerId: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number };
  updatedAt: Timestamp | { seconds: number; nanoseconds: number };
}

export interface TaskInput {
  title: string;
  description?: string;
  completed?: boolean;
  dueDate?: string | null;
}
