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
  let nextStartTime = 0;
  let scheduledSources: AudioBufferSourceNode[] = [];

  // 버퍼 상태 추적
  const LOOKAHEAD_MS = 50; // 50ms 선행 버퍼

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

  function enqueue(base64Pcm: string): void {
    ensureContext();
    if (!audioContext || !gainNode) return;

    const int16 = base64ToInt16Array(base64Pcm);
    const float32 = int16ToFloat32(int16);
    const audioBuffer = audioContext.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    // 즉시 스케줄링 (Proactive Scheduling)
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);

    const now = audioContext.currentTime;
    const lookahead = LOOKAHEAD_MS / 1000;

    // 첫 청크이거나 nextStartTime이 지났으면 약간의 lookahead와 함께 시작
    const startTime = nextStartTime <= now
      ? now + lookahead
      : nextStartTime;

    source.start(startTime);
    nextStartTime = startTime + audioBuffer.duration;

    // 재생 완료된 소스 정리
    source.onended = () => {
      const idx = scheduledSources.indexOf(source);
      if (idx !== -1) scheduledSources.splice(idx, 1);
    };
    scheduledSources.push(source);
  }

  function flush(): void {
    // 모든 예약된 소스 중지
    for (const source of scheduledSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // 이미 종료된 소스 무시
      }
    }
    scheduledSources = [];
    nextStartTime = 0;
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
    isPlaying: () => scheduledSources.length > 0,
    setVolume,
  };
}
