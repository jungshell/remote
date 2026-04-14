/**
 * Firebase Admin SDK 초기화
 * 서버 사이드에서 사용하는 Firebase Admin 설정
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env is missing");
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid JSON");
  }
}

function getAdminApp() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(getServiceAccount()),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return getApps()[0]!;
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
