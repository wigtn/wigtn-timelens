// ============================================================
// 파일: src/lib/ws/manager.ts
// 담당: Part 1
// 역할: WebSocket 재연결 매니저 (지수 백오프)
// ============================================================

export interface ReconnectConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onAttempt: (attempt: number, maxAttempts: number) => void;
  onSuccess: () => void;
  onFailure: () => void;
}

export interface ReconnectManager {
  scheduleReconnect(connectFn: () => Promise<void>): void;
  cancel(): void;
  isReconnecting(): boolean;
  getAttemptCount(): number;
}

export function createReconnectManager(config: ReconnectConfig): ReconnectManager {
  let attempts = 0;
  let _isReconnecting = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect(connectFn: () => Promise<void>): void {
    if (attempts >= config.maxAttempts) {
      _isReconnecting = false;
      config.onFailure();
      return;
    }

    _isReconnecting = true;
    const delay = Math.min(
      config.baseDelayMs * Math.pow(2, attempts) + Math.random() * 500,
      config.maxDelayMs,
    );
    attempts += 1;
    config.onAttempt(attempts, config.maxAttempts);

    timeoutId = setTimeout(async () => {
      try {
        await connectFn();
        attempts = 0;
        _isReconnecting = false;
        config.onSuccess();
      } catch {
        scheduleReconnect(connectFn);
      }
    }, delay);
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    _isReconnecting = false;
    attempts = 0;
  }

  return {
    scheduleReconnect,
    cancel,
    isReconnecting: () => _isReconnecting,
    getAttemptCount: () => attempts,
  };
}
