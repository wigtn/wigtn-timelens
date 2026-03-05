// ============================================================
// 파일: src/components/NearbyCard.tsx
// 담당: Part 4
// 역할: 유적지 카드 UI
// 출처: part4-discovery-diary.md §2.8
// ============================================================

'use client';

import { useCallback, memo } from 'react';
import Image from 'next/image';
import { MapPin, Clock, Star, Navigation } from 'lucide-react';
import { cn } from '@web/lib/utils';
import { formatDistance } from '@back/lib/geo/places';
import type { NearbyPlace } from '@shared/types/discovery';

export interface NearbyCardProps {
  place: NearbyPlace;
  index: number;
  onTap?: (place: NearbyPlace) => void;
}

const NearbyCard = memo(function NearbyCard({ place, index, onTap }: NearbyCardProps) {
  const handleTap = useCallback(() => {
    if (onTap) {
      onTap(place);
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`;
      window.open(url, '_blank', 'noopener');
    }
  }, [onTap, place]);

  return (
    <button
      onClick={handleTap}
      className={cn(
        'flex-shrink-0 w-64 snap-start rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md',
        'border border-white/20 text-left transition-all active:scale-[0.97]',
        'animate-[fadeInUp_0.4s_ease-out_forwards] opacity-0'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* 사진 */}
      {place.photoUrl ? (
        <div className="relative h-32 w-full overflow-hidden">
          <Image
            src={place.photoUrl}
            alt={place.name}
            fill
            className="object-cover"
            sizes="256px"
            unoptimized
          />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-stone-400" />
        </div>
      )}

      {/* 정보 */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-white truncate">{place.name}</h3>
          <p className="text-xs text-white/60 truncate">{place.type}</p>
        </div>

        {place.description && (
          <p className="text-xs text-white/70 line-clamp-2">{place.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-white/80">
          <span className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {formatDistance(place.distance)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {place.walkingTime}분
          </span>
          {place.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {place.rating.toFixed(1)}
            </span>
          )}
        </div>

        {place.isOpen !== undefined && (
          <span
            className={cn(
              'inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
              place.isOpen
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            )}
          >
            {place.isOpen ? '영업 중' : '영업 종료'}
          </span>
        )}
      </div>
    </button>
  );
});

export default NearbyCard;
