// ============================================================
// 파일: src/lib/diary-utils.ts
// 담당: Part 4
// 역할: DiaryDoc ↔ DiaryData 변환 유틸리티
// ============================================================

import type { DiaryDoc } from '@/types/models';
import type { DiaryData } from '@/types/diary';

/**
 * Firestore DiaryDoc → API DiaryData 변환
 * Timestamp → epoch millis
 */
export function toDiaryData(doc: DiaryDoc): DiaryData {
  return {
    id: doc.id,
    title: doc.title,
    entries: doc.entries,
    createdAt: doc.createdAt.toMillis(),
    shareToken: doc.shareToken,
  };
}
