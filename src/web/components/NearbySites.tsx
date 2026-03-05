// ============================================================
// 파일: src/components/NearbySites.tsx
// 담당: Part 4
// 역할: 주변 유적지 리스트
// 출처: part4-discovery-diary.md §2.7
// ============================================================

'use client';

import { MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@web/lib/utils';
import NearbyCard from './NearbyCard';
import type { NearbyPlace } from '@shared/types/discovery';

export interface NearbySitesProps {
  sites: NearbyPlace[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSiteTap?: (place: NearbyPlace) => void;
}

export default function NearbySites({
  sites,
  isLoading,
  error,
  onRetry,
  onSiteTap,
}: NearbySitesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-white/60">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">주변 문화유산 검색 중...</span>
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
            다시 시도
          </button>
        )}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-white/50">
        <MapPin className="w-6 h-6" />
        <p className="text-sm">주변에 문화유산이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-white/80 px-1">
        주변 문화유산 ({sites.length}곳)
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
