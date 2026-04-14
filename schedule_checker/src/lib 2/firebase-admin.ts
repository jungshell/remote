import { getApps, getApp, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminApp(): App | null {
  if (getApps().length) return getApp() as App;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } catch {
    return null;
  }
}

export function getAdminFirestore() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}
