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

  // loading → 프로그레스 바 + 시뮬레이션
  if (state.status === 'loading') {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6">
        {/* 펄스 점 3개 */}
        <div className="flex gap-2 justify-center mb-4">
          <div
            className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"
            style={{ animationDelay: '200ms' }}
          />
          <div
            className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"
            style={{ animationDelay: '400ms' }}
          />
        </div>

        {/* 복원 시대 표시 */}
        <p className="text-center text-sm text-gray-300 mb-3">
          {t('restoration.restoringTo')}{' '}
          <span className="text-amber-400 font-semibold">{state.era}</span>
          ...
        </p>

        {/* 프로그레스 바 */}
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${simulatedProgress}%` }}
          />
        </div>

        {/* 유물 이름 */}
        <p className="text-center text-xs text-gray-500">
          {state.artifactName}
        </p>
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
      className={`flex flex-col gap-4 transition-opacity duration-[400ms] ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            {state.data.artifactName}
          </h3>
          <p className="text-sm text-gray-300">
            {t('restoration.restored')} {state.data.era}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors shrink-0 mt-0.5"
            aria-label="Close restoration result"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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
        onShare={onShare ?? (() => {})}
      />
    </div>
  );
}
