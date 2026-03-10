// ============================================================
// LanguageSelector — 세션 시작 전 언어 선택
// ============================================================

'use client';

import type { Locale } from '@shared/i18n';
import { cn } from '@web/lib/utils';

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

interface LanguageSelectorProps {
  onSelect: (locale: Locale) => void;
}

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950">
      {/* Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15 blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-timelens-gold/20 to-timelens-bronze/10
                        border border-timelens-gold/20 flex items-center justify-center">
          <span className="text-2xl">🌐</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight">
            TimeLens
          </h1>
          <p className="text-sm text-gray-400 text-center">
            Select your language / 언어를 선택하세요
          </p>
        </div>

        {/* Language buttons */}
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className={cn(
                'flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200',
                'glass border border-white/[0.08] hover:border-timelens-gold/30',
                'active:scale-[0.98]',
              )}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-lg font-medium text-white">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
