// ============================================================
// 파일: src/app/page.tsx
// 담당: Part 2
// 역할: 랜딩 페이지 — 히어로 + 서비스 소개 스크롤
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mic, Sparkles, Compass, BookOpen } from 'lucide-react';

const ARTIFACTS = [
  '청자상감운학문매병 · 고려시대',
  '금동미륵보살반가사유상 · 삼국시대',
  '백자청화매죽문호 · 조선시대',
];

const DIARY_DATA = [
  {
    text: '고려청자의 비취색을 처음 실물로 마주한 순간, 천 년 전 장인의 손길이 온몸으로 느껴졌다.',
    tags: ['국립중앙박물관', '청자', '고려시대'],
  },
  {
    text: '경복궁 근정전 앞에 섰을 때, 조선의 위엄이 발끝부터 전해져 왔다. 잊지 못할 하루.',
    tags: ['경복궁', '근정전', '조선시대'],
  },
  {
    text: '백자청화의 단아한 선을 따라 시선이 머물렀다. 오늘 나는 다른 시대를 잠시 살았다.',
    tags: ['백자청화', '조선시대', '3점 관람'],
  },
];

const HERITAGE_SITES = [
  { x: '22%', y: '25%', delay: 90,  name: '근정전', dist: '120m' },
  { x: '73%', y: '30%', delay: 200, name: '경회루', dist: '350m' },
  { x: '16%', y: '70%', delay: 300, name: '향원정', dist: '480m' },
  { x: '68%', y: '72%', delay: 380, name: '자경전', dist: '620m' },
  { x: '85%', y: '50%', delay: 20,  name: '교태전', dist: '890m' },
  { x: '45%', y: '18%', delay: 140, name: '흥례문', dist: '200m' },
];

/**
 * 스크롤 진입 감지 훅
 * - threshold: 요소가 이 비율만큼 뷰포트에 들어왔을 때 트리거
 * - rootMargin: 뷰포트 하단을 N px 안쪽으로 당겨서 충분히 보일 때만 발동
 */
function useReveal(threshold = 0.25, rootMargin = '0px 0px -60px 0px') {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible] as const;
}

// reveal transition — 카드 하나씩 스스로 올라옴
function rv(visible: boolean, delay = 0): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(28px)',
    transition: `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  };
}

const MUSEUMS = [
  '경복궁', '국립중앙박물관', '창덕궁', '불국사', '석굴암',
  '수원화성', '국립고궁박물관', '덕수궁', '국립민속박물관',
  '경주역사유적지구', '해인사', '종묘', '창경궁', '국립국악원',
];

export default function LandingPage() {
  const [isStarting, setIsStarting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // 카드마다 독립 ref — 순차 스크롤 reveal 보장
  const [statementRef, statementVisible] = useReveal(0.25);
  const [cameraRef,    cameraVisible   ] = useReveal(0.12, '0px 0px -40px 0px');
  const [statsRef,     statsVisible    ] = useReveal(0.5);
  const [bento1Ref,    bento1Visible   ] = useReveal(0.2);   // AI 복원
  const [bento2Ref,    bento2Visible   ] = useReveal(0.2);   // 주변 유산
  const [diaryRef,     diaryVisible    ] = useReveal(0.1,  '0px 0px -40px 0px');
  const [marqueeRef,   marqueeVisible  ] = useReveal(0.3);

  useEffect(() => { setMounted(true); }, []);

  const handleStart = () => {
    setIsStarting(true);
    router.push('/session');
  };

  // ── 카드 자동 재생 상태 ──

  // 카메라 카드 — 스크롤 진입 후 자동 활성, 유물 이름 순환
  const [cameraActive, setCameraActive] = useState(false);
  const [artifactIdx, setArtifactIdx] = useState(0);
  const [artifactVisible, setArtifactVisible] = useState(true);

  useEffect(() => {
    if (!cameraVisible) return;
    const delay = setTimeout(() => setCameraActive(true), 400);
    return () => clearTimeout(delay);
  }, [cameraVisible]);

  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => {
      setArtifactVisible(false);
      setTimeout(() => {
        setArtifactIdx(i => (i + 1) % ARTIFACTS.length);
        setArtifactVisible(true);
      }, 280);
    }, 2200);
    return () => clearInterval(interval);
  }, [cameraActive]);

  // 복원 카드 — 스크롤 진입 후 before→after 루프 사이클
  const [restoreActive, setRestoreActive] = useState(false);
  const restoreCycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!bento1Visible) return;

    const runCycle = () => {
      // before → after (1.5s 트랜지션)
      setRestoreActive(true);
      restoreCycleRef.current = setTimeout(() => {
        // after 홀드 1.2s 후 리셋
        setRestoreActive(false);
        restoreCycleRef.current = setTimeout(runCycle, 2700); // 1.5s 리셋 + 1.2s before 홀드
      }, 2700); // 1.5s 트랜지션 + 1.2s after 홀드
    };

    restoreCycleRef.current = setTimeout(runCycle, 700);
    return () => { if (restoreCycleRef.current) clearTimeout(restoreCycleRef.current); };
  }, [bento1Visible]);

  // 발견 카드 — 스크롤 진입 후 자동 활성
  const [discoveryActive, setDiscoveryActive] = useState(false);

  useEffect(() => {
    if (!bento2Visible) return;
    const delay = setTimeout(() => setDiscoveryActive(true), 400);
    return () => clearTimeout(delay);
  }, [bento2Visible]);

  // 복원 슬라이더: idle=50%, active=8%
  const dividerPct = restoreActive ? 8 : 50;

  // 다이어리 카드 — 타이프라이터 사이클
  const [diaryActive, setDiaryActive] = useState(false);
  const [diaryEntryIdx, setDiaryEntryIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [textComplete, setTextComplete] = useState(false);
  const diaryTypeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diaryCycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!diaryVisible) return;
    const t = setTimeout(() => setDiaryActive(true), 500);
    return () => clearTimeout(t);
  }, [diaryVisible]);

  useEffect(() => {
    if (!diaryActive) return;
    if (diaryTypeRef.current) clearInterval(diaryTypeRef.current);
    if (diaryCycleRef.current) clearTimeout(diaryCycleRef.current);

    const fullText = DIARY_DATA[diaryEntryIdx].text;
    let i = 0;
    setTypedText('');
    setTextComplete(false);

    diaryTypeRef.current = setInterval(() => {
      i++;
      setTypedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(diaryTypeRef.current!);
        setTextComplete(true);
        // 2.5s 홀드 후 다음 항목으로
        diaryCycleRef.current = setTimeout(() => {
          setTextComplete(false);
          setTypedText('');
          setDiaryEntryIdx(idx => (idx + 1) % DIARY_DATA.length);
        }, 2500);
      }
    }, 42);

    return () => {
      if (diaryTypeRef.current) clearInterval(diaryTypeRef.current);
      if (diaryCycleRef.current) clearTimeout(diaryCycleRef.current);
    };
  }, [diaryActive, diaryEntryIdx]);

  return (
    <div className="fixed inset-0 bg-canvas overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

      {/* ── 배경 glow (고정) ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.10] blur-[160px]"
          style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-[-10%] w-[320px] h-[320px] rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #8B6914 0%, transparent 70%)' }}
        />
      </div>

      {/* ══ 히어로 — 전체 뷰포트 ══ */}
      <section
        className="relative min-h-dvh flex flex-col items-center justify-center px-8"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div
          className="w-full max-w-xs text-center transition-all duration-700 ease-out"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(20px)' }}
        >
          {/* 렌즈 아이콘 */}
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-10"
            style={{
              background: 'rgba(212,165,116,0.07)',
              border: '1px solid rgba(212,165,116,0.18)',
              boxShadow: '0 0 40px rgba(212,165,116,0.08)',
            }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ border: '1.5px solid rgba(212,165,116,0.45)' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(212,165,116,0.45)' }} />
            </div>
          </div>

          {/* 워드마크 */}
          <h1
            className="animate-char-in"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 12vw, 3.4rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: '#D4A574',
              textShadow: '0 0 48px rgba(212,165,116,0.22)',
              animationDuration: '0.6s',
            }}
          >
            TimeLens
          </h1>

          {/* 장식선 */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="h-px w-14 animate-line-in"
              style={{ background: 'linear-gradient(to right, transparent, rgba(212,165,116,0.4))' }} />
            <div className="animate-line-in w-1 h-1 rounded-full bg-timelens-gold/50" />
            <div className="h-px w-14 animate-line-in"
              style={{ background: 'linear-gradient(to left, transparent, rgba(212,165,116,0.4))' }} />
          </div>

          {/* 캐치프레이즈 */}
          <p className="animate-subtitle-in mt-5 leading-relaxed"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 400,
              color: 'rgba(200,168,120,0.7)',
              letterSpacing: '0.01em',
            }}>
            박물관이 살아 숨쉬는 경험
          </p>
          <p className="text-xs text-gray-600 mt-2 tracking-widest uppercase animate-subtitle-in"
            style={{ animationDelay: '0.85s' }}>
            AI Cultural Heritage Companion
          </p>

          {/* CTA */}
          <div className="mt-12 transition-all duration-500 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'translateY(12px)',
              transitionDelay: '600ms',
            }}>
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="w-full h-14 rounded-2xl font-semibold text-base
                         active:scale-[0.98] transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #C8935A 0%, #D4A574 50%, #B8793A 100%)',
                color: '#1a0f00',
                boxShadow: '0 4px 28px rgba(212,165,116,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                  시작 중...
                </span>
              ) : '시작하기'}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-4">
              <Mic className="w-3 h-3 text-gray-700" />
              <p className="text-[12px] text-gray-600">카메라와 마이크 권한이 필요합니다</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 서비스 소개 ══ */}
      <section
        className="relative w-full max-w-sm mx-auto px-6"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >

        {/* 섹션 진입 구분 */}
        <div className="flex items-center gap-4 pt-6 mb-12">
          <div className="h-px flex-1" style={{ background: 'rgba(212,165,116,0.08)' }} />
          <p className="text-[12px] text-gray-700 tracking-[0.25em] uppercase">What we do</p>
          <div className="h-px flex-1" style={{ background: 'rgba(212,165,116,0.08)' }} />
        </div>

        {/* ── 01 빅 스테이트먼트 ── */}
        <div ref={statementRef} className="mb-12" style={rv(statementVisible)}>
          <p className="text-[12px] text-gray-700 tracking-[0.2em] uppercase mb-5">Overview</p>
          <h2
            className="leading-[1.2] mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.9rem, 9vw, 2.25rem)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            유물에 카메라를<br />
            비추는 순간,<br />
            <span style={{ color: '#D4A574' }}>천 년의 이야기</span>가<br />
            시작됩니다.
          </h2>
          <p className="text-sm text-gray-500 leading-[1.85]">
            AI가 문화유산을 인식하고, 복원하고,<br />
            당신만의 역사 여행을 기록합니다.
          </p>
        </div>

        {/* ── 02 스탯 행 ── */}
        <div
          ref={statsRef}
          className="grid grid-cols-3 rounded-2xl mb-12 border border-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.025)' }}
        >
          {[
            { value: '3초', label: '평균 인식 속도' },
            { value: '1만+', label: '등록 문화유산' },
            { value: '24/7', label: 'AI 음성 도슨트' },
          ].map((stat, i) => (
            <div
              key={i}
              className={`py-7 text-center ${i < 2 ? 'border-r border-white/[0.05]' : ''}`}
              style={{
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? 'none' : 'translateY(12px)',
                transition: `opacity 0.6s ease ${i * 150}ms, transform 0.6s ease ${i * 150}ms`,
              }}
            >
              <p
                className="text-[1.75rem] font-bold leading-none"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: '#D4A574',
                  textShadow: '0 0 20px rgba(212,165,116,0.25)',
                }}
              >
                {stat.value}
              </p>
              <p className="text-[12px] text-gray-600 mt-2 leading-tight px-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── 03 실시간 유물 인식 ── */}
        <div
          ref={cameraRef}
          className="rounded-3xl overflow-hidden mb-12 border"
          style={{
            ...rv(cameraVisible),
            background: 'rgba(212,165,116,0.03)',
            borderColor: cameraActive ? 'rgba(212,165,116,0.22)' : 'rgba(255,255,255,0.07)',
            boxShadow: cameraActive
              ? '0 8px 56px rgba(212,165,116,0.18), 0 0 0 1px rgba(212,165,116,0.1)'
              : '0 8px 48px rgba(0,0,0,0.55)',
            transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
          }}
        >
          {/* 뷰파인더 */}
          <div
            className="relative w-full h-56 overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(20,14,6,0.7) 0%, rgba(5,3,1,0.95) 100%)' }}
          >
            <div className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: 'linear-gradient(rgba(212,165,116,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,165,116,1) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />

            {/* 스캔 라인 — active 시 속도 2배 + 밝기 상승 */}
            <div
              className="absolute inset-x-0 h-px pointer-events-none"
              style={{
                top: 0,
                background: `linear-gradient(to right, transparent 0%, rgba(212,165,116,${cameraActive ? '0.9' : '0.65'}) 25%, rgba(212,165,116,${cameraActive ? '0.9' : '0.65'}) 75%, transparent 100%)`,
                boxShadow: `0 0 ${cameraActive ? '14px' : '8px'} rgba(212,165,116,${cameraActive ? '0.55' : '0.35'})`,
                animation: cameraVisible
                  ? `scan-sweep ${cameraActive ? '1.1s' : '2.6s'} ease-in-out infinite alternate`
                  : 'none',
                transition: 'box-shadow 0.3s ease',
              }}
            />

            {/* 모서리 브라켓 — active 시 골드 강조 */}
            {(['tl','tr','bl','br'] as const).map(pos => (
              <div
                key={pos}
                className={`absolute w-5 h-5 ${pos.startsWith('t') ? 'top-5' : 'bottom-5'} ${pos.endsWith('l') ? 'left-5' : 'right-5'}`}
                style={{
                  borderTopWidth:    pos.startsWith('t') ? '1.5px' : undefined,
                  borderBottomWidth: pos.startsWith('b') ? '1.5px' : undefined,
                  borderLeftWidth:   pos.endsWith('l')   ? '1.5px' : undefined,
                  borderRightWidth:  pos.endsWith('r')   ? '1.5px' : undefined,
                  borderStyle: 'solid',
                  borderColor: cameraActive ? 'rgba(212,165,116,0.95)' : 'rgba(212,165,116,0.50)',
                  transition: 'border-color 0.35s ease',
                }}
              />
            ))}

            {/* 탐지 박스 — active 시 초록 잠금 */}
            <div
              className="absolute inset-x-12 inset-y-9 rounded-xl flex items-center justify-center"
              style={{
                border: cameraActive
                  ? '1.5px solid rgba(52,211,153,0.75)'
                  : '1px dashed rgba(212,165,116,0.28)',
                boxShadow: cameraActive
                  ? '0 0 18px rgba(52,211,153,0.18), inset 0 0 18px rgba(52,211,153,0.05)'
                  : 'none',
                transition: 'border 0.35s ease, box-shadow 0.35s ease',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  border: `1px solid rgba(${cameraActive ? '52,211,153,0.55' : '212,165,116,0.18'})`,
                  transition: 'border 0.35s ease',
                  animation: cameraActive ? 'glow-pulse 1.1s ease-in-out infinite' : 'none',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: cameraActive ? 'rgba(52,211,153,0.9)' : 'rgba(212,165,116,0.45)',
                    transition: 'background 0.35s ease',
                  }}
                />
              </div>
            </div>

            {/* 상태바 */}
            <div className="absolute top-5 inset-x-0 flex justify-center">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: cameraActive ? '#34d399' : '#ef4444',
                    boxShadow: cameraActive ? '0 0 4px #34d399' : '0 0 4px #ef4444',
                    transition: 'background 0.3s ease, box-shadow 0.3s ease',
                  }}
                />
                <span className="text-[12px] text-gray-500 tracking-widest uppercase">
                  {cameraActive ? 'Analyzing' : 'Live Scan'}
                </span>
              </div>
            </div>

            {/* 인식 결과 — active 시 유물 사이클 */}
            <div className="absolute bottom-5 inset-x-0 flex justify-center">
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-medium"
                style={{
                  background: cameraActive ? 'rgba(52,211,153,0.10)' : 'rgba(212,165,116,0.10)',
                  border: `1px solid ${cameraActive ? 'rgba(52,211,153,0.30)' : 'rgba(212,165,116,0.20)'}`,
                  color: cameraActive ? 'rgba(52,211,153,0.95)' : 'rgba(212,165,116,0.85)',
                  backdropFilter: 'blur(8px)',
                  opacity: artifactVisible ? 1 : 0,
                  transition: 'opacity 0.28s ease, background 0.3s ease, border 0.3s ease, color 0.3s ease',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ boxShadow: '0 0 5px #34d399' }}
                />
                {ARTIFACTS[artifactIdx]}
              </div>
            </div>
          </div>

          {/* 텍스트 */}
          <div className="px-6 pt-6 pb-7">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(212,165,116,0.12)' }}>
                <Camera className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight">실시간 유물 인식</h3>
            </div>
            <p className="text-sm text-gray-400 leading-[1.8]">
              카메라를 유물에 비추는 것만으로 AI가 즉시 인식하고,
              음성으로 생생한 이야기를 들려줍니다.
            </p>
          </div>
        </div>

        {/* ── AI 유물 복원 ── */}
        <div
          ref={bento1Ref}
          className="rounded-3xl overflow-hidden mb-12 border"
          style={{
            ...rv(bento1Visible),
            background: 'rgba(167,139,250,0.04)',
            borderColor: bento1Visible ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.07)',
            boxShadow: '0 8px 56px rgba(167,139,250,0.18), 0 0 0 1px rgba(167,139,250,0.1)',
          }}
        >
          <div className="relative h-44 overflow-hidden" style={{ background: 'rgba(8,5,18,0.85)' }}>

            {/* AFTER 레이어 — full-width, 왼쪽에서 clip 시작 → hover 시 전체 노출 */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                clipPath: `inset(0 0 0 ${dividerPct}%)`,
                transition: 'clip-path 1.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div className="space-y-2 w-full px-6">
                {[70, 48, 62, 40, 55].map((w, i) => (
                  <div
                    key={i}
                    className="h-[3px] rounded-full"
                    style={{
                      width: `${w}%`,
                      marginLeft: `${(100 - w) / 2}%`,
                      background: 'rgba(167,139,250,0.75)',
                      boxShadow: '0 0 5px rgba(167,139,250,0.4)',
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[12px] tracking-widest mt-3"
                style={{ color: 'rgba(167,139,250,0.7)' }}
              >
                AFTER
              </span>
            </div>

            {/* BEFORE 레이어 — full-width, 오른쪽으로 clip 아웃 */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                clipPath: `inset(0 ${100 - dividerPct}% 0 0)`,
                transition: 'clip-path 1.5s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <div className="space-y-2 w-full px-6 opacity-30">
                {[70, 48, 62, 40, 55].map((w, i) => (
                  <div
                    key={i}
                    className="h-[3px] rounded-full bg-gray-400"
                    style={{ width: `${w}%`, marginLeft: `${(100 - w) / 2}%` }}
                  />
                ))}
              </div>
              <span className="text-[12px] text-gray-600 tracking-widest mt-3">BEFORE</span>
            </div>

            {/* 디바이더 선 — 슬라이드 이동 */}
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${dividerPct}%`,
                background: 'linear-gradient(to bottom, transparent, rgba(167,139,250,0.7) 30%, rgba(167,139,250,0.7) 70%, transparent)',
                boxShadow: '0 0 10px rgba(167,139,250,0.5)',
                transition: 'left 1.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease',
                opacity: dividerPct < 12 ? 0 : 1,
              }}
            />

            {/* 스파클 아이콘 — 슬라이드 이동 후 페이드아웃 */}
            <div
              className="absolute top-1/2 z-10 pointer-events-none"
              style={{
                left: `${dividerPct}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 1.5s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
                opacity: dividerPct < 20 ? 0 : 1,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(167,139,250,0.14)',
                  border: '1px solid rgba(167,139,250,0.28)',
                  animation: 'restore-glow 1s ease-in-out infinite',
                }}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            {/* "복원 완료" 뱃지 — 슬라이드 완료 후 등장 */}
            <div
              className="absolute bottom-4 inset-x-0 flex justify-center z-20 pointer-events-none"
              style={{
                opacity: restoreActive && dividerPct < 15 ? 1 : 0,
                transition: 'opacity 0.5s ease 0.8s',
              }}
            >
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]"
                style={{
                  background: 'rgba(167,139,250,0.15)',
                  border: '1px solid rgba(167,139,250,0.3)',
                  color: 'rgba(167,139,250,0.9)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Sparkles className="w-3 h-3" />
                복원 완료
              </div>
            </div>
          </div>

          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(167,139,250,0.12)' }}>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight">AI 유물 복원</h3>
            </div>
            <p className="text-sm text-gray-400 leading-[1.8]">
              세월에 닳고 손상된 유물의 원래 모습을
              역사적 고증에 맞게 복원합니다.
            </p>
          </div>
        </div>

        {/* ── 주변 유산 발견 ── */}
        <div
          ref={bento2Ref}
          className="rounded-3xl overflow-hidden mb-12 border"
          style={{
            ...rv(bento2Visible),
            background: 'rgba(52,211,153,0.03)',
            borderColor: discoveryActive ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)',
            boxShadow: discoveryActive
              ? '0 8px 56px rgba(52,211,153,0.14), 0 0 0 1px rgba(52,211,153,0.08)'
              : '0 8px 40px rgba(0,0,0,0.5)',
            transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
          }}
        >
          <div className="relative h-44 overflow-hidden" style={{ background: 'rgba(0,10,7,0.85)' }}>
            {/* 그리드 */}
            <div className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(52,211,153,1) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,1) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                opacity: discoveryActive ? 0.1 : 0.07,
                transition: 'opacity 0.4s ease',
              }} />

            {/* 레이더 스윕 — 위치 dot 기준 회전 */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: 'calc(50% - 88px)',
                top: 'calc(50% - 88px)',
                width: '176px',
                height: '176px',
                opacity: discoveryActive ? 1 : 0,
                transition: 'opacity 0.5s ease',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, transparent 260deg, rgba(52,211,153,0.18) 330deg, rgba(52,211,153,0.06) 360deg)',
                  animation: discoveryActive ? 'radar-sweep 2.2s linear infinite' : 'none',
                }}
              />
            </div>

            {/* 유산 점들 */}
            {HERITAGE_SITES.map((site, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: site.x,
                  top: site.y,
                  transform: 'translate(-50%,-50%)',
                  opacity: bento2Visible ? 1 : 0,
                  transition: `opacity 0.5s ease ${site.delay}ms`,
                }}
              >
                {/* dot */}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: discoveryActive ? 'rgba(52,211,153,0.95)' : 'rgba(52,211,153,0.6)',
                    boxShadow: discoveryActive ? '0 0 8px rgba(52,211,153,0.7)' : '0 0 5px rgba(52,211,153,0.45)',
                    animation: discoveryActive
                      ? `dot-pop 0.4s cubic-bezier(0.16,1,0.3,1) ${site.delay}ms both`
                      : 'none',
                    transition: 'background 0.3s ease, box-shadow 0.3s ease',
                  }}
                />
                {/* 이름 라벨 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    left: i % 2 === 0 ? '10px' : 'auto',
                    right: i % 2 !== 0 ? '10px' : 'auto',
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    color: 'rgba(52,211,153,0.8)',
                    letterSpacing: '0.04em',
                    opacity: discoveryActive ? 1 : 0,
                    transition: `opacity 0.4s ease ${site.delay + 150}ms`,
                    pointerEvents: 'none',
                  }}
                >
                  {site.name}
                  <span style={{ color: 'rgba(52,211,153,0.45)', marginLeft: '3px' }}>
                    {site.dist}
                  </span>
                </div>
              </div>
            ))}

            {/* 내 위치 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-4 h-4 rounded-full bg-timelens-gold flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full bg-timelens-gold/30 animate-ping"
                  style={{ animationDuration: discoveryActive ? '1.0s' : '1.8s' }}
                />
                <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              </div>
            </div>

            {/* 반경 원 */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full pointer-events-none"
              style={{
                border: discoveryActive
                  ? '1px dashed rgba(52,211,153,0.3)'
                  : '1px dashed rgba(212,165,116,0.18)',
                transition: 'border 0.4s ease',
              }}
            />

            {/* "탐색 중" 뱃지 */}
            <div
              className="absolute top-4 inset-x-0 flex justify-center pointer-events-none"
              style={{
                opacity: discoveryActive ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
            >
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px]"
                style={{
                  background: 'rgba(52,211,153,0.10)',
                  border: '1px solid rgba(52,211,153,0.20)',
                  color: 'rgba(52,211,153,0.8)',
                }}
              >
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                주변 탐색 중
              </div>
            </div>
          </div>

          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(52,211,153,0.12)' }}>
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight">주변 유산 발견</h3>
            </div>
            <p className="text-sm text-gray-400 leading-[1.8]">
              지금 서 있는 곳을 기준으로
              걸어서 갈 수 있는 문화유산을 찾아드립니다.
            </p>
          </div>
        </div>

        {/* ── 방문 다이어리 ── */}
        <div
          ref={diaryRef}
          className="rounded-3xl overflow-hidden mb-24 border border-white/[0.07]"
          style={{
            ...rv(diaryVisible),
            background: 'rgba(96,165,250,0.03)',
            boxShadow: diaryActive
              ? '0 8px 56px rgba(96,165,250,0.12), 0 0 0 1px rgba(96,165,250,0.08)'
              : '0 8px 48px rgba(0,0,0,0.55)',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {/* 비주얼 영역 — h-44, 타이프라이터 */}
          <div
            className="relative h-44 overflow-hidden"
            style={{ background: 'rgba(3,6,18,0.90)' }}
          >
            {/* 노트 라인 — 가로줄 */}
            {[0,1,2,3,4,5].map(i => (
              <div
                key={i}
                className="absolute inset-x-0 h-px"
                style={{
                  top: `${28 + i * 22}px`,
                  background: 'rgba(96,165,250,0.05)',
                }}
              />
            ))}

            {/* 좌측 여백선 */}
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: '20px', background: 'rgba(96,165,250,0.07)' }}
            />

            {/* 헤더 */}
            <div className="absolute top-4 left-8 right-5 flex items-center justify-between">
              <span className="text-[12px] tracking-[0.22em] uppercase"
                style={{ color: 'rgba(96,165,250,0.45)' }}>
                AI Diary
              </span>
              <span className="text-[12px]" style={{ color: 'rgba(212,165,116,0.45)' }}>
                2026.03.13
              </span>
            </div>

            {/* 타이프라이터 텍스트 */}
            <div className="absolute top-10 left-8 right-5 bottom-10">
              <p
                className="text-[12px] leading-[1.85] italic"
                style={{ color: 'rgba(200,210,240,0.72)' }}
              >
                &ldquo;{typedText}
                {!textComplete && diaryActive && (
                  <span
                    className="animate-blink-cursor not-italic font-light ml-[1px]"
                    style={{ color: 'rgba(96,165,250,0.7)' }}
                  >
                    |
                  </span>
                )}
                {typedText.length > 0 && textComplete && '\u201d'}
              </p>
            </div>

            {/* 태그 — 타이핑 완료 후 fade-in */}
            <div className="absolute bottom-3 left-8 right-5 flex gap-1.5 flex-wrap">
              {textComplete && DIARY_DATA[diaryEntryIdx].tags.map((tag, i) => (
                <span
                  key={tag}
                  className="text-[12px] px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(96,165,250,0.08)',
                    border: '1px solid rgba(96,165,250,0.15)',
                    color: 'rgba(96,165,250,0.6)',
                    animation: `tag-fade-in 0.4s ease ${i * 80}ms both`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* AI 생성 뱃지 */}
            <div
              className="absolute top-4 right-5"
              style={{
                opacity: diaryActive ? 1 : 0,
                transition: 'opacity 0.5s ease',
              }}
            >
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[12px]"
                style={{
                  background: 'rgba(96,165,250,0.08)',
                  border: '1px solid rgba(96,165,250,0.15)',
                  color: 'rgba(96,165,250,0.6)',
                }}
              >
                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                작성 중
              </div>
            </div>
          </div>

          {/* 텍스트 영역 */}
          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(96,165,250,0.12)' }}>
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight">방문 다이어리</h3>
            </div>
            <p className="text-sm text-gray-400 leading-[1.8]">
              오늘의 관람을 AI가 기억하고 감성적인 다이어리로 정리해 드립니다.
            </p>
          </div>
        </div>

        {/* ── 마퀴 스트립 ── */}
        <div ref={marqueeRef} style={rv(marqueeVisible)}>
          <p className="text-[12px] text-gray-700 tracking-[0.25em] uppercase text-center mb-6">
            탐험 가능한 공간
          </p>
          <div className="h-px w-full mb-6" style={{ background: 'rgba(212,165,116,0.07)' }} />

          <div
            className="relative overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
            }}
          >
            <div className="flex w-max" style={{ animation: 'marquee 28s linear infinite' }}>
              {[...MUSEUMS, ...MUSEUMS].map((name, i) => (
                <span
                  key={i}
                  className="text-[12px] text-gray-600 whitespace-nowrap flex items-center"
                  style={{ gap: '20px', paddingRight: '20px' }}
                >
                  {name}
                  <span className="w-[3px] h-[3px] rounded-full bg-gray-700 inline-block flex-shrink-0" />
                </span>
              ))}
            </div>
          </div>

          <div className="h-px w-full mt-6" style={{ background: 'rgba(212,165,116,0.07)' }} />
        </div>

        {/* 푸터 */}
        <div className="mt-12 text-center space-y-2">
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'rgba(212,165,116,0.2)',
              letterSpacing: '-0.01em',
            }}
          >
            TimeLens
          </p>
          <span className="text-[12px] text-gray-700 tracking-widest uppercase block">
            Powered by Gemini
          </span>
        </div>
      </section>
    </div>
  );
}
