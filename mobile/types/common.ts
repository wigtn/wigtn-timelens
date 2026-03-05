// Types shared across the mobile app

export type AgentType = 'curator' | 'restoration' | 'discovery' | 'diary';

export type SessionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'expired';

export type ConnectionStage =
  | 'idle'
  | 'auth'
  | 'token'
  | 'websocket'
  | 'audio'
  | 'camera'
  | 'ready';

export type PanelState = 'closed' | 'mini' | 'expanded' | 'fullscreen';

export type AudioState = 'idle' | 'listening' | 'speaking' | 'generating';

export interface AppError {
  code: string;
  message: string;
  recoverable: boolean;
  action?: 'retry' | 'fallback' | 'manual';
}
