// ============================================================
// 파일: src/lib/firebase/firestore.ts
// 담당: Part 5
// 역할: Firestore CRUD 유틸리티
// 출처: shared-contract.md §G (Firestore 데이터 모델)
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  GeoPoint,
  type FirestoreDataConverter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type { SessionDoc, VisitDoc, DiaryDoc } from '@/types/models';

// ──────────────────────────────────────────────────────────
// Typed Converters (type assertion 제거)
// ──────────────────────────────────────────────────────────

function createConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}

const sessionConverter = createConverter<SessionDoc>();
const visitConverter = createConverter<VisitDoc>();
const diaryConverter = createConverter<DiaryDoc>();

// ──────────────────────────────────────────────────────────
// Sessions
// ──────────────────────────────────────────────────────────

/**
 * 새 세션 문서 생성
 *
 * @param sessionId 세션 ID (API Route에서 생성)
 * @param data 세션 데이터 (id, createdAt, updatedAt, expiresAt 제외)
 * @returns 생성된 SessionDoc
 */
export async function createSession(
  sessionId: string,
  data: {
    userId: string;
    language: string;
    liveApiSessionId?: string;
  }
): Promise<SessionDoc> {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 TTL
  );

  const sessionDoc: SessionDoc = {
    id: sessionId,
    userId: data.userId,
    language: data.language,
    status: 'active',
    liveApiSessionId: data.liveApiSessionId,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await setDoc(doc(db, 'sessions', sessionId), sessionDoc);
  return sessionDoc;
}

/**
 * 세션 문서 조회
 */
export async function getSession(
  sessionId: string
): Promise<SessionDoc | null> {
  const ref = doc(db, 'sessions', sessionId).withConverter(sessionConverter);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

/**
 * 세션 상태 업데이트
 */
export async function updateSession(
  sessionId: string,
  data: Partial<
    Pick<
      SessionDoc,
      'status' | 'liveApiSessionId' | 'contextSnapshot'
    >
  >
): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 사용자의 활성 세션 조회
 */
export async function getActiveSession(
  userId: string
): Promise<SessionDoc | null> {
  const q = query(
    collection(db, 'sessions').withConverter(sessionConverter),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

// ──────────────────────────────────────────────────────────
// Visits (세션 하위 컬렉션)
// ──────────────────────────────────────────────────────────

/**
 * 방문 기록 추가
 *
 * @param sessionId 부모 세션 ID
 * @param visitId 방문 ID
 * @param data 방문 데이터 (id, recognizedAt 제외)
 */
export async function addVisit(
  sessionId: string,
  visitId: string,
  data: Omit<VisitDoc, 'id' | 'recognizedAt'>
): Promise<VisitDoc> {
  const visitDoc: VisitDoc = {
    ...data,
    id: visitId,
    recognizedAt: Timestamp.now(),
  };

  await setDoc(
    doc(db, 'sessions', sessionId, 'visits', visitId),
    visitDoc
  );
  return visitDoc;
}

/**
 * 세션의 모든 방문 기록 조회 (시간순)
 */
export async function getVisits(
  sessionId: string
): Promise<VisitDoc[]> {
  const q = query(
    collection(db, 'sessions', sessionId, 'visits').withConverter(visitConverter),
    orderBy('recognizedAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * 방문 기록 업데이트 (복원 이미지 URL 추가 등)
 */
export async function updateVisit(
  sessionId: string,
  visitId: string,
  data: Partial<Pick<VisitDoc, 'restorationImageUrl' | 'userPhotoUrl' | 'conversationSummary'>>
): Promise<void> {
  await updateDoc(
    doc(db, 'sessions', sessionId, 'visits', visitId),
    data
  );
}

/**
 * 세션의 방문 수 조회
 */
export async function getVisitCount(
  sessionId: string
): Promise<number> {
  const { getCountFromServer } = await import('firebase/firestore');
  const snapshot = await getCountFromServer(
    collection(db, 'sessions', sessionId, 'visits')
  );
  return snapshot.data().count;
}

// ──────────────────────────────────────────────────────────
// Diaries
// ──────────────────────────────────────────────────────────

/**
 * 다이어리 생성
 */
export async function createDiary(
  diaryId: string,
  data: Omit<DiaryDoc, 'id' | 'createdAt'>
): Promise<DiaryDoc> {
  const diaryDoc: DiaryDoc = {
    ...data,
    id: diaryId,
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'diaries', diaryId), diaryDoc);
  return diaryDoc;
}

/**
 * 다이어리 조회
 */
export async function getDiary(
  diaryId: string
): Promise<DiaryDoc | null> {
  const ref = doc(db, 'diaries', diaryId).withConverter(diaryConverter);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

/**
 * 공유 토큰으로 다이어리 조회 (공개 공유 링크용)
 */
export async function getDiaryByShareToken(
  shareToken: string
): Promise<DiaryDoc | null> {
  const q = query(
    collection(db, 'diaries').withConverter(diaryConverter),
    where('shareToken', '==', shareToken),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

/**
 * 사용자의 모든 다이어리 조회
 */
export async function getUserDiaries(
  userId: string
): Promise<DiaryDoc[]> {
  const q = query(
    collection(db, 'diaries').withConverter(diaryConverter),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * 다이어리에 공유 토큰 설정
 */
export async function setDiaryShareToken(
  diaryId: string,
  shareToken: string
): Promise<void> {
  await updateDoc(doc(db, 'diaries', diaryId), { shareToken });
}

// ──────────────────────────────────────────────────────────
// 유틸리티
// ──────────────────────────────────────────────────────────

/**
 * 고유 ID 생성 (Firestore auto-id 호환)
 * phantom collection '_'에 doc ref를 생성하여 auto-ID만 추출. 실제 데이터는 기록되지 않음.
 */
export function generateId(): string {
  return doc(collection(db, '_')).id;
}

/**
 * GeoPoint 생성 헬퍼
 */
export function createGeoPoint(lat: number, lng: number): GeoPoint {
  return new GeoPoint(lat, lng);
}
