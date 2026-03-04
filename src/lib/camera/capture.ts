// ============================================================
// 파일: src/lib/camera/capture.ts
// 담당: Part 1
// 역할: 카메라 → JPEG 768px → 1fps base64 프레임 루프
// ============================================================

export interface CameraCapture {
  start(): Promise<MediaStream>;
  stop(): void;
  isActive(): boolean;
  captureFrame(): string | null;
  capturePhoto(): string | null;
  getStream(): MediaStream | null;
  startFrameLoop(onFrame: (base64Jpeg: string) => void): void;
  stopFrameLoop(): void;
}

const MAX_DIM = 768;
const FRAME_QUALITY = 0.7;
const PHOTO_QUALITY = 0.9;

export function createCameraCapture(): CameraCapture {
  let stream: MediaStream | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let active = false;
  let frameIntervalId: ReturnType<typeof setInterval> | null = null;

  async function start(): Promise<MediaStream> {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (err) {
      // Fallback: facingMode constraint 제거 (전면 카메라 사용)
      if (err instanceof OverconstrainedError) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } else {
        throw err;
      }
    }

    videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.playsInline = true;
    videoElement.muted = true;
    await videoElement.play();

    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;
    active = true;
    return stream;
  }

  function captureFrame(): string | null {
    if (!videoElement || !canvas || !ctx || videoElement.readyState < 2) return null;
    const { videoWidth, videoHeight } = videoElement;
    if (videoWidth === 0) return null;

    let w = videoWidth;
    let h = videoHeight;
    if (w > MAX_DIM || h > MAX_DIM) {
      const scale = MAX_DIM / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(videoElement, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', FRAME_QUALITY).split(',')[1];
  }

  function capturePhoto(): string | null {
    if (!videoElement || !canvas || !ctx || videoElement.readyState < 2) return null;
    const { videoWidth, videoHeight } = videoElement;
    if (videoWidth === 0) return null;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY).split(',')[1];
  }

  function startFrameLoop(onFrame: (base64: string) => void): void {
    stopFrameLoop();
    frameIntervalId = setInterval(() => {
      const frame = captureFrame();
      if (frame) onFrame(frame);
    }, 1000); // 1fps
  }

  function stopFrameLoop(): void {
    if (frameIntervalId !== null) {
      clearInterval(frameIntervalId);
      frameIntervalId = null;
    }
  }

  function stop(): void {
    stopFrameLoop();
    active = false;
    stream?.getTracks().forEach(t => t.stop());
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement = null;
    }
    canvas = null;
    ctx = null;
    stream = null;
  }

  return {
    start,
    stop,
    isActive: () => active,
    captureFrame,
    capturePhoto,
    getStream: () => stream,
    startFrameLoop,
    stopFrameLoop,
  };
}
