// ============================================================
// 파일: src/components/CameraView.tsx
// 담당: Part 2
// 역할: 카메라 뷰파인더 + AR 스캔 오버레이 + 인식 피드백
// ============================================================

'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { cn } from '@web/lib/utils';
import type { CameraViewProps } from '@shared/types/components';
import { useCamera } from '@web/hooks/use-camera';
import { useT } from '@web/lib/i18n';

export interface CameraViewRef {
  capturePhoto: () => string;
}

// ── 코너 브래킷 1개 ────────────────────────────────────────

function Corner({
  pos,
  color,
  size,
  thickness,
  glow,
  animDelay,
  scanning,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br';
  color: string;
  size: number;
  thickness: number;
  glow: string;
  animDelay: string;
  scanning: boolean;
}) {
  const border = `${thickness}px solid ${color}`;
  const base: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    boxShadow: glow,
    transition: 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',
    animation: scanning ? `cam-corner-breathe 3s ease-in-out ${animDelay} infinite` : undefined,
  };

  const posStyle: React.CSSProperties =
    pos === 'tl' ? { top: 0, left: 0, borderTop: border, borderLeft: border, borderTopLeftRadius: 4 }
    : pos === 'tr' ? { top: 0, right: 0, borderTop: border, borderRight: border, borderTopRightRadius: 4 }
    : pos === 'bl' ? { bottom: 0, left: 0, borderBottom: border, borderLeft: border, borderBottomLeftRadius: 4 }
    : { bottom: 0, right: 0, borderBottom: border, borderRight: border, borderBottomRightRadius: 4 };

  return <div style={{ ...base, ...posStyle }} />;
}

// ── 스캔 오버레이 전체 ─────────────────────────────────────

function ScanOverlay({ scanning, recognized }: { scanning: boolean; recognized: boolean }) {
  if (!scanning && !recognized) return null;

  const gold = 'rgba(212,165,116,1)';
  const white = 'rgba(255,255,255,0.72)';
  const cornerColor = recognized ? gold : white;
  const cornerSize = recognized ? 22 : 26;
  const cornerThickness = recognized ? 3 : 2;
  const cornerGlow = recognized
    ? '0 0 14px rgba(212,165,116,0.9), 0 0 28px rgba(212,165,116,0.5), 0 0 4px rgba(212,165,116,0.8)'
    : '0 0 6px rgba(255,255,255,0.25)';

  return (
    <>
      {/* ── 스캔 라인 ── */}
      {scanning && !recognized && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 8 }}>
          <div
            style={{
              position: 'absolute', left: 0, right: 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(155,114,203,0.6) 20%, rgba(212,165,116,0.95) 50%, rgba(155,114,203,0.6) 80%, transparent 100%)',
              boxShadow: '0 0 16px 4px rgba(155,114,203,0.35), 0 0 6px 1px rgba(212,165,116,0.3)',
              animation: 'cam-scanline 2.4s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* ── 코너 프레임 ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          zIndex: 9,
          inset: '8%',
          // 인식되면 좁아지며 골드로
          transition: 'inset 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {(['tl', 'tr', 'bl', 'br'] as const).map((pos, i) => (
          <Corner
            key={pos}
            pos={pos}
            color={cornerColor}
            size={cornerSize}
            thickness={cornerThickness}
            glow={cornerGlow}
            animDelay={`${i * 0.18}s`}
            scanning={scanning && !recognized}
          />
        ))}

        {/* 중앙 십자 조준선 (스캔 중) */}
        {scanning && !recognized && (
          <div
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'cam-center-pulse 2.5s ease-in-out infinite',
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: -8, right: -8, height: 1, background: 'rgba(255,255,255,0.3)', transform: 'translateY(-50%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: -8, bottom: -8, width: 1, background: 'rgba(255,255,255,0.3)', transform: 'translateX(-50%)' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(212,165,116,0.7)', margin: 'auto', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          </div>
        )}
      </div>

      {/* ── 인식 완료 피드백 ── */}
      {recognized && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
          {/* 외부 링 — 퍼져나가며 사라짐 */}
          <div
            style={{
              position: 'absolute',
              width: 72, height: 72, borderRadius: '50%',
              border: '1.5px solid rgba(212,165,116,0.7)',
              animation: 'cam-ring-pulse 0.7s ease-out both',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 90, height: 90, borderRadius: '50%',
              border: '1px solid rgba(212,165,116,0.35)',
              animation: 'cam-ring-pulse 0.7s ease-out 0.12s both',
            }}
          />
          {/* 중앙 Gemini 배지 */}
          <div
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(8,6,12,0.88)',
              border: '1.5px solid rgba(212,165,116,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(212,165,116,0.4), 0 0 8px rgba(155,114,203,0.3)',
              animation: 'cam-badge-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="gem-rec" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="55%" stopColor="#9B72CB" />
                  <stop offset="100%" stopColor="#D4A574" />
                </linearGradient>
              </defs>
              <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="url(#gem-rec)" />
            </svg>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cam-scanline {
          0%   { top: -3px; opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes cam-corner-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.1); }
        }
        @keyframes cam-center-pulse {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.75; }
        }
        @keyframes cam-badge-pop {
          from { transform: scale(0.2); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes cam-ring-pulse {
          from { transform: scale(0.7); opacity: 0.9; }
          to   { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────

const CameraView = forwardRef<CameraViewRef, CameraViewProps>(function CameraView(
  { isScanning, isRecognized, isBlurred },
  ref
) {
  const { t } = useT();
  const { stream, isActive, error, startCamera, capturePhoto: capPhoto } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isActive && !error) {
      startCamera();
    }
  }, [isActive, error, startCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useImperativeHandle(
    ref,
    () => ({ capturePhoto: () => capPhoto() ?? '' }),
    [capPhoto]
  );

  return (
    <div className="absolute inset-0 z-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          isBlurred && 'blur-md brightness-50',
        )}
      />

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-600" />
            </div>
          </div>
          <p className="text-gray-300 text-center font-medium">{t('camera.unavailable')}</p>
          <p className="text-gray-500 text-sm text-center mt-2 px-8 leading-relaxed">{error}</p>
        </div>
      )}

      <ScanOverlay scanning={isScanning} recognized={isRecognized} />
    </div>
  );
});

export default CameraView;
