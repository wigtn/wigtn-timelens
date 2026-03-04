// ============================================================
// 파일: src/lib/audio/capture.ts
// 담당: Part 1
// 역할: 마이크 → PCM 16-bit 16kHz mono → base64 청크
// ============================================================

export interface AudioCaptureCallbacks {
  onChunk: (base64Pcm: string) => void;
  onLevelChange: (level: number) => void;
}

export interface AudioCapture {
  start(): Promise<void>;
  stop(): void;
  isActive(): boolean;
  getLevel(): number;
  mute(): void;
  unmute(): void;
}

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SAMPLES = 1600; // 100ms at 16kHz
const BUFFER_SIZE = 4096;

function resampleIfNeeded(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const floor = Math.floor(srcIndex);
    const ceil = Math.min(floor + 1, input.length - 1);
    const t = srcIndex - floor;
    output[i] = input[floor] * (1 - t) + input[ceil] * t;
  }
  return output;
}

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function int16ArrayToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createAudioCapture(callbacks: AudioCaptureCallbacks): AudioCapture {
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let active = false;
  let muted = false;
  let currentLevel = 0;
  let buffer = new Int16Array(0);

  async function start(): Promise<void> {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: TARGET_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    source = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      // Update level
      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        currentLevel = sum / dataArray.length / 255;
        callbacks.onLevelChange(currentLevel);
      }

      if (muted) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const resampled = resampleIfNeeded(inputData, audioContext!.sampleRate, TARGET_SAMPLE_RATE);
      const int16 = float32ToInt16(resampled);

      // Accumulate buffer
      const newBuffer = new Int16Array(buffer.length + int16.length);
      newBuffer.set(buffer);
      newBuffer.set(int16, buffer.length);
      buffer = newBuffer;

      // Emit chunks of CHUNK_SAMPLES
      while (buffer.length >= CHUNK_SAMPLES) {
        const chunk = buffer.slice(0, CHUNK_SAMPLES);
        buffer = buffer.slice(CHUNK_SAMPLES);
        callbacks.onChunk(int16ArrayToBase64(chunk));
      }
    };

    source.connect(analyser);
    analyser.connect(processor);
    processor.connect(audioContext.destination);
    active = true;
  }

  function stop(): void {
    active = false;
    buffer = new Int16Array(0);
    processor?.disconnect();
    analyser?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach(t => t.stop());
    audioContext?.close();
    processor = null;
    analyser = null;
    source = null;
    stream = null;
    audioContext = null;
  }

  return {
    start,
    stop,
    isActive: () => active,
    getLevel: () => currentLevel,
    mute: () => { muted = true; },
    unmute: () => { muted = false; },
  };
}
