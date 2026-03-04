// ============================================================
// 파일: src/lib/audio/playback.ts
// 담당: Part 1
// 역할: Live API PCM 24kHz base64 → AudioContext 갭 없는 재생
// ============================================================

export interface AudioPlayback {
  enqueue(base64Pcm: string): void;
  flush(): void;
  stop(): void;
  isPlaying(): boolean;
  setVolume(volume: number): void;
}

const OUTPUT_SAMPLE_RATE = 24000;

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

export function createAudioPlayback(): AudioPlayback {
  let audioContext: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  const queue: AudioBuffer[] = [];
  let nextStartTime = 0;
  let isCurrentlyPlaying = false;

  function ensureContext(): void {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  function scheduleNext(): void {
    if (queue.length === 0 || !audioContext || !gainNode) {
      isCurrentlyPlaying = false;
      return;
    }

    const buffer = queue.shift()!;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);

    const startTime = Math.max(audioContext.currentTime, nextStartTime);
    source.start(startTime);
    nextStartTime = startTime + buffer.duration;
    isCurrentlyPlaying = true;

    source.onended = () => {
      if (queue.length > 0) {
        scheduleNext();
      } else {
        isCurrentlyPlaying = false;
      }
    };
  }

  function enqueue(base64Pcm: string): void {
    ensureContext();

    const int16 = base64ToInt16Array(base64Pcm);
    const float32 = int16ToFloat32(int16);
    const audioBuffer = audioContext!.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    queue.push(audioBuffer);

    if (!isCurrentlyPlaying) {
      scheduleNext();
    }
  }

  function flush(): void {
    queue.length = 0;
    nextStartTime = 0;
    isCurrentlyPlaying = false;
  }

  function stop(): void {
    flush();
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      gainNode = null;
    }
  }

  function setVolume(volume: number): void {
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  return {
    enqueue,
    flush,
    stop,
    isPlaying: () => isCurrentlyPlaying,
    setVolume,
  };
}
