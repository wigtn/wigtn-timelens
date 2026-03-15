// ============================================================
// 파일: src/web/components/TranscriptChat.tsx
// 역할: 채팅형 트랜스크립트 (모바일 메신저 스타일)
// ============================================================

'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { TranscriptProps } from '@shared/types/components';
import type { TranscriptChunk } from '@shared/types/live-session';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** TimeLens 렌즈 아이콘 — 메인 페이지 로고와 동일 디자인 */
const LENS_AVATAR = (
  <div className="w-4 h-4 rounded-full flex items-center justify-center"
    style={{ border: '1.5px solid rgba(212,165,116,0.55)' }}
  >
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(212,165,116,0.6)' }} />
  </div>
);

/** 인라인 마크다운(굵게, 이탤릭) 파싱 */
function InlineText({ text }: { text: string }) {
  // **bold** → <strong>, *italic* → <em>
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-white/90">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** AI 응답 텍스트를 단락/목록 단위로 렌더링 */
function AiTextContent({ text }: { text: string }) {
  // 빈줄 기준으로 단락 분리
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-2">
      {paragraphs.map((para, pi) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // 불릿 리스트 (- or • or *)
        const bulletLines = trimmed.split('\n').filter(Boolean);
        const isList = bulletLines.every(l => /^[-•*]\s/.test(l.trim()));
        if (isList && bulletLines.length > 1) {
          return (
            <ul key={pi} className="flex flex-col gap-0.5 pl-1">
              {bulletLines.map((l, li) => (
                <li key={li} className="flex gap-1.5">
                  <span className="text-white/30 shrink-0 mt-0.5">·</span>
                  <span><InlineText text={l.replace(/^[-•*]\s/, '')} /></span>
                </li>
              ))}
            </ul>
          );
        }

        // 번호 리스트 (1. 2. 3.)
        const isNumList = bulletLines.every(l => /^\d+\.\s/.test(l.trim()));
        if (isNumList && bulletLines.length > 1) {
          return (
            <ol key={pi} className="flex flex-col gap-0.5 pl-1">
              {bulletLines.map((l, li) => (
                <li key={li} className="flex gap-1.5">
                  <span className="text-white/30 shrink-0 tabular-nums">{li + 1}.</span>
                  <span><InlineText text={l.replace(/^\d+\.\s/, '')} /></span>
                </li>
              ))}
            </ol>
          );
        }

        // 일반 단락 (단일 줄바꿈 처리)
        const lines = trimmed.split('\n');
        if (lines.length > 1) {
          return (
            <div key={pi} className="flex flex-col gap-0.5">
              {lines.map((line, li) => (
                <p key={li}><InlineText text={line} /></p>
              ))}
            </div>
          );
        }

        return <p key={pi}><InlineText text={trimmed} /></p>;
      })}
    </div>
  );
}

const ChatBubble = memo(function ChatBubble({
  chunk,
  locale = 'ko',
  showTime,
}: {
  chunk: TranscriptChunk;
  locale?: Locale;
  showTime: boolean;
}) {
  const isUser = chunk.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-2.5',
        isUser ? 'justify-end pl-10' : 'justify-start pr-10',
        'animate-[fadeInUp_0.3s_ease-out_forwards] opacity-0',
      )}
      style={{ animationFillMode: 'forwards' }}
    >
      {/* AI 아바타 — 정적 */}
      {!isUser && (
        <div className="shrink-0 self-start mt-5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(212,165,116,0.07)',
              border: '1px solid rgba(212,165,116,0.22)',
            }}
          >
            {LENS_AVATAR}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-0.5 min-w-0">
        {/* AI 이름 라벨 */}
        {!isUser && (
          <span className="text-[10px] font-semibold tracking-wider uppercase ml-1"
            style={{ color: 'rgba(155,114,203,0.6)' }}>
            TimeLens
          </span>
        )}

        {/* 버블 */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.65] break-words text-white',
            isUser ? 'rounded-br-md' : 'rounded-bl-md',
          )}
          style={isUser ? {
            background: 'rgba(212,165,116,0.20)',
            border: '1px solid rgba(212,165,116,0.35)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          } : {
            background: 'rgba(5,3,10,0.75)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{chunk.text}</p>
          ) : (
            <AiTextContent text={chunk.text} />
          )}

          {/* 검색 소스 */}
          {chunk.sources && chunk.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center gap-1">
              <Search className="w-3 h-3 text-gray-500 shrink-0" />
              <span className="text-[10px] text-gray-500">
                {t('chat.sources', locale)}
              </span>
            </div>
          )}
        </div>

        {/* 타임스탬프 */}
        {showTime && (
          <span
            className={cn(
              'text-[10px] text-white/30 mt-0.5',
              isUser ? 'text-right mr-1' : 'ml-1',
            )}
          >
            {formatTime(chunk.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
});

/** 메시지 간 시간 간격이 60초 이상이면 타임스탬프 표시 */
function shouldShowTime(chunks: TranscriptChunk[], index: number): boolean {
  if (index === 0) return true;
  const prev = chunks[index - 1];
  const curr = chunks[index];
  // 역할이 바뀌거나 60초 이상 간격
  return curr.role !== prev.role || curr.timestamp - prev.timestamp > 60000;
}

export default function TranscriptChat({ chunks, isStreaming, locale = 'ko', onScrollUp }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, isAutoScroll, isStreaming]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop < lastScrollTopRef.current - 10) {
      onScrollUp?.();
    }
    lastScrollTopRef.current = scrollTop;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAutoScroll(isAtBottom);
  }, [onScrollUp]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex flex-col gap-3 h-full overflow-y-auto overscroll-contain scrollbar-hide py-2"
    >
      {chunks.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full opacity-40 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-xl">&#127963;</span>
          </div>
          <span className="text-xs text-gray-500">{t('chat.empty', locale)}</span>
        </div>
      )}

      {chunks.map((chunk, i) => (
        <ChatBubble
          key={chunk.id}
          chunk={chunk}
          locale={locale}
          showTime={shouldShowTime(chunks, i)}
        />
      ))}

      {/* Typing indicator removed — top nav audio visualizer + streaming transcript already show AI is speaking */}
    </div>
  );
}
