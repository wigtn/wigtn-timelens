// ============================================================
// 파일: src/components/RestorationResult.tsx
// 담당: Part 3
// 역할: 복원 결과 표시 컨테이너 (상태 머신: idle/loading/ready/error)
//       로딩 프로그레스 시뮬레이션 + 크로스페이드 전환
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import type { RestorationUIState } from '@shared/types/restoration';
import { BeforeAfterSlider } from '@web/components/BeforeAfterSlider';
import { useT } from '@web/lib/i18n';

export interface RestorationResultProps {
  state: RestorationUIState;
  onRetry?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onClose?: () => void;
}

export function RestorationResult({
  state,
  onRetry,
  onSave,
  onShare,
  onClose,
}: RestorationResultProps) {
  const { t } = useT();
  // --- 로딩 프로그레스 시뮬레이션 ---
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  useEffect(() => {
    if (state.status !== 'loading') {
      setSimulatedProgress(0);
      return;
    }

    // 0→80%: 빠르게 (0-5초), 80→95%: 느리게 (5-15초), 95%에서 멈춤
    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev < 80) return prev + 4;
        if (prev < 95) return prev + 0.75;
        return prev;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [state.status]);

  // --- 크로스페이드 전환 (loading → ready) ---
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (state.status === 'ready') {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 50);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // idle → 렌더링 없음
  if (state.status === 'idle') {
    return null;
  }

  // loading → 미니멀 스트립
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-2 py-2 animate-[fadeInUp_0.4s_ease-out_forwards]">
        <div className="flex items-center gap-2.5 px-1">
          {/* 얇은 회전 링 */}
          <div style={{
            width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
            border: '1.5px solid rgba(212,165,116,0.18)',
            borderTopColor: 'rgba(212,165,116,0.85)',
            animation: 'tl-spin 0.85s linear infinite',
          }} />
          <span
            className="text-[11px] font-medium truncate flex-1"
            style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}
          >
            {state.artifactName}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: 'rgba(212,165,116,0.6)' }}>
            {state.era}
          </span>
        </div>
        {/* 앰버 shimmer 프로그레스 바 */}
        <div
          className="mx-1 rounded-full overflow-hidden relative"
          style={{ height: 2, background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${simulatedProgress}%`,
              background: 'linear-gradient(90deg, rgba(212,165,116,0.45), rgba(212,165,116,0.9))',
              transition: 'width 0.28s ease-out',
            }}
          />
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '35%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            animation: 'tl-shimmer 2s ease-in-out infinite',
          }} />
        </div>
        <style>{`
          @keyframes tl-spin { to { transform: rotate(360deg); } }
          @keyframes tl-shimmer {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(450%); }
          }
        `}</style>
      </div>
    );
  }

  // error → 에러 메시지 + 재시도 버튼
  if (state.status === 'error') {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 text-center">
        <p className="text-red-400 font-semibold mb-2">
          {t('restoration.failed')}
        </p>
        <p className="text-sm text-gray-400 mb-4">{state.error}</p>
        {state.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
          >
            {t('restoration.retry')}
          </button>
        )}
      </div>
    );
  }

  // ready → BeforeAfterSlider
  return (
    <div
      className={`flex flex-col gap-3 transition-opacity duration-[400ms] ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 헤더: 유물명 + 닫기 */}
      <div className="flex items-center justify-between px-0.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white leading-snug truncate">
            {state.data.artifactName}
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(212,165,116,0.75)' }}>
            {state.data.era}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ml-2"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
            aria-label="Close restoration result"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      <BeforeAfterSlider
        beforeImage={state.data.referenceImageUrl ?? ''}
        afterImage={state.data.imageUrl}
        artifactName={state.data.artifactName}
        era={state.data.era}
        description={state.data.description}
        onSave={onSave ?? (() => {})}
      />
    </div>
  );
}
