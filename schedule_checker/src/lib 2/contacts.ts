import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Contact, ContactInput } from "@/types/contact";

const COLLECTION = "contacts";

export async function fetchContacts(ownerId: string): Promise<Contact[]> {
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
      email: data.email,
      phone: data.phone,
      memo: data.memo,
      ownerId: data.ownerId ?? "",
      createdAt: data.createdAt ?? { seconds: 0, nanoseconds: 0 },
    };
  });
}

export async function createContact(ownerId: string, input: ContactInput): Promise<string> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    ownerId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteContact(id: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
