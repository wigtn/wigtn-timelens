// ============================================================
// 파일: src/app/page.tsx
// 담당: Part 2
// 역할: 랜딩/온보딩 페이지 — 앱 소개 + CTA
// 출처: part2-curator-ui.md §3.2
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Compass, BookOpen, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: Camera,
    title: '실시간 유물 인식',
    desc: '카메라를 비추면 AI가 유물을 인식하고 음성으로 설명합니다',
    color: 'from-amber-500/20 to-amber-600/5',
    iconColor: 'text-amber-400',
  },
  {
    icon: Sparkles,
    title: 'AI 유물 복원',
    desc: '손상된 유물의 원래 모습을 AI가 복원합니다',
    color: 'from-violet-500/20 to-violet-600/5',
    iconColor: 'text-violet-400',
  },
  {
    icon: Compass,
    title: '주변 유산 발견',
    desc: '현재 위치 기반으로 주변 문화유산을 추천합니다',
    color: 'from-emerald-500/20 to-emerald-600/5',
    iconColor: 'text-emerald-400',
  },
  {
    icon: BookOpen,
    title: '방문 다이어리',
    desc: 'AI가 당신의 방문을 감성적인 다이어리로 기록합니다',
    color: 'from-sky-500/20 to-sky-600/5',
    iconColor: 'text-sky-400',
  },
] as const;

export default function LandingPage() {
  const [isStarting, setIsStarting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStart = () => {
    setIsStarting(true);
    router.push('/session');
  };

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-30 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #8B6914 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-15 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, #4A7C59 0%, transparent 70%)',
            animation: 'float 12s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6 py-12">
        {/* Logo + Title */}
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          {/* Lens icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-timelens-gold/20 to-timelens-bronze/20 border border-timelens-gold/30 flex items-center justify-center mb-6 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full border-2 border-timelens-gold/60 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-timelens-gold/40" />
            </div>
          </div>

          <h1 className="text-5xl font-heading font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white via-timelens-gold to-white bg-clip-text text-transparent">
              TimeLens
            </span>
          </h1>
          <p className="text-base text-gray-400 mt-3 tracking-wide">
            AI Cultural Heritage Companion
          </p>
        </div>

        {/* Feature cards */}
        <div className="mt-10 space-y-3">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex items-start gap-4 px-4 py-4 rounded-2xl bg-gradient-to-r ${feature.color}
                border border-white/[0.06] backdrop-blur-sm
                transition-all duration-500 ease-out`}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: `${200 + i * 100}ms`,
              }}
            >
              <div className={`mt-0.5 ${feature.iconColor}`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div
          className="mt-10 transition-all duration-500 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '700ms',
          }}
        >
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="w-full py-4 rounded-2xl font-semibold text-lg
              bg-gradient-to-r from-timelens-gold to-timelens-bronze text-black
              hover:brightness-110 active:scale-[0.98] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-timelens-gold/20"
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                시작 중...
              </span>
            ) : (
              '시작하기'
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Mic className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-xs text-gray-500">
              카메라와 마이크 권한이 필요합니다
            </p>
          </div>
        </div>

        {/* Powered by badge */}
        <div
          className="mt-8 flex items-center justify-center gap-2 transition-all duration-500"
          style={{
            opacity: mounted ? 1 : 0,
            transitionDelay: '900ms',
          }}
        >
          <span className="text-[10px] text-gray-600 tracking-widest uppercase">
            Powered by Gemini
          </span>
        </div>
      </div>

    </div>
  );
}
