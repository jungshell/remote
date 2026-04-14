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
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Alert, AlertInput } from "@/types/alert";

const COLLECTION = "alerts";

export async function fetchAlerts(ownerId: string): Promise<Alert[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  const q = query(
    collection(db, COLLECTION),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      body: data.body,
      at: data.at,
      done: data.done ?? false,
      ownerId: data.ownerId ?? "",
      createdAt: data.createdAt ?? { seconds: 0, nanoseconds: 0 },
    };
  });
}

export async function createAlert(ownerId: string, input: AlertInput): Promise<string> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    done: false,
    ownerId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function toggleAlert(id: string, ownerId: string, done: boolean): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COLLECTION, id), { done, updatedAt: serverTimestamp() });
}

export async function deleteAlert(id: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
