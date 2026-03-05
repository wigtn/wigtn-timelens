// Audio playback for React Native using expo-av
// Receives PCM 24kHz base64 from Gemini Live API and plays it

import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

export interface AudioPlaybackHandle {
  enqueue(base64Pcm: string): void;
  flush(): void;
  stop(): Promise<void>;
  isPlaying(): boolean;
  setVolume(volume: number): void;
}

const OUTPUT_SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

function createWavHeaderBytes(pcmDataLength: number): Uint8Array {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);

  header.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 36 + pcmDataLength, true);
  header.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  header.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, OUTPUT_SAMPLE_RATE, true);
  view.setUint32(28, OUTPUT_SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(32, NUM_CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  header.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, pcmDataLength, true);

  return header;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function createAudioPlayback(): AudioPlaybackHandle {
  const queue: string[] = [];
  let isCurrentlyPlaying = false;
  let currentSound: Audio.Sound | null = null;
  let volume = 1.0;
  let accumulatedPcm = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let fileCounter = 0;

  async function ensureAudioMode(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  function enqueue(base64Pcm: string): void {
    if (!base64Pcm) return;

    accumulatedPcm += base64Pcm;

    if (flushTimer) {
      clearTimeout(flushTimer);
    }

    const MIN_BUFFER_SIZE = 12800; // ~200ms of audio

    if (accumulatedPcm.length >= MIN_BUFFER_SIZE) {
      flushAccumulated();
    } else {
      flushTimer = setTimeout(() => {
        flushAccumulated();
      }, 100);
    }
  }

  function flushAccumulated(): void {
    if (accumulatedPcm.length === 0) return;
    queue.push(accumulatedPcm);
    accumulatedPcm = '';
    if (!isCurrentlyPlaying) {
      playNext();
    }
  }

  async function playNext(): Promise<void> {
    if (queue.length === 0) {
      isCurrentlyPlaying = false;
      return;
    }

    isCurrentlyPlaying = true;
    const base64Pcm = queue.shift()!;

    try {
      await ensureAudioMode();

      // Decode PCM base64 to bytes, prepend WAV header, re-encode as single base64
      // (avoids corrupted audio from concatenating padded base64 strings)
      const pcmBytes = base64ToUint8(base64Pcm);
      const wavHeader = createWavHeaderBytes(pcmBytes.length);
      const combined = new Uint8Array(wavHeader.length + pcmBytes.length);
      combined.set(wavHeader, 0);
      combined.set(pcmBytes, wavHeader.length);
      const wavBase64 = uint8ToBase64(combined);

      // Write WAV to temp file using new expo-file-system API
      const fileName = `audio_${Date.now()}_${fileCounter++}.wav`;
      const tempFile = new File(Paths.cache, fileName);
      tempFile.create({ overwrite: true });
      tempFile.write(wavBase64, { encoding: 'base64' });

      // Play
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile.uri },
        { shouldPlay: true, volume },
      );
      currentSound = sound;

      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve();
          }
        });
      });

      await sound.unloadAsync();
      currentSound = null;
      try { tempFile.delete(); } catch { /* ok */ }

      await playNext();
    } catch (err) {
      console.warn('[AudioPlayback] Play error:', err);
      currentSound = null;
      await playNext();
    }
  }

  function flush(): void {
    queue.length = 0;
    accumulatedPcm = '';
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    isCurrentlyPlaying = false;
    if (currentSound) {
      currentSound.stopAsync().catch(() => {});
      currentSound.unloadAsync().catch(() => {});
      currentSound = null;
    }
  }

  async function stop(): Promise<void> {
    flush();
  }

  function setVolumeLevel(v: number): void {
    volume = Math.max(0, Math.min(1, v));
    if (currentSound) {
      currentSound.setVolumeAsync(volume).catch(() => {});
    }
  }

  return {
    enqueue,
    flush,
    stop,
    isPlaying: () => isCurrentlyPlaying,
    setVolume: setVolumeLevel,
  };
}
