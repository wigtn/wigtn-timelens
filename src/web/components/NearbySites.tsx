// ============================================================
// 파일: src/web/components/NearbySites.tsx
// 역할: 주변 유적지 리스트
// ============================================================

'use client';

import { MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';
import NearbyCard from './NearbyCard';
import type { NearbyPlace } from '@shared/types/discovery';

export interface NearbySitesProps {
  sites: NearbyPlace[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSiteTap?: (place: NearbyPlace) => void;
  locale?: Locale;
}

export default function NearbySites({
  sites,
  isLoading,
  error,
  onRetry,
  onSiteTap,
  locale = 'ko',
}: NearbySitesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-white/60">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('nearby.loading', locale)}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-red-300">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-white/10 rounded-full text-white/80 active:bg-white/20"
          >
            {t('nearby.retry', locale)}
          </button>
        )}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-white/50">
        <MapPin className="w-6 h-6" />
        <p className="text-sm">{t('nearby.empty', locale)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-white/80 px-1">
        {t('nearby.title', locale)} ({sites.length})
      </h2>
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory',
          'scrollbar-none -mx-4 px-4'
        )}
      >
        {sites.map((site, i) => (
          <NearbyCard
            key={site.id}
            place={site}
            index={i}
            onTap={onSiteTap}
          />
        ))}
      </div>
    </div>
  );
}
