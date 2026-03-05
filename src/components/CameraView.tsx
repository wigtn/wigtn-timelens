// ============================================================
// 파일: src/components/CameraView.tsx
// 담당: Part 2
// 역할: 전체 화면 카메라 뷰파인더 + 스캔 코너 + 인식 배지
// 출처: part2-curator-ui.md §3.5
// ============================================================

'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CameraViewProps } from '@/types/components';
import { useCamera } from '@/hooks/use-camera';

export interface CameraViewRef {
  capturePhoto: () => string;
}

function ScanCorners({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const cornerClass = 'absolute w-8 h-8 border-white/80 animate-pulse';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-64 h-64">
        <div className={`${cornerClass} top-0 left-0 border-t-2 border-l-2 rounded-tl-lg`} />
        <div className={`${cornerClass} top-0 right-0 border-t-2 border-r-2 rounded-tr-lg`} />
        <div className={`${cornerClass} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg`} />
        <div className={`${cornerClass} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg`} />
      </div>
    </div>
  );
}

function RecognizedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                 w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center
                 animate-fade-in"
    >
      <Check className="w-8 h-8 text-white" />
    </div>
  );
}

const CameraView = forwardRef<CameraViewRef, CameraViewProps>(function CameraView(
  { isScanning, isRecognized, isBlurred },
  ref
) {
  const { stream, isActive, error, startCamera, capturePhoto: capPhoto } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Only start camera if not already active
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
    () => ({
      capturePhoto: () => capPhoto() ?? '',
    }),
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
          <p className="text-gray-300 text-center font-medium">카메라를 사용할 수 없습니다</p>
          <p className="text-gray-500 text-sm text-center mt-2 px-8 leading-relaxed">{error}</p>
        </div>
      )}

      <ScanCorners visible={isScanning && !isRecognized} />
      <RecognizedBadge visible={isRecognized} />
    </div>
  );
});

export default CameraView;
