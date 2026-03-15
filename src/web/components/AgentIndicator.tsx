// ============================================================
// 파일: src/web/components/AgentIndicator.tsx
// 역할: 헤더 — Gemini 브랜딩 + 에이전트 표시 (중앙 정렬)
// ============================================================

'use client';

import type { AgentIndicatorProps } from '@shared/types/components';
import type { AgentType } from '@shared/types/common';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';

function getAgentMeta(agent: AgentType, locale: Locale) {
  const meta: Record<AgentType, {
    icon: string;
    labelKey: 'agent.curator' | 'agent.restoration' | 'agent.discovery' | 'agent.diary';
    color: string;
    dotColor: string;
  }> = {
    curator:     { icon: '🏛', labelKey: 'agent.curator',     color: '#D4A574', dotColor: '#D4A574' },
    restoration: { icon: '🎨', labelKey: 'agent.restoration', color: '#FBBF24', dotColor: '#FBBF24' },
    discovery:   { icon: '🧭', labelKey: 'agent.discovery',   color: '#60A5FA', dotColor: '#60A5FA' },
    diary:       { icon: '📖', labelKey: 'agent.diary',       color: '#A78BFA', dotColor: '#A78BFA' },
  };
  const m = meta[agent];
  return { icon: m.icon, label: t(m.labelKey, locale), color: m.color, dotColor: m.dotColor };
}

export default function AgentIndicator({
  activeAgent,
  switchData,
  isTransitioning,
  locale = 'ko',
}: AgentIndicatorProps) {
  const meta = getAgentMeta(activeAgent, locale);

  return (
    <div className="relative flex items-center justify-center">

      {/* LIVE 배지 */}
      <div
        className={cn(
          'relative overflow-hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-500 ease-out',
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
        )}
        style={{
          background: 'rgba(212,165,116,0.08)',
          border: `1px solid rgba(212,165,116,0.28)`,
        }}
      >
        {/* shimmer sweep */}
        <div
          className="absolute inset-0 -translate-x-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.12), transparent)',
            animation: 'live-badge-shimmer 3s ease-in-out infinite',
          }}
        />
        {/* 상태별 펄스 닷 */}
        <span className="relative flex h-[6px] w-[6px]">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-55"
            style={{ background: meta.dotColor }}
          />
          <span
            className="relative inline-flex rounded-full h-[6px] w-[6px]"
            style={{ background: meta.dotColor }}
          />
        </span>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: meta.dotColor }}>
          LIVE
        </span>
      </div>

      <style>{`
        @keyframes live-badge-shimmer {
          0%   { transform: translateX(-100%); }
          30%  { transform: translateX(300%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      {/* 에이전트 전환 오버레이 */}
      {isTransitioning && switchData && (
        <div className="absolute inset-0 flex items-center justify-center z-10 animate-fade-in">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] text-gray-400"
            style={{ background: 'rgba(15,11,7,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {switchData.reason}
          </div>
        </div>
      )}
    </div>
  );
}
