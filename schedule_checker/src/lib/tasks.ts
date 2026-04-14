import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Task, TaskInput } from "@/types/task";

const COLLECTION = "tasks";

const DEFAULT_PRIORITY = "medium" as const;

function toTask(id: string, data: Record<string, unknown>): Task {
  const dueDate = data.dueDate;
  const priority = data.priority as Task["priority"] | undefined;
  const parentTaskId = data.parentTaskId;
  return {
    id,
    title: (data.title as string) ?? "",
    description: data.description as string | undefined,
    completed: (data.completed as boolean) ?? false,
    ownerId: (data.ownerId as string) ?? "",
    dueDate: dueDate == null ? undefined : (dueDate as Task["dueDate"]),
    priority: priority === "high" || priority === "low" ? priority : (DEFAULT_PRIORITY as Task["priority"]),
    location: data.location != null ? (data.location as string) : undefined,
    attendees: data.attendees != null ? (data.attendees as string) : undefined,
    assignee: data.assignee != null ? (data.assignee as string) : undefined,
    parentTaskId: parentTaskId == null ? undefined : (parentTaskId as string),
    isGoal: data.isGoal === true,
    createdAt: (data.createdAt as Task["createdAt"]) ?? { seconds: 0, nanoseconds: 0 },
    updatedAt: (data.updatedAt as Task["updatedAt"]) ?? { seconds: 0, nanoseconds: 0 },
  };
}

const TASKS_PAGE_SIZE = 200;

export async function fetchTasks(ownerId: string): Promise<Task[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
    limit(TASKS_PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTask(d.id, d.data()));
}

export async function createTask(ownerId: string, input: TaskInput): Promise<string> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  const data: Record<string, unknown> = {
    title: input.title ?? "",
    description: input.description ?? "",
    completed: input.completed ?? false,
    ownerId,
    priority: input.priority === "high" || input.priority === "low" ? input.priority : "medium",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.dueDate != null && input.dueDate !== "") {
    data.dueDate = Timestamp.fromDate(new Date(input.dueDate));
  }
  if (input.parentTaskId !== undefined && input.parentTaskId !== null) {
    data.parentTaskId = input.parentTaskId;
  }
  if (input.isGoal === true) {
    data.isGoal = true;
  }
  if (input.location != null && input.location !== "") {
    data.location = input.location;
  }
  if (input.attendees != null && input.attendees !== "") {
    data.attendees = input.attendees;
  }
  if (input.assignee != null && input.assignee !== "") {
    data.assignee = input.assignee;
  }
  const ref = await addDoc(collection(db, COLLECTION), data);
  return ref.id;
}

export async function updateTask(
  taskId: string,
  _ownerId: string,
  input: Partial<TaskInput>
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  // undefined 제거 후 전달 (Firestore는 undefined 미지원)
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.completed !== undefined) payload.completed = input.completed;
  if (input.dueDate !== undefined) {
    payload.dueDate = input.dueDate == null || input.dueDate === "" ? null : Timestamp.fromDate(new Date(input.dueDate));
  }
  if (input.priority !== undefined) {
    payload.priority = input.priority === "high" || input.priority === "low" ? input.priority : "medium";
  }
  if (input.parentTaskId !== undefined) payload.parentTaskId = input.parentTaskId;
  if (input.isGoal !== undefined) payload.isGoal = input.isGoal;
  if (input.location !== undefined) payload.location = input.location;
  if (input.attendees !== undefined) payload.attendees = input.attendees;
  if (input.assignee !== undefined) payload.assignee = input.assignee;
  await updateDoc(doc(db, COLLECTION, taskId), payload);
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COLLECTION, taskId));
}
