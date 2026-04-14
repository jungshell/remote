import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebase(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return app as FirebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  const app = getFirebase();
  return app ? getAuth(app) : null;
}

export function getFirestoreDb(): Firestore | null {
  if (typeof window === "undefined") return null;
  const app = getFirebase();
  return app ? getFirestore(app) : null;
}
