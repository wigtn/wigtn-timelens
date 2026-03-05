// ============================================================
// 파일: src/lib/firebase/auth.ts
// 담당: Part 5
// 역할: Firebase Anonymous Auth 유틸리티
// ============================================================

import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getAuthInstance, isFirebaseConfigured } from './config';

/**
 * 익명 로그인 수행
 *
 * 이미 로그인된 경우 기존 사용자를 반환.
 * 최초 방문 시 새 익명 UID를 생성.
 * Firebase 미설정 시 에러를 throw.
 *
 * @returns Firebase User 객체
 * @throws 네트워크 오류 또는 Firebase 설정 오류 시
 */
export async function signInAnonymous(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Set environment variables in .env.local');
  }

  const auth = getAuthInstance();

  // 이미 로그인된 사용자가 있으면 반환
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

/**
 * 현재 로그인된 사용자의 UID를 반환
 *
 * @returns UID 문자열 또는 null (미로그인 또는 미설정 시)
 */
export function getCurrentUserId(): string | null {
  if (!isFirebaseConfigured()) return null;
  return getAuthInstance().currentUser?.uid ?? null;
}

/**
 * 인증 상태 변경 리스너 등록
 *
 * @param callback 사용자 상태 변경 시 호출되는 콜백
 * @returns unsubscribe 함수
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getAuthInstance(), callback);
}

/**
 * 인증 상태가 준비될 때까지 대기
 *
 * @returns 현재 사용자 또는 null
 */
export function waitForAuth(): Promise<User | null> {
  if (!isFirebaseConfigured()) {
    return Promise.resolve(null);
  }

  const auth = getAuthInstance();
  return new Promise((resolve) => {
    if (auth.currentUser !== undefined) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
