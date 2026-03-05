import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 조건부 클래스 병합 유틸리티
 * shadcn/ui 컴포넌트에서 Tailwind 클래스 충돌 해결에 사용
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 타임스탬프를 상대 시간 문자열로 변환
 *
 * @example
 * formatRelativeTime(Date.now() - 60000) // "1분 전"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * 거리를 사람이 읽기 좋은 형태로 변환
 *
 * @example
 * formatDistance(1500) // "1.5 km"
 * formatDistance(500)  // "500 m"
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * 도보 시간 추정 (평균 보행 속도 5km/h 기준)
 */
export function estimateWalkingTime(meters: number): number {
  return Math.ceil(meters / 83.33); // 5km/h = 83.33m/min
}
