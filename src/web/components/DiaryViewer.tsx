// ============================================================
// 파일: src/components/DiaryViewer.tsx
// 담당: Part 4
// 역할: 다이어리 뷰어 (텍스트 + 이미지 인터리브)
// 출처: part4-discovery-diary.md §2.9
// ============================================================

'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import Image from 'next/image';
import { ArrowLeft, Share2, Check, Loader2 } from 'lucide-react';
import { cn } from '@web/lib/utils';
import type { DiaryData, DiaryEntry } from '@shared/types/diary';

export interface DiaryViewerProps {
  diary: DiaryData;
  onShare?: () => Promise<string>;
  onClose?: () => void;
}

function renderMarkdownText(text: string): React.JSX.Element[] {
  const lines = text.split('\n');
  const elements: React.JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={i}
          className="text-lg font-serif font-semibold text-stone-700 mt-4 mb-2"
        >
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={i}
          className="text-xl font-serif font-bold text-stone-800 mt-6 mb-3"
        >
          {line.slice(2)}
        </h2>
      );
    } else {
      // 인라인 볼드 처리
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={i} className="text-base leading-relaxed text-stone-700 mb-3">
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="font-semibold text-stone-800">
                {part}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    }
  }

  return elements;
}

const DiaryEntryView = memo(function DiaryEntryView({ entry }: { entry: DiaryEntry }) {
  const [imageError, setImageError] = useState(false);

  if (entry.type === 'text') {
    return <>{renderMarkdownText(entry.content)}</>;
  }

  if (entry.type === 'image' && !imageError) {
    return (
      <div className="relative my-6 w-full aspect-square">
        <Image
          src={entry.content}
          alt={entry.siteName ?? '삽화'}
          fill
          className="rounded-xl shadow-md object-contain"
          sizes="(max-width: 640px) 100vw, 640px"
          unoptimized
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return null;
});

export default function DiaryViewer({ diary, onShare, onClose }: DiaryViewerProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const sortedEntries = useMemo(
    () => [...diary.entries].sort((a, b) => a.order - b.order),
    [diary.entries]
  );

  const handleShare = useCallback(async () => {
    if (!onShare) return;
    setIsSharing(true);
    try {
      const shareUrl = await onShare();

      if (navigator.share) {
        await navigator.share({
          title: diary.title,
          text: `TimeLens 박물관 다이어리: ${diary.title}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  }, [diary.title, onShare]);

  const formattedDate = new Date(diary.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        {onClose ? (
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-stone-100 active:bg-stone-200"
            aria-label="닫기"
          >
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <h1 className="text-sm font-medium text-stone-600 truncate mx-4">다이어리</h1>
        {onShare ? (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className={cn(
              'p-2 -mr-2 rounded-full hover:bg-stone-100 active:bg-stone-200',
              isSharing && 'opacity-50'
            )}
            aria-label="공유"
          >
            {isSharing ? (
              <Loader2 className="w-5 h-5 text-stone-500 animate-spin" />
            ) : shareCopied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Share2 className="w-5 h-5 text-stone-700" />
            )}
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* 다이어리 내용 */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-8">
        {/* 제목 영역 */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-stone-900 leading-tight">
            {diary.title}
          </h2>
          <p className="text-sm text-stone-500 mt-2">{formattedDate}</p>
          <div className="w-12 h-px bg-stone-300 mt-4" />
        </div>

        {/* 엔트리 */}
        {sortedEntries.length === 0 ? (
          <p className="text-center text-stone-400 py-12">
            다이어리 내용이 없습니다
          </p>
        ) : (
          sortedEntries.map((entry) => (
            <DiaryEntryView key={entry.order} entry={entry} />
          ))
        )}

        {/* 하단 여백 */}
        <div className="h-8" />
      </div>
    </div>
  );
}
