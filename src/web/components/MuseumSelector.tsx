// ============================================================
// 파일: src/web/components/MuseumSelector.tsx
// 역할: 박물관 선택 온보딩 화면
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MapPin, Search, Globe, Loader2, Star, ArrowLeft, Landmark } from 'lucide-react';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';
import type { MuseumContext } from '@shared/types/live-session';

interface MuseumInfo {
  id: string;
  name: string;
  address?: string;
  location: { lat: number; lng: number };
  distanceMeters?: number;
  distance?: number;
  photoUrl?: string;
  rating?: number;
  openNow?: boolean;
  isOpen?: boolean;
  type?: string;
}

interface MuseumSelectorProps {
  userLocation: { lat: number; lng: number } | null;
  onSelect: (museum: MuseumContext) => void;
  onSkip: () => void;
  onBack?: () => void;
  locale?: Locale;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ── Shimmer 스켈레톤 (2열 카드형) ────────────────────────────
function MuseumCardSkeleton() {
  return (
    <div className="relative rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden">
      {/* shimmer sweep */}
      <div
        className="absolute inset-0 z-10 animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)',
        }}
      />
      {/* 이미지 영역 */}
      <div className="w-full h-[104px] bg-white/[0.07]" />
      {/* 텍스트 영역 */}
      <div className="p-2.5 flex flex-col gap-2">
        <div className="h-3 bg-white/[0.09] rounded-full w-4/5" />
        <div className="h-2.5 bg-white/[0.06] rounded-full w-3/5" />
        <div className="h-2.5 bg-white/[0.05] rounded-full w-2/5" />
      </div>
    </div>
  );
}

// ── 2열 카드 (세로 레이아웃) ──────────────────────────────────
function MuseumCard({
  museum,
  onClick,
  locale = 'ko',
}: {
  museum: MuseumInfo;
  onClick: () => void;
  locale?: Locale;
}) {
  const dist = museum.distanceMeters ?? museum.distance ?? 0;
  const isOpen = museum.openNow ?? museum.isOpen;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white/[0.04] hover:bg-white/[0.08] rounded-xl
                 border border-white/[0.08] hover:border-white/[0.16]
                 transition-all duration-200 active:scale-[0.97] overflow-hidden"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)' }}
    >
      {/* 이미지 영역 — 고정 높이 */}
      <div className="relative w-full h-[104px] bg-white/[0.06]">
        {museum.photoUrl ? (
          <Image
            src={museum.photoUrl}
            alt={museum.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Landmark className="w-8 h-8 text-gray-600" />
          </div>
        )}
        {/* 영업 상태 뱃지 */}
        {isOpen !== undefined && (
          <span
            className={cn(
              'absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              isOpen
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30',
            )}
          >
            {isOpen ? t('museum.open', locale) : t('museum.closed', locale)}
          </span>
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="p-2.5 flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2">{museum.name}</h3>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {dist > 0 && (
            <span className="text-[10px] text-gray-500">{formatDistance(dist)}</span>
          )}
          {museum.rating && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
              <Star className="w-2.5 h-2.5 fill-amber-400" />
              {museum.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MuseumSelector({
  userLocation,
  onSelect,
  onSkip,
  onBack,
  locale = 'ko',
}: MuseumSelectorProps) {
  const [nearbyMuseums, setNearbyMuseums] = useState<MuseumInfo[]>([]);
  const [searchResults, setSearchResults] = useState<MuseumInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // 최초 페칭 완료 여부 — fetch 이전에도 스켈레톤을 보여주기 위해 사용
  const [nearbyFetched, setNearbyFetched] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyError, setNearbyError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
        // 모든 상태를 같은 콜백에서 업데이트 → 단일 렌더로 처리
        if (data.success) setNearbyMuseums(data.data?.museums ?? []);
        else setNearbyError(true);
        setIsLoadingNearby(false);
        setNearbyFetched(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setNearbyError(true);
        setIsLoadingNearby(false);
        setNearbyFetched(true);
      });

    return () => controller.abort();
  }, [userLocation]);

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/museums/search?q=${encodeURIComponent(searchQuery.trim())}&lang=${locale}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data?.museums ?? []);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, locale]);

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

  // 스켈레톤 표시 조건: 아직 페칭이 완료되지 않았고 에러가 없는 경우
  // userLocation을 기다리지 않고 마운트 즉시 표시
  const showNearbySkeletons = !nearbyFetched && !nearbyError;

  return (
    <div className="fixed inset-0 bg-canvas flex flex-col pt-safe-top pb-safe-bottom">
      {/* 배경 glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
      />

      {/* ── 1. 헤더 + 검색창 (고정) ── */}
      <div
        className={cn(
          'relative z-10 w-full max-w-sm mx-auto px-6 pt-24 pb-4 shrink-0',
          'transition-all duration-700 ease-out',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        {/* 좌: 뒤로가기 / 우: 자유탐험 skip */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.06]
                       flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-gray-400" />
          </button>
        )}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-full
                     text-xs text-gray-400 hover:text-gray-200
                     bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07]
                     transition-all duration-200"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{t('museum.skip', locale)}</span>
        </button>

        {/* 워드마크 */}
        <div className="text-center animate-char-in" style={{ animationDuration: '0.6s' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 9vw, 2.9rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: '#D4A574',
              textShadow: '0 0 40px rgba(212,165,116,0.25)',
            }}
          >
            TimeLens
          </h1>

          {/* 장식선 */}
          <div className="flex items-center justify-center gap-3 mt-3.5">
            <div
              className="h-px w-12 animate-line-in"
              style={{ background: 'linear-gradient(to right, transparent, rgba(212,165,116,0.4))' }}
            />
            <div className="animate-line-in w-1 h-1 rounded-full bg-timelens-gold/50" />
            <div
              className="h-px w-12 animate-line-in"
              style={{ background: 'linear-gradient(to left, transparent, rgba(212,165,116,0.4))' }}
            />
          </div>

          {/* 서브타이틀 */}
          <p
            className="animate-subtitle-in mt-2.5 text-xs tracking-[0.18em] uppercase"
            style={{ color: 'rgba(180,145,100,0.65)' }}
          >
            {t('museum.title', locale)}
          </p>
        </div>

        {/* 현재 위치 라벨 — 검색 결과가 없을 때만 표시 */}
        {userLocation && !searchResults.length && (
          <div className="mt-4 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-timelens-gold" />
            <span className="text-xs text-gray-400">{t('museum.nearbyLabel', locale)}</span>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('museum.searchPlaceholder', locale)}
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
      </div>

      {/* ── 2. 박물관 리스트 (스크롤) ── */}
      <div className="relative z-10 flex-1 min-h-0 w-full max-w-sm mx-auto px-4">
        {/* 상단 페이드 */}
        <div
          className="pointer-events-none absolute top-0 left-4 right-4 h-5 z-20"
          style={{ background: 'linear-gradient(to bottom, #0F0B07 0%, transparent 100%)' }}
        />
        {/* 하단 페이드 */}
        <div
          className="pointer-events-none absolute bottom-0 left-4 right-4 h-10 z-20"
          style={{ background: 'linear-gradient(to top, #0F0B07 0%, transparent 100%)' }}
        />

        <div
          className="h-full overflow-y-auto px-2 pt-1 pb-6"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(212,165,116,0.35) transparent',
          }}
        >
          {/* 내 주변 그룹 */}
          {!searchResults.length && (
            <div className="mb-2">

              {/* 스켈레톤 — 페칭 전 / 페칭 중 */}
              {showNearbySkeletons && (
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((i) => <MuseumCardSkeleton key={i} />)}
                </div>
              )}

              {/* 에러 */}
              {nearbyError && !isLoadingNearby && (
                <p className="text-xs text-gray-500 text-center py-6">
                  {t('museum.nearbyEmpty', locale)}
                </p>
              )}

              {/* 결과 */}
              {nearbyFetched && nearbyMuseums.length > 0 && (
                <div className="grid grid-cols-2 gap-2 animate-[fade-in_0.25s_ease-out]">
                  {nearbyMuseums.map((museum) => (
                    <MuseumCard
                      key={museum.id}
                      museum={museum}
                      onClick={() => selectMuseum(museum)}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 검색 결과 그룹 */}
          {(searchResults.length > 0 || isSearching) && (
            <div className="mb-2">
              <div
                className="sticky top-0 z-10 py-2 mb-3"
                style={{ background: 'linear-gradient(to bottom, #0F0B07 70%, transparent 100%)' }}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                bg-white/[0.07] border border-white/[0.10]">
                  <Search className="w-3.5 h-3.5 text-timelens-gold" />
                  <span className="text-xs text-gray-300 font-medium">{t('museum.searchResults', locale)}</span>
                </div>
              </div>

              {isSearching && (
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((i) => <MuseumCardSkeleton key={i} />)}
                </div>
              )}

              {!isSearching && (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.map((museum) => (
                    <MuseumCard
                      key={museum.id}
                      museum={museum}
                      onClick={() => selectMuseum(museum)}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
