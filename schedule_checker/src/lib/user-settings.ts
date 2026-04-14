import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

const COLLECTION = "user_settings";

export interface UserReportSettings {
  dailyReportEnabled: boolean;
  email?: string;
  googleCalendarConnected?: boolean;
}

export async function getReportSettings(uid: string): Promise<UserReportSettings> {
  const db = getFirestoreDb();
  if (!db) return { dailyReportEnabled: false };
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return { dailyReportEnabled: false };
    const d = snap.data();
    return {
      dailyReportEnabled: d.dailyReportEnabled === true,
      email: d.email as string | undefined,
      googleCalendarConnected: d.googleCalendarConnected === true,
    };
  } catch {
    // Firestore 오류 시 기본값 반환 (토글을 통해 다시 저장할 수 있도록)
    return { dailyReportEnabled: false };
  }
}

export async function setReportSettings(uid: string, settings: Partial<UserReportSettings>): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not initialized");
  await setDoc(
    doc(db, COLLECTION, uid),
    { ...settings, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
