// ============================================================
// 파일: src/types/models.ts
// Part 5가 정의, Part 1/3/4가 읽기/쓰기
// 출처: shared-contract.md §G
// ============================================================

import { Timestamp, GeoPoint } from 'firebase/firestore';
import type {
  HeritageCategory,
  ArtifactCategory,
  Material,
  Civilization,
} from './common';
import type { DiaryEntry } from './diary';

// --- Collection: sessions ---
export interface SessionDoc {
  id: string;
  userId: string;
  language: string;
  status: 'active' | 'paused' | 'completed';
  liveApiSessionId?: string;
  contextSnapshot?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

// --- Collection: sessions/{sessionId}/visits ---
export interface VisitDoc {
  id: string;
  itemName: string;
  location: GeoPoint;
  venueName?: string;
  recognizedAt: Timestamp;
  conversationSummary: string;
  restorationImageUrl?: string;
  userPhotoUrl?: string;
  metadata: {
    era?: string;
    category: HeritageCategory;
    artifactType?: ArtifactCategory;
    material?: Material;
    civilization?: Civilization;
    damageDescription?: string;
    searchGroundingSources?: string[];
  };
}

// --- Collection: diaries ---
export interface DiaryDoc {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: Timestamp;
  shareToken?: string;
}

// --- Firestore 경로 상수 ---
export const COLLECTIONS = {
  SESSIONS: 'sessions',
  VISITS: 'visits',        // sessions/{sessionId}/visits
  DIARIES: 'diaries',
} as const;
