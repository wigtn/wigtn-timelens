// Audio capture for React Native using expo-audio
// Records PCM 16kHz mono and sends base64 chunks to Gemini Live API

import {
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioRecorder, RecordingOptions } from 'expo-audio';
import { File } from 'expo-file-system';

export interface AudioCaptureCallbacks {
  onChunk: (base64Pcm: string) => void;
  onLevelChange: (level: number) => void;
}

export interface AudioCaptureHandle {
  start(): Promise<void>;
  stop(): Promise<void>;
  isActive(): boolean;
  mute(): void;
  unmute(): void;
}

const RECORDING_OPTIONS: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  isMeteringEnabled: true,
  android: {
    outputFormat: 'default',
    audioEncoder: 'default',
    sampleRate: 16000,
  },
  ios: {
    outputFormat: 'lpcm',
    audioQuality: 96,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 256000,
  },
};

const CHUNK_DURATION_MS = 200;

export function createAudioCapture(callbacks: AudioCaptureCallbacks): AudioCaptureHandle {
  let recorder: AudioRecorder | null = null;
  let active = false;
  let muted = false;
  let chunkTimer: ReturnType<typeof setTimeout> | null = null;
  let processingChunk = false;

  async function createAndStartRecorder(): Promise<AudioRecorder> {
    const rec = new AudioModule.AudioRecorder({});
    await rec.prepareToRecordAsync(RECORDING_OPTIONS);
    rec.record();
    return rec;
  }

  async function start(): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });

    active = true;
    muted = false;
    processingChunk = false;
    await startRecording();
  }

  async function startRecording(): Promise<void> {
    if (!active) return;

    try {
      recorder = await createAndStartRecorder();
      scheduleNextChunk();
    } catch (err) {
      console.error('[AudioCapture] Start failed:', err);
      active = false;
    }
  }

  function scheduleNextChunk(): void {
    if (!active) return;
    chunkTimer = setTimeout(() => processChunk(), CHUNK_DURATION_MS);
  }

  async function processChunk(): Promise<void> {
    if (!active || !recorder || processingChunk) return;
    processingChunk = true;

    try {
      // Read metering before stopping
      const status = recorder.getStatus();
      if (status.metering !== undefined) {
        const db = status.metering;
        const level = Math.max(0, Math.min(1, (db + 60) / 60));
        callbacks.onLevelChange(level);
      }

      await recorder.stop();
      const uri = recorder.uri;

      if (uri && !muted) {
        const tempFile = new File(uri);
        const base64Data = await tempFile.base64();

        // Skip WAV header (44 bytes -> ~60 base64 chars)
        const pcmBase64 = base64Data.length > 60 ? base64Data.substring(60) : '';
        if (pcmBase64.length > 0) {
          callbacks.onChunk(pcmBase64);
        }

        try { tempFile.delete(); } catch { /* ok */ }
      }

      if (active) {
        recorder = await createAndStartRecorder();
      }
    } catch (err) {
      console.warn('[AudioCapture] Chunk error:', err);
      if (active) {
        try {
          recorder = await createAndStartRecorder();
        } catch { /* restart failed */ }
      }
    } finally {
      processingChunk = false;
      scheduleNextChunk();
    }
  }

  async function stop(): Promise<void> {
    active = false;

    if (chunkTimer) {
      clearTimeout(chunkTimer);
      chunkTimer = null;
    }

    if (recorder) {
      try {
        if (recorder.isRecording) {
          await recorder.stop();
        }
      } catch { /* already stopped */ }
      recorder = null;
    }

    await setAudioModeAsync({
      allowsRecording: false,
    });
  }

  return {
    start,
    stop,
    isActive: () => active,
    mute: () => { muted = true; },
    unmute: () => { muted = false; },
  };
}
