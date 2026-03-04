// ============================================================
// 파일: src/lib/firebase/config.ts
// 담당: Part 5
// 역할: Firebase 클라이언트 SDK 초기화 (싱글턴)
// ============================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

/**
 * Firebase 앱 인스턴스 (싱글턴)
 * Next.js의 핫 리로드에서 중복 초기화 방지
 */
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

/** Firebase 앱 인스턴스 (lazy) */
export function getFirebaseAppInstance(): FirebaseApp {
  if (!_app) {
    _app = getFirebaseApp();
  }
  return _app;
}

/** Firestore 클라이언트 인스턴스 (lazy) */
export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseAppInstance());
  }
  return _db;
}

/** Firebase Auth 클라이언트 인스턴스 (lazy) */
export function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseAppInstance());
  }
  return _auth;
}

// 하위 호환: 기존 코드에서 직접 참조 가능
export const db: Firestore = getDb();
export const auth: Auth = getAuthInstance();

export default getFirebaseAppInstance();
