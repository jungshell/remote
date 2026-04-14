import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "YOUR_FIREBASE_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "YOUR_FIREBASE_MEASUREMENT_ID"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스
export const db = getFirestore(app);

// Auth (필요시 사용)
export const auth = getAuth(app);

export default app;
