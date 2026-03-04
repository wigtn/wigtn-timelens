// ============================================================
// 파일: src/components/BeforeAfterSlider.tsx
// 담당: Part 3
// 역할: Before/After 인터랙티브 비교 슬라이더
//       clip-path 방식, 60fps rAF, 터치/마우스/키보드 지원
// ============================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BeforeAfterSliderProps } from '@/types/components';

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  artifactName,
  era,
  description,
  onSave,
  onShare,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const isDraggingRef = useRef(false);
  const containerRectRef = useRef<DOMRect | null>(null);
  const [isInitialAnimation, setIsInitialAnimation] = useState(true);

  // --- 입장 애니메이션 ---
  useEffect(() => {
    if (!isInitialAnimation) return;

    const timeline = [
      { position: 30, delay: 0 },
      { position: 70, delay: 600 },
      { position: 50, delay: 1200 },
    ];

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (const step of timeline) {
      timeouts.push(
        setTimeout(() => setSliderPosition(step.position), step.delay),
      );
    }
    timeouts.push(
      setTimeout(() => setIsInitialAnimation(false), 1500),
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isInitialAnimation]);

  // --- 드래그 이벤트 핸들링 ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      if (containerRef.current) {
        containerRectRef.current =
          containerRef.current.getBoundingClientRect();
      }
    },
    [],
  );

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !containerRectRef.current) return;

    const clientX =
      'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = clientX - containerRectRef.current.left;
    const percentage = Math.max(
      0,
      Math.min(100, (relativeX / containerRectRef.current.width) * 100),
    );

    requestAnimationFrame(() => {
      setSliderPosition(percentage);
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // 글로벌 이벤트 리스너
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

  // --- 키보드 접근성 ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 5));
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* 슬라이더 컨테이너 */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square overflow-hidden rounded-xl select-none"
      >
        {/* Layer 1: After 이미지 (전체) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterImage}
          alt={`${artifactName} - restored`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Layer 2: Before 이미지 (clip으로 잘림) */}
        {beforeImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={beforeImage}
            alt={`${artifactName} - current`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
            draggable={false}
          />
        )}

        {/* Layer 3: 슬라이더 라인 + 핸들 (참조 이미지 있을 때만) */}
        {beforeImage && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{
            left: `${sliderPosition}%`,
            transition: isInitialAnimation
              ? 'left 0.4s ease-in-out'
              : 'none',
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPosition)}
            aria-label="Before/After comparison slider"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-700"
            >
              <path
                d="M4 8L1 5M4 8L1 11M4 8H12M12 8L15 5M12 8L15 11"
                stroke="currentColor"
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
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded z-20 pointer-events-none">
            Now
          </div>
        )}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded z-20 pointer-events-none">
          {era}
        </div>

        {/* 터치/마우스 이벤트 캡처 레이어 (참조 이미지 있을 때만) */}
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
        <p className="text-sm text-gray-300 px-1 line-clamp-3">
          {description}
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors text-sm"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save
        </button>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors text-sm"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}
