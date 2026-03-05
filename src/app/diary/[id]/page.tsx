// ============================================================
// 파일: src/app/diary/[id]/page.tsx
// 담당: Part 4
// 역할: 다이어리 공유 페이지 (SSR)
// 출처: part4-discovery-diary.md §2.6
// ============================================================

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDiary } from '@/lib/firebase/firestore';
import { toDiaryData } from '@/lib/diary-utils';
import DiaryShareClient from './diary-share-client';

// 공유 페이지는 60초마다 ISR 재검증
export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const diary = await getDiary(id);
    if (!diary) {
      return { title: '다이어리를 찾을 수 없습니다 — TimeLens' };
    }

    const firstTextEntry = diary.entries.find((e) => e.type === 'text');
    const description = firstTextEntry
      ? firstTextEntry.content.slice(0, 160)
      : 'TimeLens로 만든 박물관 방문 다이어리';

    return {
      title: `${diary.title} — TimeLens Diary`,
      description,
      openGraph: {
        title: diary.title,
        description,
        type: 'article',
        siteName: 'TimeLens',
      },
    };
  } catch {
    return { title: 'TimeLens Diary' };
  }
}

export default async function DiarySharePage({ params }: Props) {
  const { id } = await params;

  const diaryDoc = await getDiary(id);
  if (!diaryDoc) {
    notFound();
  }

  return <DiaryShareClient diary={toDiaryData(diaryDoc)} />;
}
