// ============================================================
// 파일: src/components/AudioVisualizer.tsx
// 담당: Part 2
// 역할: 오디오 상태별 파형 시각화 — 골드 그라데이션 바
// ============================================================

'use client';

import { useRef, useEffect } from 'react';
import type { AudioVisualizerProps } from '@shared/types/components';
import type { AudioState } from '@shared/types/common';
import { useT } from '@web/lib/i18n';

const BAR_COUNT = 24;

function getBarHeight(state: AudioState, audioLevel: number, index: number): number {
  switch (state) {
    case 'idle':
      return 2;
    case 'listening': {
      const t = Date.now() / 180;
      const wave = Math.sin((index / BAR_COUNT) * Math.PI * 2.5 + t);
      return 2 + audioLevel * 28 * (0.4 + 0.6 * Math.abs(wave));
    }
    case 'speaking': {
      const t = Date.now() / 110;
      // 중앙 집중형 — 가운데 바가 더 크게
      const center = 1 - Math.abs(index - BAR_COUNT / 2) / (BAR_COUNT / 2) * 0.55;
      const wave1 = Math.sin((index / BAR_COUNT) * Math.PI * 4 + t);
      const wave2 = Math.sin((index / BAR_COUNT) * Math.PI * 2.2 + t * 0.7);
      return 3 + 26 * center * (0.45 + 0.55 * Math.abs(wave1 * 0.65 + wave2 * 0.35));
    }
    case 'generating':
      return 2;
  }
}

function getBarColor(state: AudioState): string {
  switch (state) {
    case 'listening':
      return 'bg-timelens-gold/80';
    case 'speaking':
      return 'bg-gradient-to-t from-timelens-gold to-amber-300';
    default:
      return 'bg-white/20';
  }
}

export default function AudioVisualizer({ state, audioLevel = 0, generatingLabel }: AudioVisualizerProps) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bars = container.children;

    if (state === 'idle' || state === 'generating') {
      for (let i = 0; i < bars.length; i++) {
        (bars[i] as HTMLElement).style.height = '2px';
      }
      return;
    }

    function animate() {
      if (!container) return;
      for (let i = 0; i < bars.length; i++) {
        const height = getBarHeight(state, audioLevel, i);
        (bars[i] as HTMLElement).style.height = `${height}px`;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state, audioLevel]);

  if (state === 'generating') {
    return (
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-xl"
        style={{
          height: 32,
          background: 'rgba(212,165,116,0.06)',
          border: '1px solid rgba(212,165,116,0.22)',
        }}
      >
        {/* 스캐닝 빔 */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          width: '35%',
          background: 'linear-gradient(90deg, transparent, rgba(212,165,116,0.28), transparent)',
          animation: 'di-scan 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
        }} />
        {/* 링 + 텍스트 */}
        <div className="relative z-10 flex items-center gap-2">
          <div style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            border: '1.5px solid rgba(212,165,116,0.2)',
            borderTopColor: '#D4A574',
            animation: 'tl-spin 0.75s linear infinite',
          }} />
          <span style={{ color: 'rgba(212,165,116,0.82)', fontSize: '10px', letterSpacing: '0.06em', fontWeight: 500 }}>
            {generatingLabel ?? t('audio.generating')}
          </span>
        </div>
        <style>{`@keyframes tl-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const barClass = getBarColor(state);

  return (
    <div ref={containerRef} className="flex items-center justify-center h-6 gap-[2px]">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-colors duration-100 ${barClass}`}
          style={{ height: '2px' }}
        />
      ))}
    </div>
  );
}
