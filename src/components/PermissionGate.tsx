// ============================================================
// 파일: src/components/PermissionGate.tsx
// 담당: Part 2
// 역할: 카메라/마이크 권한 요청 UI + 폴백 옵션
// 출처: part2-curator-ui.md §3.11
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

type PermissionStatus = 'prompt' | 'requesting' | 'granted' | 'denied';

interface PermissionGateProps {
  onGranted: () => void;
}

function PermissionRow({ label, status }: { label: string; status: PermissionStatus }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-800/50 rounded-xl">
      <span className="text-gray-300">{label}</span>
      <span
        className={cn(
          'text-sm font-medium',
          status === 'granted' && 'text-green-400',
          status === 'denied' && 'text-red-400',
          status === 'prompt' && 'text-gray-500',
          status === 'requesting' && 'text-yellow-400',
        )}
      >
        {status === 'granted' && '허용됨'}
        {status === 'denied' && '거부됨'}
        {status === 'prompt' && '대기 중'}
        {status === 'requesting' && '요청 중...'}
      </span>
    </div>
  );
}

export default function PermissionGate({ onGranted }: PermissionGateProps) {
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
  const [micStatus, setMicStatus] = useState<PermissionStatus>('prompt');

  useEffect(() => {
    async function checkExisting() {
      try {
        const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });

        if (cam.state === 'granted' && mic.state === 'granted') {
          setCameraStatus('granted');
          setMicStatus('granted');
          onGranted();
          return;
        }

        if (cam.state === 'granted') setCameraStatus('granted');
        if (mic.state === 'granted') setMicStatus('granted');
      } catch {
        // Permissions API not supported — stay in prompt state
      }
    }
    checkExisting();
  }, [onGranted]);

  const requestPermissions = async () => {
    setCameraStatus('requesting');
    setMicStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });

      stream.getTracks().forEach((track) => track.stop());

      setCameraStatus('granted');
      setMicStatus('granted');
      onGranted();
    } catch (error) {
      const err = error as DOMException;
      if (err.name === 'NotAllowedError') {
        setCameraStatus('denied');
        setMicStatus('denied');
      } else if (err.name === 'NotFoundError') {
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
          videoOnly.getTracks().forEach((t) => t.stop());
          setCameraStatus('granted');
          setMicStatus('denied');
        } catch {
          setCameraStatus('denied');
          setMicStatus('denied');
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
      <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-8">
        <Camera className="w-12 h-12 text-gray-400" />
      </div>

      <h1 className="text-2xl font-heading font-bold text-white text-center">
        카메라와 마이크 권한이 필요합니다
      </h1>

      <p className="text-gray-400 text-center mt-4 leading-relaxed">
        TimeLens는 유물과 건물을 인식하고{'\n'}
        음성으로 대화하기 위해{'\n'}
        카메라와 마이크가 필요합니다.
      </p>

      <div className="mt-8 space-y-3 w-full max-w-sm">
        <PermissionRow label="카메라" status={cameraStatus} />
        <PermissionRow label="마이크" status={micStatus} />
      </div>

      {(cameraStatus === 'prompt' || cameraStatus === 'requesting') && (
        <button
          onClick={requestPermissions}
          disabled={cameraStatus === 'requesting'}
          className="mt-8 w-full max-w-sm py-4 bg-white text-black rounded-2xl
                     font-semibold text-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cameraStatus === 'requesting' ? '권한 요청 중...' : '권한 허용하기'}
        </button>
      )}

      {cameraStatus === 'denied' && (
        <div className="mt-8 space-y-3 w-full max-w-sm">
          <button
            onClick={() => onGranted()}
            className="w-full py-4 bg-gray-800 text-white rounded-2xl font-medium"
          >
            사진 업로드로 시작하기
          </button>
          <p className="text-xs text-gray-500 text-center">
            브라우저 설정에서 카메라 권한을 허용하면{'\n'}
            실시간 인식 기능을 사용할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
