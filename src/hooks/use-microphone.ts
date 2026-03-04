// ============================================================
// 파일: src/hooks/use-microphone.ts
// 담당: Part 1
// 역할: 마이크 접근 + 볼륨 레벨 훅
// ============================================================
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createAudioCapture, type AudioCapture } from '@/lib/audio/capture';

export interface UseMicrophoneReturn {
  isActive: boolean;
  isPermissionGranted: boolean;
  error: string | null;
  audioLevel: number;
  startMic: () => Promise<void>;
  stopMic: () => void;
}

export function useMicrophone(): UseMicrophoneReturn {
  const [isActive, setIsActive] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const captureRef = useRef<AudioCapture | null>(null);

  const startMic = useCallback(async () => {
    try {
      setError(null);
      const capture = createAudioCapture({
        onChunk: () => {}, // Hook consumer가 직접 사용하지 않음. use-live-session이 관리.
        onLevelChange: (level) => setAudioLevel(level),
      });
      captureRef.current = capture;
      await capture.start();
      setIsActive(true);
      setIsPermissionGranted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone access denied';
      setError(message);
      throw err;
    }
  }, []);

  const stopMic = useCallback(() => {
    captureRef.current?.stop();
    captureRef.current = null;
    setIsActive(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      captureRef.current?.stop();
    };
  }, []);

  return { isActive, isPermissionGranted, error, audioLevel, startMic, stopMic };
}
