// ============================================================
// 파일: src/components/AgentIndicator.tsx
// 담당: Part 2
// 역할: 현재 활성 에이전트 표시 + 전환 애니메이션
// 출처: part2-curator-ui.md §3.9
// ============================================================

'use client';

import type { AgentIndicatorProps } from '@shared/types/components';
import type { AgentType } from '@shared/types/common';

const AGENT_META: Record<AgentType, { icon: string; label: string; color: string }> = {
  curator:     { icon: '🤖', label: 'Curator Agent',     color: 'text-green-400' },
  restoration: { icon: '🎨', label: 'Restoration Agent', color: 'text-orange-400' },
  discovery:   { icon: '🧭', label: 'Discovery Agent',   color: 'text-blue-400' },
  diary:       { icon: '📖', label: 'Diary Agent',       color: 'text-yellow-400' },
};

export default function AgentIndicator({
  activeAgent,
  switchData,
  isTransitioning,
}: AgentIndicatorProps) {
  const meta = AGENT_META[activeAgent];

  return (
    <div className="px-4 py-2">
      <div
        className={`flex items-center gap-2 transition-all duration-500 ease-in-out
          ${isTransitioning ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}
      >
        <span className="text-lg" role="img" aria-label={meta.label}>
          {meta.icon}
        </span>
        <span className={`text-sm font-medium ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {isTransitioning && switchData && (
        <div className="flex items-center gap-2 mt-1 animate-fade-in">
          <span className="text-lg">{AGENT_META[switchData.from].icon}</span>
          <span className="text-gray-500">→</span>
          <span className="text-lg">{AGENT_META[switchData.to].icon}</span>
          <span className="text-xs text-gray-400 ml-1">{switchData.reason}</span>
        </div>
      )}
    </div>
  );
}
