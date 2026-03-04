// ============================================================
// 파일: src/app/page.tsx
// 담당: Part 2
// 역할: 랜딩/온보딩 페이지 — 앱 소개 + CTA
// 출처: part2-curator-ui.md §3.2
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();

  const handleStart = () => {
    setIsStarting(true);
    router.push('/session');
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black px-6">
      {/* Logo */}
      <h1 className="text-4xl font-heading font-bold text-white">
        TimeLens
      </h1>
      <p className="text-lg text-gray-400 mt-2">
        AI Cultural Heritage Companion
      </p>

      {/* Feature highlights */}
      <div className="mt-12 space-y-4 w-full max-w-sm">
        <FeatureRow icon="🏛️" text="실시간 유물 인식" />
        <FeatureRow icon="🎨" text="AI 유물 복원" />
        <FeatureRow icon="🧭" text="주변 유산 발견" />
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        disabled={isStarting}
        className="mt-12 w-full max-w-sm py-4 bg-white text-black rounded-2xl
                   font-semibold text-lg hover:bg-gray-100 transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isStarting ? '시작 중...' : '시작하기 →'}
      </button>

      {/* Permission notice */}
      <p className="text-sm text-gray-500 mt-4 text-center">
        카메라와 마이크 권한이 필요합니다
      </p>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-gray-800/50 rounded-xl">
      <span className="text-2xl" role="img" aria-hidden="true">
        {icon}
      </span>
      <span className="text-gray-200 font-medium">{text}</span>
    </div>
  );
}
