// ============================================================
// 파일: src/web/components/RestorationOverlay.tsx
// 역할: 카메라 위 시간여행 복원 오버레이
//       인식 → 로딩(스캔라인) → 복원 이미지 dissolve → 타임라인 슬라이더
// ============================================================
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@web/lib/utils';
import type { RestorationUIState } from '@shared/types/restoration';

export interface RestorationOverlayProps {
  state: RestorationUIState;
  beforeImage: string | null;
}

export function RestorationOverlay({ state, beforeImage: _beforeImage }: RestorationOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const [timelineValue, setTimelineValue] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const isDraggingRef = useRef(false);

  // Loading → scanline 효과
  // Ready → dissolve 전환 (0→100% over 2s) → 타임라인 표시
  useEffect(() => {
    if (state.status === 'ready') {
      // dissolve in
      const step1 = setTimeout(() => setOpacity(1), 100);
      const step2 = setTimeout(() => setTimelineValue(100), 100);
      const step3 = setTimeout(() => setShowTimeline(true), 2500);
      return () => {
        clearTimeout(step1);
        clearTimeout(step2);
        clearTimeout(step3);
      };
    }
    if (state.status === 'idle') {
      setOpacity(0);
      setTimelineValue(0);
      setShowTimeline(false);
    }
  }, [state.status]);

  // 타임라인 드래그 → opacity 조절
  const handleTimelineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTimelineValue(val);
    setOpacity(val / 100);
  }, []);

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // idle → 렌더링 없음
  if (state.status === 'idle') return null;

  const restoredImageUrl = state.status === 'ready' ? state.data.imageUrl : null;
  const artifactName = state.status === 'loading' ? state.artifactName : state.status === 'ready' ? state.data.artifactName : '';
  const era = state.status === 'loading' ? state.era : state.status === 'ready' ? state.data.era : '';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Loading: 스캔라인 이펙트 */}
      {state.status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* 스캔라인 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-scanline" />
          </div>

          {/* 로딩 텍스트 */}
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <p className="text-sm text-white font-medium">
              시간여행 중...
            </p>
            <p className="text-xs text-amber-400">
              {artifactName} → {era}
            </p>
          </div>
        </div>
      )}

      {/* Ready: 복원 이미지 오버레이 */}
      {restoredImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={restoredImageUrl}
          alt={`${artifactName} restored to ${era}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity }}
          draggable={false}
        />
      )}

      {/* Error 상태 */}
      {state.status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-900/60 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="text-sm text-red-300">복원 실패</p>
            <p className="text-xs text-red-400/70 mt-1">{state.error}</p>
          </div>
        </div>
      )}

      {/* 시대 라벨 (복원 이미지 표시 중) */}
      {state.status === 'ready' && opacity > 0.3 && (
        <div className="absolute top-safe-top left-0 right-0 flex justify-center pt-16 pointer-events-none">
          <div
            className={cn(
              'bg-black/60 backdrop-blur-md rounded-full px-5 py-2 transition-opacity duration-500',
              opacity > 0.5 ? 'opacity-100' : 'opacity-0',
            )}
          >
            <p className="text-sm text-white font-medium">
              <span className="text-amber-400">{era}</span>
              <span className="text-gray-400 mx-2">·</span>
              {artifactName}
            </p>
          </div>
        </div>
      )}

      {/* 타임라인 슬라이더 (하단) */}
      {showTimeline && state.status === 'ready' && (
        <div
          className="absolute bottom-28 left-0 right-0 px-6 pointer-events-auto"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>현재</span>
              <span className="text-amber-400 font-medium">{era}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={timelineValue}
              onChange={handleTimelineChange}
              className="w-full h-1.5 appearance-none bg-gray-700 rounded-full outline-none
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
                         [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab
                         [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
          </div>
        </div>
      )}
    </div>
  );
}
