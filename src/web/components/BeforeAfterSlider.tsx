// ============================================================
// 파일: src/components/BeforeAfterSlider.tsx
// 담당: Part 3
// 역할: Before/After 인터랙티브 비교 슬라이더
//       직접 DOM 조작으로 60fps 보장, React 리렌더 없음
// ============================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BeforeAfterSliderProps } from '@shared/types/components';
import { useT } from '@web/lib/i18n';

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  artifactName,
  era,
  description,
  onSave,
  hideSaveButton,
  fillContainer,
}: BeforeAfterSliderProps) {
  const { t } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeImageRef = useRef<HTMLImageElement>(null);
  const sliderLineRef = useRef<HTMLDivElement>(null);
  const sliderHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const containerRectRef = useRef<DOMRect | null>(null);
  const positionRef = useRef(50);
  // aria-valuenow는 드래그 종료 시에만 업데이트 (리렌더 최소화)
  const [ariaValue, setAriaValue] = useState(50);
  const [_isInitialAnimation, setIsInitialAnimation] = useState(true);

  // 슬라이더 위치를 DOM에 직접 적용 — React 리렌더 없음
  const applyPosition = useCallback((pct: number, transition?: string) => {
    positionRef.current = pct;
    if (sliderLineRef.current) {
      sliderLineRef.current.style.transition = transition ?? 'none';
      sliderLineRef.current.style.left = `${pct}%`;
    }
    if (beforeImageRef.current) {
      beforeImageRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    }
  }, []);

  // 입장 애니메이션 (1회)
  useEffect(() => {
    const steps = [
      { pos: 30, delay: 0 },
      { pos: 70, delay: 600 },
      { pos: 50, delay: 1200 },
    ];
    const timeouts = steps.map(({ pos, delay }) =>
      setTimeout(() => applyPosition(pos, 'left 0.4s ease-in-out'), delay),
    );
    timeouts.push(setTimeout(() => setIsInitialAnimation(false), 1500));
    return () => timeouts.forEach(clearTimeout);
  // applyPosition은 안정적 useCallback — 의도적으로 한 번만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 드래그 시작
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      if (containerRef.current) {
        containerRectRef.current = containerRef.current.getBoundingClientRect();
      }
    },
    [],
  );

  // 드래그 이동 — window 리스너로 등록, DOM 직접 조작
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !containerRectRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const pct = Math.max(
        0,
        Math.min(
          100,
          ((clientX - containerRectRef.current.left) / containerRectRef.current.width) * 100,
        ),
      );
      applyPosition(pct);
    },
    [applyPosition],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setAriaValue(Math.round(positionRef.current));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const onEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // 키보드 접근성
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let pos = positionRef.current;
      if (e.key === 'ArrowLeft') { e.preventDefault(); pos = Math.max(0, pos - 5); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pos = Math.min(100, pos + 5); }
      else return;
      applyPosition(pos);
      setAriaValue(Math.round(pos));
    },
    [applyPosition],
  );

  return (
    <div className={`flex flex-col gap-3 animate-[restorationReveal_0.55s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0${fillContainer ? ' h-full' : ''}`}>
      {/* 슬라이더 컨테이너 */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-2xl select-none${fillContainer ? ' flex-1 min-h-0' : ' aspect-[16/9]'}`}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,165,116,0.12)' }}
      >
        {/* Layer 1: After 이미지 (전체) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterImage}
          alt={`${artifactName} - restored`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Layer 2: Before 이미지 — clipPath는 ref로 직접 제어 */}
        {beforeImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={beforeImageRef}
            src={beforeImage}
            alt={`${artifactName} - current`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ clipPath: 'inset(0 50% 0 0)' }}
            draggable={false}
          />
        )}

        {/* Layer 3: 슬라이더 라인 + 핸들 */}
        {beforeImage && (
          <div
            ref={sliderLineRef}
            className="absolute top-0 bottom-0 w-0.5 z-10"
            style={{
              left: '50%',
              background: 'rgba(212,165,116,0.75)',
              boxShadow: '0 0 8px rgba(212,165,116,0.45)',
            }}
          >
            <div
              ref={sliderHandleRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
              style={{
                background: 'rgba(13,10,7,0.92)',
                border: '1.5px solid rgba(212,165,116,0.65)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.6), 0 0 12px rgba(212,165,116,0.25)',
              }}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={ariaValue}
              aria-label="Before/After comparison slider"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 8L1 5M4 8L1 11M4 8H12M12 8L15 5M12 8L15 11"
                  stroke="rgba(212,165,116,0.85)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}

        {/* 라벨 */}
        {beforeImage && (
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <span
              className="text-[10px] font-semibold text-white/70 px-2 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            >
              {t('restoration.now')}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{
              background: 'rgba(15,11,7,0.7)',
              backdropFilter: 'blur(6px)',
              color: '#D4A574',
              border: '1px solid rgba(212,165,116,0.3)',
            }}
          >
            {era}
          </span>
        </div>

        {/* 터치/마우스 이벤트 캡처 레이어 */}
        {beforeImage && (
          <div
            className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          />
        )}
      </div>

      {/* 복원 설명 */}
      {description && (
        <p
          className="text-[12px] leading-relaxed px-1 line-clamp-3"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {description}
        </p>
      )}

      {/* 저장 버튼 */}
      {!hideSaveButton && (
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(212,165,116,0.12)',
            border: '1px solid rgba(212,165,116,0.28)',
            color: '#D4A574',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {t('session.save')}
        </button>
      )}
      <style>{`
        @keyframes restorationReveal {
          0% { opacity: 0; transform: translateY(24px) scale(0.96); filter: blur(4px); }
          60% { opacity: 1; filter: blur(0px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
        }
      `}</style>
    </div>
  );
}
