// ============================================================
// 파일: src/components/AudioVisualizer.tsx
// 담당: Part 2
// 역할: 오디오 상태별 파형 시각화 — 골드 그라데이션 바
// ============================================================

'use client';

import { useRef, useEffect } from 'react';
import type { AudioVisualizerProps } from '@shared/types/components';
import type { AudioState } from '@shared/types/common';

const BAR_COUNT = 24;

function getBarHeight(state: AudioState, audioLevel: number, index: number): number {
  switch (state) {
    case 'idle':
      return 2;
    case 'listening': {
      const wave = Math.sin((index / BAR_COUNT) * Math.PI * 2 + Date.now() / 200);
      return 2 + audioLevel * 24 * (0.5 + 0.5 * Math.abs(wave));
    }
    case 'speaking': {
      const aiWave = Math.sin((index / BAR_COUNT) * Math.PI * 3 + Date.now() / 150);
      return 4 + 20 * (0.5 + 0.5 * Math.abs(aiWave));
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

export default function AudioVisualizer({ state, audioLevel = 0 }: AudioVisualizerProps) {
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
      <div className="flex items-center justify-center h-6 gap-2">
        <div className="w-4 h-4 border-2 border-timelens-gold/40 border-t-timelens-gold rounded-full animate-spin" />
        <span className="text-[10px] text-gray-500 tracking-wide">생성 중</span>
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
