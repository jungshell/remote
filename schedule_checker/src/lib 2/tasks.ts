import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Task, TaskInput } from "@/types/task";

const COLLECTION = "tasks";

function toTask(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    title: (data.title as string) ?? "",
    description: data.description as string | undefined,
    completed: (data.completed as boolean) ?? false,
    dueDate: (data.dueDate as string | null) ?? null,
    ownerId: (data.ownerId as string) ?? "",
    createdAt: (data.createdAt as Timestamp) ?? { seconds: 0, nanoseconds: 0 },
    updatedAt: (data.updatedAt as Timestamp) ?? { seconds: 0, nanoseconds: 0 },
  };
}

export async function fetchTasks(ownerId: string): Promise<Task[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTask(d.id, d.data()));
}

export async function createTask(ownerId: string, input: TaskInput): Promise<string> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    completed: input.completed ?? false,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(
  taskId: string,
  ownerId: string,
  input: Partial<TaskInput>
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COLLECTION, taskId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COLLECTION, taskId));
}
