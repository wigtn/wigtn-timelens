// ============================================================
// 파일: src/components/AgentIndicator.tsx
// 담당: Part 2
// 역할: 글래스 헤더 — 박물관 이름 + LIVE 배지 + 에이전트 전환
// ============================================================

'use client';

import type { AgentIndicatorProps } from '@shared/types/components';
import type { AgentType } from '@shared/types/common';
import { cn } from '@web/lib/utils';

const AGENT_META: Record<AgentType, { icon: string; label: string; accent: string }> = {
  curator:     { icon: '🏛', label: 'Curator',     accent: 'text-timelens-gold' },
  restoration: { icon: '🎨', label: 'Restoration', accent: 'text-amber-400' },
  discovery:   { icon: '🧭', label: 'Discovery',   accent: 'text-blue-400' },
  diary:       { icon: '📖', label: 'Diary',       accent: 'text-yellow-400' },
};

export default function AgentIndicator({
  activeAgent,
  switchData,
  isTransitioning,
}: AgentIndicatorProps) {
  const meta = AGENT_META[activeAgent];

  return (
    <div className="flex items-center justify-between">
      {/* Agent label */}
      <div
        className={cn(
          'flex items-center gap-2 transition-all duration-500 ease-out',
          isTransitioning ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0 animate-agent-morph',
        )}
      >
        <span className="text-base" role="img" aria-label={meta.label}>
          {meta.icon}
        </span>
        <span className={cn('text-xs font-semibold tracking-wide uppercase', meta.accent)}>
          {meta.label}
        </span>
      </div>

      {/* LIVE badge */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live-pulse" />
        <span className="text-[10px] font-bold tracking-wider text-red-400 uppercase">
          LIVE
        </span>
      </div>

      {/* Transition overlay */}
      {isTransitioning && switchData && (
        <div className="absolute inset-0 flex items-center justify-center z-10 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
            <span className="text-sm">{AGENT_META[switchData.from].icon}</span>
            <span className="text-gray-500 text-xs">→</span>
            <span className="text-sm">{AGENT_META[switchData.to].icon}</span>
            <span className="text-[10px] text-gray-400">{switchData.reason}</span>
          </div>
        </div>
      )}
    </div>
  );
}
