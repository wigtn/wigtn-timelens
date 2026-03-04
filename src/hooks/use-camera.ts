// ============================================================
// 파일: src/hooks/use-camera.ts
// 담당: Part 1
// 역할: 카메라 스트림 접근 훅
// ============================================================
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createCameraCapture, type CameraCapture } from '@/lib/camera/capture';

export interface UseCameraReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
  capturePhoto: () => string | null;
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<CameraCapture | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const capture = createCameraCapture();
      captureRef.current = capture;
      const mediaStream = await capture.start();
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      throw err;
    }
  }, []);

  const stopCamera = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    setStream(null);
    setIsActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    return captureRef.current?.captureFrame() ?? null;
  }, []);

  const capturePhoto = useCallback((): string | null => {
    return captureRef.current?.capturePhoto() ?? null;
  }, []);

  useEffect(() => {
    return () => {
      captureRef.current?.stop();
    };
  }, []);

  return { stream, isActive, error, startCamera, stopCamera, captureFrame, capturePhoto };
}
