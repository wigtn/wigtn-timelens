// ============================================================
// 파일: src/app/diary/[id]/diary-share-client.tsx
// 담당: Part 4
// 역할: 다이어리 공유 페이지 클라이언트 래퍼
// ============================================================

'use client';

import { useCallback } from 'react';
import DiaryViewer from '@web/components/DiaryViewer';
import type { DiaryData } from '@shared/types/diary';

interface Props {
  diary: DiaryData;
}

export default function DiaryShareClient({ diary }: Props) {
  const handleShare = useCallback(async () => {
    return `${window.location.origin}/diary/${diary.id}`;
  }, [diary.id]);

  return (
    <main className="h-screen">
      <DiaryViewer diary={diary} onShare={handleShare} />
    </main>
  );
}
