// ============================================================
// 파일: src/hooks/use-geolocation.ts
// 담당: Part 4
// 역할: 브라우저 Geolocation API 훅
// 출처: part4-discovery-diary.md §2.2
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isPermissionGranted: boolean;
}

export interface UseGeolocationReturn extends GeolocationState {
  refresh: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1분간 위치 캐시
};

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: true,
    isPermissionGranted: false,
  });

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation API를 지원하지 않는 브라우저입니다',
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false,
          isPermissionGranted: true,
        });
      },
      (err) => {
        let errorMessage: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = '위치 접근 권한이 거부되었습니다';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다';
            break;
          case err.TIMEOUT:
            errorMessage = '위치 요청이 시간 초과되었습니다';
            break;
          default:
            errorMessage = '알 수 없는 위치 오류';
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  useEffect(() => {
    getPosition();
  }, [getPosition]);

  return { ...state, refresh: getPosition };
}
