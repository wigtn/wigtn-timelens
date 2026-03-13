// ============================================================
// 파일: src/web/components/PermissionGate.tsx
// 역할: 카메라/마이크 권한 요청 UI + 폴백 옵션
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Shield, CheckCircle2, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';

type PermissionStatus = 'prompt' | 'requesting' | 'granted' | 'denied';

interface PermissionGateProps {
  onGranted: () => void;
  onBack?: () => void;
  locale?: Locale;
}

function PermissionRow({
  icon: Icon,
  label,
  status,
  locale = 'ko',
}: {
  icon: typeof Camera;
  label: string;
  status: PermissionStatus;
  locale?: Locale;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white/[0.04] rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-3">
        <Icon className={cn('w-5 h-5', status === 'granted' ? 'text-emerald-400' : 'text-gray-400')} />
        <span className="text-sm text-gray-200 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {status === 'granted' && (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">{t('permission.granted', locale)}</span>
          </>
        )}
        {status === 'denied' && (
          <>
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-red-400">{t('permission.denied', locale)}</span>
          </>
        )}
        {status === 'prompt' && (
          <span className="text-xs text-gray-500">{t('permission.waiting', locale)}</span>
        )}
        {status === 'requesting' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            {t('permission.requesting', locale)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PermissionGate({ onGranted, onBack, locale = 'ko' }: PermissionGateProps) {
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
  const [micStatus, setMicStatus] = useState<PermissionStatus>('prompt');
  const [mounted, setMounted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hardDenied, setHardDenied] = useState(false);
  const [isRecheckingManual, setIsRecheckingManual] = useState(false);
  // 권한 변경 리스너 cleanup ref
  const permCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── 권한 재확인 (Permissions API 전용 — getUserMedia 미사용)
  // catch 블록에서 getUserMedia를 호출하면 사용자 동작 없이 성공해
  // onGranted()가 조기 호출되는 문제가 있으므로 API 실패 시 false 반환
  const checkAndProceed = async (): Promise<boolean> => {
    try {
      const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (cam.state === 'granted' && mic.state === 'granted') {
        onGranted();
        return true;
      }
      if (cam.state === 'granted') setCameraStatus('granted');
      if (mic.state === 'granted') setMicStatus('granted');
    } catch {
      // Permissions API 미지원 → 게이트 표시 (getUserMedia는 버튼 클릭 시에만)
    }
    return false;
  };

  // ── PermissionStatus.onchange 리스너 등록 ────────────────────
  const attachChangeListeners = async () => {
    try {
      const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      const handleChange = () => {
        if (cam.state === 'granted' && mic.state === 'granted') {
          onGranted();
        } else {
          if (cam.state === 'granted') setCameraStatus('granted');
          else if (cam.state === 'denied') setCameraStatus('denied');
          if (mic.state === 'granted') setMicStatus('granted');
          else if (mic.state === 'denied') setMicStatus('denied');
        }
      };

      cam.addEventListener('change', handleChange);
      mic.addEventListener('change', handleChange);

      permCleanupRef.current = () => {
        cam.removeEventListener('change', handleChange);
        mic.removeEventListener('change', handleChange);
      };
    } catch {
      // Permissions API 미지원 — visibilitychange만 사용
    }
  };

  // ── 초기 권한 확인 ────────────────────────────────────────────
  // 게이트는 항상 즉시 표시 (initializing null-render 제거)
  // 이미 허용된 경우 checkAndProceed가 onGranted()를 호출해 부모가 전환
  useEffect(() => {
    async function init() {
      await checkAndProceed();
      await attachChangeListeners();
    }
    init();
    return () => { permCleanupRef.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── visibilitychange: 브라우저 설정에서 돌아올 때 자동 감지 ──
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      if (cameraStatus !== 'denied' && !hardDenied) return;
      await checkAndProceed();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus, hardDenied]);

  // ── 권한 요청 ─────────────────────────────────────────────────
  const requestPermissions = async () => {
    setIsRequesting(true);
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
        setHardDenied(true);
      } else if (err.name === 'NotFoundError') {
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
          videoOnly.getTracks().forEach((tr) => tr.stop());
          setCameraStatus('granted');
          setMicStatus('denied');
        } catch {
          setCameraStatus('denied');
          setMicStatus('denied');
        }
      } else {
        setCameraStatus('denied');
        setMicStatus('denied');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  // ── 수동 허용 후 "다시 확인" 버튼 ────────────────────────────
  // 브라우저 설정에서 돌아온 뒤 Permissions API로만 확인
  // 미허용이면 상태를 'prompt'로 돌려 사용자가 버튼을 다시 누르도록 유도
  const handleManualRecheck = async () => {
    setIsRecheckingManual(true);
    setHardDenied(false);
    const granted = await checkAndProceed();
    if (!granted) {
      setCameraStatus('prompt');
      setMicStatus('prompt');
    }
    setIsRecheckingManual(false);
  };

  return (
    <div className="fixed inset-0 bg-canvas flex flex-col pt-safe-top pb-safe-bottom">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
      />

      {/* ── 상단 네비 바 ── */}
      <div className="shrink-0 flex items-center px-4 pt-3 h-14">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.06]
                       flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* ── 본문 ── */}
      <div
        className={cn(
          'flex-1 flex flex-col justify-center px-6 pb-6 transition-all duration-500 ease-out',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        <div className="flex justify-center mb-7">
          <div className="relative">
            <div
              className="rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center backdrop-blur-sm"
              style={{ width: '72px', height: '72px' }}
            >
              <Shield className="w-8 h-8 text-timelens-gold" />
            </div>
            <div className="absolute -inset-2 rounded-2xl border border-timelens-gold/20 animate-pulse-ring" />
          </div>
        </div>

        <h1 className="text-2xl font-heading font-bold text-white text-center">
          {t('permission.title', locale)}
        </h1>
        <p className="text-sm text-gray-400 text-center mt-3 leading-relaxed">
          {t('permission.subtitle', locale)}
        </p>

        <div className="mt-7 space-y-2.5">
          <PermissionRow icon={Camera} label={t('permission.camera', locale)} status={cameraStatus} locale={locale} />
          <PermissionRow icon={Mic} label={t('permission.microphone', locale)} status={micStatus} locale={locale} />
        </div>

        {/* 초기 허용 버튼 */}
        {(cameraStatus === 'prompt' || cameraStatus === 'requesting') && (
          <button
            onClick={requestPermissions}
            disabled={isRequesting}
            className="mt-7 w-full py-4 rounded-2xl font-semibold text-base
              bg-gradient-to-r from-timelens-gold to-timelens-bronze text-black
              hover:brightness-110 active:scale-[0.98] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-timelens-gold/20"
          >
            {isRequesting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                {t('permission.requestingBtn', locale)}
              </span>
            ) : (
              t('permission.requestBtn', locale)
            )}
          </button>
        )}

        {/* 거부 후 옵션 */}
        {cameraStatus === 'denied' && (
          <div className="mt-7 space-y-3">
            {/* 브라우저 설정 안내 */}
            <div className="px-4 py-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 space-y-1">
              <p className="text-xs font-medium text-amber-400 text-center">
                {t('permission.browserNote', locale)}
              </p>
            </div>

            {/* 설정 변경 후 다시 확인 */}
            <button
              onClick={handleManualRecheck}
              disabled={isRecheckingManual}
              className="w-full py-4 bg-timelens-gold/10 hover:bg-timelens-gold/20 text-timelens-gold rounded-2xl font-semibold
                transition-colors border border-timelens-gold/25 disabled:opacity-60"
            >
              {isRecheckingManual ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-timelens-gold/30 border-t-timelens-gold rounded-full animate-spin" />
                  {t('permission.requestingBtn', locale)}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t('permission.retryBtn', locale)}
                </span>
              )}
            </button>

            {/* 권한 없이 계속 */}
            <button
              onClick={() => onGranted()}
              className="w-full py-4 bg-white/[0.06] hover:bg-white/10 text-gray-300 rounded-2xl font-medium
                transition-colors border border-white/[0.08]"
            >
              {t('permission.fallbackBtn', locale)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
