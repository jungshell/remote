import * as admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length > 0) return admin.app();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const cred = JSON.parse(json) as admin.ServiceAccount;
      return admin.initializeApp({ credential: admin.credential.cert(cred) });
    } catch {
      return null;
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  return null;
}

export function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getAdmin();
  return app ? app.firestore() : null;
}
