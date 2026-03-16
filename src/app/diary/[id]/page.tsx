// ============================================================
// 파일: src/app/diary/[id]/page.tsx
// 담당: Part 4
// 역할: 다이어리 뷰어 — sessionStorage 우선, Firestore 폴백
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getDiary } from '@back/lib/firebase/firestore';
import { toDiaryData } from '@back/lib/diary-utils';
import DiaryShareClient from './diary-share-client';
import type { DiaryData } from '@shared/types/diary';

export default function DiaryPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [diary, setDiary] = useState<DiaryData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1) sessionStorage 캐시 우선
    try {
      const cached = sessionStorage.getItem(`diary_${id}`);
      if (cached) {
        setDiary(JSON.parse(cached) as DiaryData);
        return;
      }
    } catch { /* ignore */ }

    // 2) Firestore 폴백 (공유 링크 접근 등)
    getDiary(id)
      .then((doc) => {
        if (doc) setDiary(toDiaryData(doc));
        else setError(true);
      })
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-400 text-sm">다이어리를 찾을 수 없습니다.</p>
      </main>
    );
  }

  if (!diary) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 rounded-full border-2 border-timelens-gold/30 border-t-timelens-gold animate-spin" />
      </main>
    );
  }

  return <DiaryShareClient diary={diary} />;
}
