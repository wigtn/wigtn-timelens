// Audio capture for React Native using expo-av
// Records PCM 16kHz mono and sends base64 chunks to Gemini Live API

import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

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

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
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
  let recording: Audio.Recording | null = null;
  let active = false;
  let muted = false;
  let chunkTimer: ReturnType<typeof setTimeout> | null = null;
  let processingChunk = false;

  async function start(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    active = true;
    muted = false;
    processingChunk = false;
    await startRecording();
  }

  async function startRecording(): Promise<void> {
    if (!active) return;

    try {
      recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();

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
    if (!active || !recording || processingChunk) return;
    processingChunk = true;

    try {
      const status = await recording.getStatusAsync();
      if (status.metering !== undefined) {
        const db = status.metering;
        const level = Math.max(0, Math.min(1, (db + 60) / 60));
        callbacks.onLevelChange(level);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri && !muted) {
        const tempFile = new File(uri);
        const base64Data = await tempFile.base64();

        // Skip WAV header (44 bytes → ~60 base64 chars)
        const pcmBase64 = base64Data.length > 60 ? base64Data.substring(60) : '';
        if (pcmBase64.length > 0) {
          callbacks.onChunk(pcmBase64);
        }

        try { tempFile.delete(); } catch { /* ok */ }
      }

      if (active) {
        recording = new Audio.Recording();
        await recording.prepareToRecordAsync(RECORDING_OPTIONS);
        await recording.startAsync();
      }
    } catch (err) {
      console.warn('[AudioCapture] Chunk error:', err);
      if (active) {
        try {
          recording = new Audio.Recording();
          await recording.prepareToRecordAsync(RECORDING_OPTIONS);
          await recording.startAsync();
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

    if (recording) {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
      } catch { /* already stopped */ }
      recording = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
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
