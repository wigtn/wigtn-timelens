// ============================================================
// 파일: src/hooks/use-camera.ts
// 담당: Part 1 (코어 파이프라인)
// 역할: 카메라 스트림 관리 훅 — Part 1 구현 전 stub
// ============================================================
// TODO: Part 1이 실제 구현체로 교체 예정

'use client';

import { useState, useCallback, useRef } from 'react';
import type { UseCameraReturn } from '@/types/live-session';

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setIsActive(true);
      setError(null);
    } catch (err) {
      const e = err as DOMException;
      setError(e.message || 'Camera access failed');
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsActive(false);
    }
  }, [stream]);

  const captureFromVideo = (): string | null => {
    const video = videoRef.current ?? document.querySelector('video');
    if (!video) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const captureFrame = useCallback((): string | null => {
    return captureFromVideo();
  }, []);

  const capturePhoto = useCallback((): string | null => {
    return captureFromVideo();
  }, []);

  return { stream, isActive, error, startCamera, stopCamera, captureFrame, capturePhoto };
}
