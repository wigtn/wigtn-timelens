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
import { auth } from './config';

/**
 * 익명 로그인 수행
 *
 * 이미 로그인된 경우 기존 사용자를 반환.
 * 최초 방문 시 새 익명 UID를 생성.
 *
 * @returns Firebase User 객체
 * @throws 네트워크 오류 또는 Firebase 설정 오류 시
 */
export async function signInAnonymous(): Promise<User> {
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
 * @returns UID 문자열 또는 null (미로그인 시)
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
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
  return onAuthStateChanged(auth, callback);
}

/**
 * 인증 상태가 준비될 때까지 대기
 *
 * Next.js App Router에서 클라이언트 컴포넌트 마운트 시
 * Firebase Auth가 초기화를 완료할 때까지 기다린다.
 *
 * @returns 현재 사용자 또는 null
 */
export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    if (auth.currentUser !== undefined) {
      // auth가 이미 초기화된 경우
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
