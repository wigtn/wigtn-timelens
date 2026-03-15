// ============================================================
// 파일: src/web/components/RestorationOverlay.tsx
// 역할: 카메라 위 시간여행 복원 오버레이
//       인식 → 로딩(스캔라인) → 복원 이미지 dissolve → 타임라인 슬라이더
// ============================================================
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { t, type Locale } from '@shared/i18n';
import type { RestorationUIState } from '@shared/types/restoration';

export interface RestorationOverlayProps {
  state: RestorationUIState;
  beforeImage: string | null;
  locale?: Locale;
}

export function RestorationOverlay({ state, beforeImage: _beforeImage, locale = 'ko' }: RestorationOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const [timelineValue, setTimelineValue] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [loadingMounted, setLoadingMounted] = useState(false);
  const isDraggingRef = useRef(false);

  // Loading 카드 입장 애니메이션
  useEffect(() => {
    if (state.status === 'loading') {
      const timer = setTimeout(() => setLoadingMounted(true), 50);
      return () => clearTimeout(timer);
    } else {
      setLoadingMounted(false);
    }
  }, [state.status]);

  // Loading → scanline 효과
  // Ready → dissolve 전환 (0→100% over 2s) → 타임라인 표시
  useEffect(() => {
    if (state.status === 'ready') {
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

      {/* ── Loading 상태: 어둠 + 스캔라인 + 하단 텍스트 스트립 ── */}
      {state.status === 'loading' && (
        <div className="absolute inset-0">
          {/* 어둡게 오버레이 */}
          <div className="absolute inset-0" style={{ background: 'rgba(7,5,10,0.52)' }} />

          {/* 스캔라인 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-x-0 h-px animate-scanline"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212,165,116,0.5) 30%, rgba(155,114,203,0.8) 50%, rgba(212,165,116,0.5) 70%, transparent 100%)' }}
            />
          </div>

          {/* 하단 텍스트 스트립 */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2.5"
            style={{
              background: 'rgba(10,8,6,0.82)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(212,165,116,0.12)',
              opacity: loadingMounted ? 1 : 0,
              transform: loadingMounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            {/* 3-dot breathe */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #4285F4, #9B72CB)',
                  animation: `gem-dot-breathe 1.5s ease-in-out ${i * 0.22}s infinite`,
                }}
              />
            ))}
            <span className="text-[11px] text-gray-400 shrink-0">{t('restoration.loading', locale)}</span>
            <span className="text-[11px] text-white/70 truncate flex-1">{artifactName}</span>
            <span className="text-[10px] shrink-0" style={{ color: 'rgba(212,165,116,0.7)' }}>{era}</span>
          </div>
          <style>{`@keyframes gem-dot-breathe{0%,100%{transform:scale(0.55);opacity:0.3}45%{transform:scale(1);opacity:1}}`}</style>
        </div>
      )}

      {/* ── Ready: 복원 이미지 오버레이 ──────────────────────── */}
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

      {/* Error 상태는 헤더에서 처리 — 여기서는 표시 안 함 */}

      {/* ── 시대 라벨 (복원 이미지 표시 중) ────────────────── */}
      {state.status === 'ready' && opacity > 0.2 && (
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 pointer-events-none">
          <div
            className="relative overflow-hidden flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(15,11,7,0.88)',
              border: '1px solid rgba(212,165,116,0.28)',
              boxShadow: '0 0 24px rgba(212,165,116,0.12), 0 0 48px rgba(155,114,203,0.06)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              opacity: opacity > 0.4 ? 1 : 0,
              transform: opacity > 0.4 ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.4,0.64,1)',
            }}
          >
            {/* shimmer 1회 */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                animation: 'rest-shimmer 1.8s ease-out 0.3s 1 forwards',
                transform: 'translateX(-100%)',
              }}
            />
            {/* Gemini 별 */}
            <svg width="10" height="10" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="gem-era" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="55%" stopColor="#9B72CB" />
                  <stop offset="100%" stopColor="#D4A574" />
                </linearGradient>
              </defs>
              <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="url(#gem-era)" />
            </svg>
            <span className="relative text-[11px] font-semibold text-white/90">{artifactName}</span>
            <span className="text-white/20 text-[10px]">·</span>
            <span className="relative text-[11px] font-medium" style={{ color: '#D4A574' }}>{era}</span>
          </div>
        </div>
      )}

      {/* ── 타임라인 슬라이더 (하단) ────────────────────────── */}
      {showTimeline && state.status === 'ready' && (
        <div
          className="absolute bottom-4 left-0 right-0 px-4 pointer-events-auto animate-[fadeInUp_0.5s_ease-out_forwards]"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(15,11,7,0.88)',
              border: '1px solid rgba(212,165,116,0.18)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: '0 0 20px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-500">{t('restoration.now', locale)}</span>
              <span className="font-medium" style={{ color: '#D4A574' }}>{era}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={timelineValue}
              onChange={handleTimelineChange}
              className="w-full h-1.5 appearance-none rounded-full outline-none
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-timelens-gold
                         [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab
                         [&::-webkit-slider-thumb]:active:cursor-grabbing"
              style={{ background: `linear-gradient(to right, rgba(212,165,116,0.8) ${timelineValue}%, rgba(255,255,255,0.1) ${timelineValue}%)` }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes rest-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
