// ============================================================
// 파일: src/hooks/use-microphone.ts
// 담당: Part 1 (코어 파이프라인)
// 역할: 마이크 스트림 관리 훅 — Part 1 구현 전 stub
// ============================================================
// TODO: Part 1이 실제 구현체로 교체 예정

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UseMicrophoneReturn } from '@/types/live-session';

export function useMicrophone(): UseMicrophoneReturn {
  const [isActive, setIsActive] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsActive(true);
      setIsPermissionGranted(true);
      setError(null);
    } catch (err) {
      const e = err as DOMException;
      setError(e.message || 'Microphone access failed');
    }
  }, []);

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    if (!isActive || !analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    function updateLevel() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setAudioLevel(avg / 255);
      animFrameRef.current = requestAnimationFrame(updateLevel);
    }

    animFrameRef.current = requestAnimationFrame(updateLevel);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isActive]);

  return { isActive, isPermissionGranted, error, audioLevel, startMic, stopMic };
}
