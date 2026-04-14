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
import type { Template, TemplateInput } from "@/types/template";

const COLLECTION = "templates";

export async function fetchTemplates(ownerId: string): Promise<Template[]> {
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
      name: data.name ?? "",
      body: data.body ?? "",
      ownerId: data.ownerId ?? "",
      createdAt: data.createdAt ?? { seconds: 0, nanoseconds: 0 },
    };
  });
}

export async function createTemplate(ownerId: string, input: TemplateInput): Promise<string> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    ownerId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTemplate(id: string, ownerId: string, input: Partial<TemplateInput>): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, COLLECTION, id), { ...input, updatedAt: serverTimestamp() });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
