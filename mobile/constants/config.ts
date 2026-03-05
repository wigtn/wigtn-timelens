// Backend API URL - change to your deployed URL in production
// For Expo Go on physical device, use your computer's local IP
// For simulator, localhost works
export const API_BASE_URL = __DEV__
  ? 'http://192.168.123.155:3000'  // Local IP
  : 'https://timelens-api.run.app';

export const FRAME_INTERVAL_MS = 500; // 2fps
export const FRAME_MAX_DIM = 768;
export const FRAME_QUALITY = 0.7;
export const PHOTO_QUALITY = 0.9;
