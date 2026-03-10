// ============================================================
// 파일: src/web/components/OnboardingSplash.tsx
// 역할: 박물관 선택 후 세션 연결 중 표시되는 스플래시
// Phase 3: 온보딩 스플래시
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@web/lib/utils';

interface OnboardingSplashProps {
  museumName?: string;
  museumPhotoUrl?: string;
  isConnected: boolean;
  onRetry: () => void;
}

export default function OnboardingSplash({
  museumName,
  museumPhotoUrl,
  isConnected,
  onRetry,
}: OnboardingSplashProps) {
  const [mounted, setMounted] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [elapsedText, setElapsedText] = useState('');
  const [readyToTransition, setReadyToTransition] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Minimum display time (2s) + connected → fade out
  useEffect(() => {
    const minTimer = setTimeout(() => {
      setReadyToTransition(true);
    }, 2000);
    return () => clearTimeout(minTimer);
  }, []);

  // When both connected and min time passed → trigger fade out
  useEffect(() => {
    if (isConnected && readyToTransition) {
      setFadeOut(true);
    }
  }, [isConnected, readyToTransition]);

  // Show "연결 중..." after 5s, retry after 15s
  useEffect(() => {
    const t1 = setTimeout(() => setElapsedText('연결 중...'), 5000);
    const t2 = setTimeout(() => setShowRetry(true), 15000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const greeting = museumName
    ? `${museumName}에 오신 것을 환영합니다`
    : '탐험을 시작합니다';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500',
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      {/* Background: museum photo or gradient */}
      {museumPhotoUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: `url(${museumPhotoUrl})` }}
        />
      ) : (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      {/* Content */}
      <div
        className={cn(
          'relative z-10 flex flex-col items-center gap-6 px-8 transition-all duration-700 ease-out',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
      >
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-timelens-gold/20 to-timelens-bronze/10
                        border border-timelens-gold/20 flex items-center justify-center animate-glow-pulse">
          <span className="text-2xl">🏛</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight text-center">
            TimeLens
          </h1>
          <p className="text-base text-gray-300 text-center leading-relaxed max-w-[260px]">
            {greeting}
          </p>
          <p className="text-sm text-gray-500 text-center mt-1">
            당신만의 AI 큐레이터가 준비되었습니다
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-2 mt-4">
          {!showRetry ? (
            <>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-timelens-gold/60"
                    style={{
                      animation: `typing-dot 1.2s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              {elapsedText && (
                <span className="text-xs text-gray-500 animate-fade-in">{elapsedText}</span>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <span className="text-xs text-gray-500">연결에 시간이 걸리고 있습니다</span>
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-5 py-2.5 bg-timelens-gold/10 border border-timelens-gold/20
                           rounded-full text-sm text-timelens-gold font-medium active:scale-95 transition-transform"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
