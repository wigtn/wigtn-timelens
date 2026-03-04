// ============================================================
// 파일: src/components/AudioVisualizer.tsx
// 담당: Part 2
// 역할: 오디오 상태별 파형 시각화 (idle/listening/speaking/generating)
// 출처: part2-curator-ui.md §3.8
// ============================================================

'use client';

import { useRef, useEffect } from 'react';
import type { AudioVisualizerProps } from '@/types/components';
import type { AudioState } from '@/types/common';

const BAR_COUNT = 20;

function getBarHeight(state: AudioState, audioLevel: number, index: number): number {
  switch (state) {
    case 'idle':
      return 2;
    case 'listening': {
      const wave = Math.sin((index / BAR_COUNT) * Math.PI * 2 + Date.now() / 200);
      return 2 + audioLevel * 20 * (0.5 + 0.5 * Math.abs(wave));
    }
    case 'speaking': {
      const aiWave = Math.sin((index / BAR_COUNT) * Math.PI * 3 + Date.now() / 150);
      return 4 + 16 * (0.5 + 0.5 * Math.abs(aiWave));
    }
    case 'generating':
      return 2;
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
      <div className="flex items-center justify-center h-8 gap-2">
        <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">생성 중...</span>
      </div>
    );
  }

  const barColorClass =
    state === 'listening'
      ? 'bg-blue-400'
      : state === 'speaking'
        ? 'bg-purple-400'
        : 'bg-gray-600';

  return (
    <div ref={containerRef} className="flex items-center justify-center h-8 gap-[2px] px-6">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-colors duration-75 ${barColorClass}`}
          style={{ height: '2px' }}
        />
      ))}
    </div>
  );
}
