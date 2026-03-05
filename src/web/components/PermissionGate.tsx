// ============================================================
// 파일: src/components/PermissionGate.tsx
// 담당: Part 2
// 역할: 카메라/마이크 권한 요청 UI + 폴백 옵션
// 출처: part2-curator-ui.md §3.11
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Camera, Mic, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@web/lib/utils';

type PermissionStatus = 'prompt' | 'requesting' | 'granted' | 'denied';

interface PermissionGateProps {
  onGranted: () => void;
}

function PermissionRow({
  icon: Icon,
  label,
  status,
}: {
  icon: typeof Camera;
  label: string;
  status: PermissionStatus;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-200 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {status === 'granted' && (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">허용됨</span>
          </>
        )}
        {status === 'denied' && (
          <>
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-red-400">거부됨</span>
          </>
        )}
        {status === 'prompt' && (
          <span className="text-xs text-gray-500">대기 중</span>
        )}
        {status === 'requesting' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            요청 중
          </span>
        )}
      </div>
    </div>
  );
}

export default function PermissionGate({ onGranted }: PermissionGateProps) {
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
  const [micStatus, setMicStatus] = useState<PermissionStatus>('prompt');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      {/* Background accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
      />

      <div
        className={cn(
          'relative z-10 w-full max-w-sm transition-all duration-700 ease-out',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-9 h-9 text-timelens-gold" />
            </div>
            {/* Pulse ring */}
            <div className="absolute -inset-2 rounded-2xl border border-timelens-gold/20 animate-pulse-ring" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-heading font-bold text-white text-center">
          권한 설정
        </h1>
        <p className="text-sm text-gray-400 text-center mt-3 leading-relaxed">
          TimeLens는 유물을 인식하고 음성으로 대화하기 위해
          <br />카메라와 마이크 접근 권한이 필요합니다.
        </p>

        {/* Permission rows */}
        <div className="mt-8 space-y-2.5">
          <PermissionRow icon={Camera} label="카메라" status={cameraStatus} />
          <PermissionRow icon={Mic} label="마이크" status={micStatus} />
        </div>

        {/* Action buttons */}
        {(cameraStatus === 'prompt' || cameraStatus === 'requesting') && (
          <button
            onClick={requestPermissions}
            disabled={cameraStatus === 'requesting'}
            className="mt-8 w-full py-4 rounded-2xl font-semibold text-base
              bg-gradient-to-r from-timelens-gold to-timelens-bronze text-black
              hover:brightness-110 active:scale-[0.98] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-timelens-gold/20"
          >
            {cameraStatus === 'requesting' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                권한 요청 중...
              </span>
            ) : (
              '권한 허용하기'
            )}
          </button>
        )}

        {cameraStatus === 'denied' && (
          <div className="mt-8 space-y-3">
            <button
              onClick={() => onGranted()}
              className="w-full py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-medium
                transition-colors border border-white/10"
            >
              사진 업로드로 시작하기
            </button>
            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
              브라우저 설정에서 카메라 권한을 허용하면
              <br />실시간 인식 기능을 사용할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
