// Camera capture for React Native using expo-camera
// Captures frames at 2fps as base64 JPEG for Gemini Live API

import { CameraView } from 'expo-camera';
import { FRAME_INTERVAL_MS, FRAME_QUALITY } from '@/constants/config';

export interface CameraCaptureHandle {
  startFrameLoop(cameraRef: React.RefObject<CameraView | null>): void;
  stopFrameLoop(): void;
  isActive(): boolean;
}

export function createCameraCapture(
  onFrame: (base64Jpeg: string) => void,
): CameraCaptureHandle {
  let frameTimer: ReturnType<typeof setInterval> | null = null;
  let active = false;

  function startFrameLoop(cameraRef: React.RefObject<CameraView | null>): void {
    stopFrameLoop();
    active = true;

    frameTimer = setInterval(async () => {
      if (!active || !cameraRef.current) return;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: FRAME_QUALITY,
          skipProcessing: true,
          shutterSound: false,
        });

        if (photo?.base64) {
          onFrame(photo.base64);
        }
      } catch {
        // Camera might not be ready yet, silently skip
      }
    }, FRAME_INTERVAL_MS);
  }

  function stopFrameLoop(): void {
    active = false;
    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
  }

  return {
    startFrameLoop,
    stopFrameLoop,
    isActive: () => active,
  };
}
