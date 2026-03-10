// ============================================================
// 파일: src/components/TopicChip.tsx
// 담당: Part 2
// 역할: 탭 가능한 토픽 칩 — 골드 악센트
// ============================================================

'use client';

import type { TopicChip as TopicChipType } from '@shared/types/live-session';
import { cn } from '@web/lib/utils';

interface TopicChipProps {
  topic: TopicChipType;
  isSelected?: boolean;
  onTap: () => void;
}

export default function TopicChip({ topic, isSelected = false, onTap }: TopicChipProps) {
  return (
    <button
      onClick={onTap}
      className={cn(
        'inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap',
        'transition-all duration-200 border',
        isSelected
          ? 'bg-timelens-gold/20 text-timelens-gold border-timelens-gold/30 shadow-sm shadow-timelens-gold/10'
          : 'bg-white/[0.04] text-gray-300 border-white/[0.06] hover:bg-white/[0.08] active:scale-95',
      )}
      aria-pressed={isSelected}
    >
      {topic.label}
    </button>
  );
}
