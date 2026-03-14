// ============================================================
// 파일: src/web/components/OnboardingSplash.tsx
// 역할: 박물관 선택 후 세션 연결 중 표시되는 스플래시
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';

const PHASE_MSGS: Record<string, string[]> = {
  ko: ['AI 큐레이터 준비 중', '문화유산 데이터 연결 중', '음성 채널 개통 중', '거의 다 됐어요'],
  en: ['Waking up AI Curator', 'Connecting heritage data', 'Opening audio channel', 'Almost ready'],
  ja: ['AIキュレーターを起動中', '文化遺産データに接続中', '音声チャンネルを開通中', 'もうすぐです'],
  zh: ['唤醒AI策展人', '连接文化遗产数据', '开通语音频道', '马上就好'],
  hi: ['AI क्यूरेटर तैयार हो रहे हैं', 'डेटा से जुड़ रहे हैं', 'ऑडियो चैनल खुल रहा है', 'लगभग तैयार'],
};

const PHASE_WIDTHS = [8, 36, 64, 82];

interface OnboardingSplashProps {
  museumName?: string;
  museumPhotoUrl?: string;
  isConnected: boolean;
  onRetry: () => void;
  onDone: () => void;
  locale?: Locale;
}

export default function OnboardingSplash({
  museumName,
  museumPhotoUrl,
  isConnected,
  onRetry,
  onDone,
  locale = 'ko',
}: OnboardingSplashProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const [readyToTransition, setReadyToTransition] = useState(false);
  const [connected, setConnected] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // ref 가드: 중복 실행 방지 + onDone 안정 참조
  const doneCalledRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 2500),
      setTimeout(() => setPhase(2), 5200),
      setTimeout(() => setPhase(3), 8500),
      setTimeout(() => setReadyToTransition(true), 2000),
      setTimeout(() => setShowRetry(true), 15000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // isConnected + readyToTransition → 화면 전환
  // setConnected(true)가 리렌더를 유발해 cleanup이 타이머를 취소하는 버그 방지:
  // doneCalledRef로 단일 실행 보장 + deps에서 connected 제거
  useEffect(() => {
    if (isConnected && readyToTransition && !doneCalledRef.current) {
      doneCalledRef.current = true;
      setConnected(true);
      // cleanup 없이 setTimeout 사용 → 리렌더로 인한 취소 없음
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => onDoneRef.current(), 500);
      }, 700);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, readyToTransition]);

  const msgs = PHASE_MSGS[locale] ?? PHASE_MSGS.ko;
  const progressWidth = connected ? 100 : PHASE_WIDTHS[Math.min(phase, 3)];

  const connectedLabel =
    locale === 'ko' ? '연결 완료' :
    locale === 'ja' ? '接続完了' :
    locale === 'zh' ? '连接成功' :
    locale === 'hi' ? 'कनेक्ट हो गया' :
    'Connected';

  const greeting = museumName
    ? locale === 'en'
      ? `${t('splash.welcomeTo', locale)}${museumName}`
      : `${museumName}${t('splash.welcomeTo', locale)}`
    : t('splash.welcomeDefault', locale);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500',
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-[#07050a]" />
      {museumPhotoUrl ? (
        <>
          <div
            className="absolute inset-0 scale-105"
            style={{
              backgroundImage: `url(${museumPhotoUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(8px)',
            }}
          />
          {/* 어둡게 + 하단 페이드 */}
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.5) 100%)',
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,165,116,0.12) 0%, rgba(123,94,167,0.06) 50%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(7,5,10,0.8) 0%, rgba(7,5,10,0.45) 45%, rgba(7,5,10,0.92) 100%)',
            }}
          />
        </>
      )}

      {/* 메인 콘텐츠 */}
      <div
        className={cn(
          'relative z-10 flex flex-col items-center px-8 w-full max-w-sm transition-all duration-700',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}
      >
        {/* 아이콘 영역 */}
        <div className="relative flex items-center justify-center mb-8">
          {/* 광선 — 천천히 회전하는 conic 광선, 블러로 스모그처럼 */}
          <div
            className="absolute animate-spin"
            style={{
              width: 260, height: 260,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(155,114,203,0.07) 12%, transparent 25%, rgba(66,133,244,0.05) 45%, transparent 58%, rgba(155,114,203,0.08) 75%, transparent 88%)',
              filter: 'blur(22px)',
              animationDuration: '14s',
            }}
          />

          {/* 중심 소프트 글로우 */}
          <div
            className="absolute rounded-full"
            style={{
              width: 140, height: 140,
              background: 'radial-gradient(circle, rgba(155,114,203,0.32) 0%, rgba(66,133,244,0.14) 50%, transparent 100%)',
              filter: 'blur(20px)',
            }}
          />

          {/* 궤도 트랙 (흐릿한 정적 링) */}
          <div
            className="absolute rounded-full"
            style={{
              width: 92, height: 92,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />

          {/* Gemini 혜성 스피너 — 밝은 헤드 + 짧은 발광 꼬리 */}
          <div
            className="absolute animate-spin"
            style={{
              width: 92, height: 92,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 68%, rgba(155,114,203,0.15) 76%, rgba(66,133,244,0.55) 84%, rgba(180,210,255,0.95) 90%, rgba(255,255,255,1) 93%, rgba(66,133,244,0.4) 97%, transparent 100%)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
              animationDuration: '1.1s',
              animationTimingFunction: 'linear',
            }}
          />

          {/* 렌즈 아이콘 */}
          <div
            className="relative"
            style={{
              width: 56, height: 56,
              borderRadius: 15,
              background: 'rgba(212,165,116,0.07)',
              border: '1px solid rgba(212,165,116,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1.5px solid rgba(212,165,116,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'rgba(212,165,116,0.6)',
                  boxShadow: '0 0 8px rgba(212,165,116,0.4)',
                }}
              />
            </div>

            {/* Gemini 배지 */}
            <div
              className="absolute -bottom-2 -right-2 w-[22px] h-[22px] rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(66,133,244,0.25), rgba(155,114,203,0.25))',
                border: '1px solid rgba(155,114,203,0.4)',
                boxShadow: '0 0 10px rgba(155,114,203,0.45)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 28 28" fill="none">
                <defs>
                  <linearGradient id="gem-badge" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4285F4" />
                    <stop offset="55%" stopColor="#9B72CB" />
                    <stop offset="100%" stopColor="#D96570" />
                  </linearGradient>
                </defs>
                <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="url(#gem-badge)" />
              </svg>
            </div>
          </div>
        </div>

        {/* Gemini Live 뱃지 */}
        <div className="flex items-center gap-2 mb-7">
          <div
            className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(66,133,244,0.1), rgba(155,114,203,0.12))',
              border: '1px solid rgba(155,114,203,0.28)',
            }}
          >
            {/* shimmer sweep */}
            <div
              className="absolute inset-0 -translate-x-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
                animation: 'badge-shimmer 2.4s ease-in-out infinite',
              }}
            />
            <svg width="12" height="12" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="gem-pill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="55%" stopColor="#9B72CB" />
                  <stop offset="100%" stopColor="#D96570" />
                </linearGradient>
              </defs>
              <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="url(#gem-pill)" />
            </svg>
            <span
              className="relative text-[11px] font-semibold tracking-wide"
              style={{
                background: 'linear-gradient(90deg, #4285F4, #9B72CB)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Gemini Live
            </span>
          </div>
        </div>

        {/* 박물관 정보 */}
        <div className="text-center mb-8 px-4">
          {museumName ? (
            <>
              {locale === 'en' && (
                <p className="text-xs text-gray-500 mb-1">{t('splash.welcomeTo', locale).trim()}</p>
              )}
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight break-words">
                {museumName}
              </h1>
              {locale !== 'en' && (
                <p className="text-xs text-gray-400 mt-1">{t('splash.welcomeTo', locale).trim()}</p>
              )}
            </>
          ) : (
            <h1 className="text-xl font-bold text-white tracking-tight leading-snug">
              {greeting}
            </h1>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {t('splash.subtitle', locale)}
          </p>
        </div>

        {/* 진행 섹션 */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="h-5 flex items-center justify-center overflow-hidden">
            <span
              key={connected ? 'done' : phase}
              className="text-[13px] text-gray-400 animate-fade-in"
            >
              {connected ? connectedLabel : msgs[Math.min(phase, 3)]}
            </span>
          </div>

          {/* 진행 바 */}
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressWidth}%`,
                background: connected
                  ? 'linear-gradient(90deg, #4285F4, #9B72CB, #D4A574)'
                  : 'linear-gradient(90deg, rgba(212,165,116,0.55), rgba(212,165,116,0.9))',
                transition: connected
                  ? 'width 0.4s ease-out, background 0.4s ease'
                  : 'width 2.4s ease-out',
              }}
            />
          </div>

          {/* 단계 점 */}
          <div className="flex items-center gap-2 mt-0.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === Math.min(phase, 3) && !connected ? 18 : 5,
                  height: 5,
                  background:
                    i < phase || connected
                      ? connected
                        ? 'linear-gradient(90deg, #4285F4, #9B72CB)'
                        : '#D4A574'
                      : i === phase
                        ? '#D4A574'
                        : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Retry */}
        {showRetry && !connected && (
          <div className="flex flex-col items-center gap-3 mt-8 animate-fade-in">
            <span className="text-xs text-gray-500">{t('splash.slow', locale)}</span>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-5 py-2.5 bg-timelens-gold/10 border border-timelens-gold/20
                         rounded-full text-sm text-timelens-gold font-medium active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
              {t('splash.retry', locale)}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes badge-shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(300%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
