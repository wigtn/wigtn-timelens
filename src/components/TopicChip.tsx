// ============================================================
// 파일: src/components/TopicChip.tsx
// 담당: Part 2
// 역할: 탭 가능한 토픽 칩 버튼
// 출처: part2-curator-ui.md §3.10
// ============================================================

'use client';

import type { TopicChip as TopicChipType } from '@/types/live-session';
import { cn } from '@/lib/utils';

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
        'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
        isSelected
          ? 'bg-white text-black shadow-lg shadow-white/20'
          : 'bg-white/10 text-gray-200 hover:bg-white/20 active:bg-white/30',
      )}
      aria-pressed={isSelected}
    >
      {topic.label}
    </button>
  );
}
