// ============================================================
// 파일: src/web/components/MuseumSelector.tsx
// 역할: 박물관 선택 온보딩 화면
// GPS 기반 근처 박물관 리스트 + 텍스트 검색 + 자유 탐험
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MapPin, Search, Globe, Loader2, Star } from 'lucide-react';
import { cn } from '@web/lib/utils';
import type { MuseumContext } from '@shared/types/live-session';

interface MuseumInfo {
  id: string;
  name: string;
  address?: string;
  location: { lat: number; lng: number };
  /** Distance in meters (nearby API uses distanceMeters, search uses distance) */
  distanceMeters?: number;
  distance?: number;
  photoUrl?: string;
  rating?: number;
  /** Open status (nearby API uses isOpen, search uses openNow) */
  openNow?: boolean;
  isOpen?: boolean;
  type?: string;
}

interface MuseumSelectorProps {
  userLocation: { lat: number; lng: number } | null;
  onSelect: (museum: MuseumContext) => void;
  onSkip: () => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function MuseumCard({
  museum,
  onClick,
}: {
  museum: MuseumInfo;
  onClick: () => void;
}) {
  const dist = museum.distanceMeters ?? museum.distance ?? 0;
  const isOpen = museum.openNow ?? museum.isOpen;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl
                 border border-white/[0.06] transition-colors active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{museum.name}</h3>
          {museum.address && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{museum.address}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {dist > 0 && (
              <span className="text-xs text-gray-500">{formatDistance(dist)}</span>
            )}
            {museum.rating && (
              <span className="flex items-center gap-0.5 text-xs text-amber-400">
                <Star className="w-3 h-3 fill-amber-400" />
                {museum.rating.toFixed(1)}
              </span>
            )}
            {isOpen !== undefined && (
              <span className={cn('text-xs', isOpen ? 'text-emerald-400' : 'text-red-400')}>
                {isOpen ? '영업 중' : '영업 종료'}
              </span>
            )}
          </div>
        </div>
        {museum.photoUrl && (
          <Image
            src={museum.photoUrl}
            alt={museum.name}
            width={64}
            height={64}
            className="w-16 h-16 rounded-lg object-cover shrink-0"
            unoptimized
          />
        )}
      </div>
    </button>
  );
}

export default function MuseumSelector({ userLocation, onSelect, onSkip }: MuseumSelectorProps) {
  const [nearbyMuseums, setNearbyMuseums] = useState<MuseumInfo[]>([]);
  const [searchResults, setSearchResults] = useState<MuseumInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyError, setNearbyError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // GPS 기반 근처 박물관 로드
  useEffect(() => {
    if (!userLocation) return;
    const controller = new AbortController();
    setIsLoadingNearby(true);
    setNearbyError(false);

    fetch(`/api/museums/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=2000`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setNearbyMuseums(data.data?.museums ?? []);
        else setNearbyError(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setNearbyError(true);
      })
      .finally(() => setIsLoadingNearby(false));

    return () => controller.abort();
  }, [userLocation]);

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) return;
    setIsSearching(true);

    try {
      const res = await fetch(`/api/museums/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data?.museums ?? []);
    } catch {
      // 검색 실패 시 무시
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const selectMuseum = useCallback((museum: MuseumInfo) => {
    onSelect({
      name: museum.name,
      placeId: museum.id,
      address: museum.address ?? '',
      location: museum.location,
      photoUrl: museum.photoUrl,
      rating: museum.rating,
      openNow: museum.openNow ?? museum.isOpen,
    });
  }, [onSelect]);

  const displayList = searchResults.length > 0 ? searchResults : nearbyMuseums;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center px-6 pt-safe-top pb-safe-bottom overflow-y-auto">
      {/* Background accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
      />

      <div
        className={cn(
          'relative z-10 w-full max-w-sm py-12 transition-all duration-700 ease-out',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        {/* Header */}
        <h1 className="text-2xl font-heading font-bold text-white text-center">
          TimeLens
        </h1>
        <p className="text-base text-gray-300 text-center mt-3">
          오늘 어디를 탐험하시나요?
        </p>

        {/* Search bar */}
        <div className="mt-8 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="박물관 검색..."
            className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-white text-sm
                       placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-timelens-gold/40
                       border border-white/10"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || searchQuery.trim().length < 2}
            className="px-4 py-3 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10
                       transition-colors disabled:opacity-40"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-300" />
            )}
          </button>
        </div>

        {/* Nearby museums list */}
        {userLocation && !searchResults.length && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-timelens-gold" />
              <span className="text-xs text-gray-400 font-medium">현재 위치 기반</span>
            </div>

            {isLoadingNearby && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {nearbyError && !isLoadingNearby && (
              <p className="text-xs text-gray-500 text-center py-6">
                근처 박물관을 찾을 수 없습니다. 검색을 이용해주세요.
              </p>
            )}
          </div>
        )}

        {/* Museum list */}
        {displayList.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-timelens-gold" />
                <span className="text-xs text-gray-400 font-medium">검색 결과</span>
              </div>
            )}
            {displayList.map((museum) => (
              <MuseumCard
                key={museum.id}
                museum={museum}
                onClick={() => selectMuseum(museum)}
              />
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-gray-500">또는</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* Skip button */}
        <button
          onClick={onSkip}
          className="mt-6 w-full py-4 bg-white/[0.06] hover:bg-white/[0.10] rounded-2xl
                     border border-white/[0.08] transition-colors flex items-center justify-center gap-2"
        >
          <Globe className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">박물관 없이 자유 탐험</span>
        </button>
      </div>
    </div>
  );
}
