// ============================================================
// 파일: src/web/components/AgentIndicator.tsx
// 역할: 글래스 헤더 — LIVE 배지 + 에이전트 전환
// ============================================================

'use client';

import type { AgentIndicatorProps } from '@shared/types/components';
import type { AgentType } from '@shared/types/common';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';

function getAgentMeta(agent: AgentType, locale: Locale) {
  const meta: Record<AgentType, { icon: string; labelKey: 'agent.curator' | 'agent.restoration' | 'agent.discovery' | 'agent.diary'; accent: string }> = {
    curator:     { icon: '🏛', labelKey: 'agent.curator',     accent: 'text-timelens-gold' },
    restoration: { icon: '🎨', labelKey: 'agent.restoration', accent: 'text-amber-400' },
    discovery:   { icon: '🧭', labelKey: 'agent.discovery',   accent: 'text-blue-400' },
    diary:       { icon: '📖', labelKey: 'agent.diary',       accent: 'text-yellow-400' },
  };
  const m = meta[agent];
  return { icon: m.icon, label: t(m.labelKey, locale), accent: m.accent };
}

export default function AgentIndicator({
  activeAgent,
  switchData,
  isTransitioning,
  locale = 'ko',
}: AgentIndicatorProps) {
  const meta = getAgentMeta(activeAgent, locale);

  return (
    <div className="flex items-center justify-between">
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

      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-live-pulse" />
        <span className="text-[10px] font-bold tracking-wider text-red-400 uppercase">
          LIVE
        </span>
      </div>

      {isTransitioning && switchData && (
        <div className="absolute inset-0 flex items-center justify-center z-10 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
            <span className="text-sm">{getAgentMeta(switchData.from, locale).icon}</span>
            <span className="text-gray-500 text-xs">→</span>
            <span className="text-sm">{getAgentMeta(switchData.to, locale).icon}</span>
            <span className="text-[10px] text-gray-400">{switchData.reason}</span>
          </div>
        </div>
      )}
    </div>
  );
}
