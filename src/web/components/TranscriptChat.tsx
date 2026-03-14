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
      {/* AI 아바타 */}
      {!isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-timelens-gold/40 to-timelens-bronze/30
                      border border-timelens-gold/25 flex items-center justify-center mt-0.5
                      shadow-sm shadow-timelens-gold/10"
        >
          <span className="text-sm leading-none">&#127963;</span>
        </div>
      )}

      <div className="flex flex-col gap-0.5 min-w-0">
        {/* AI 이름 라벨 */}
        {!isUser && (
          <span className="text-[10px] font-semibold text-timelens-gold/60 tracking-wider uppercase ml-1">
            TimeLens
          </span>
        )}

        {/* 버블 */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6] break-words',
            isUser
              ? 'bg-white/[0.12] text-white rounded-br-md backdrop-blur-sm border border-white/[0.08]'
              : 'bg-gradient-to-br from-white/[0.07] to-white/[0.03] text-gray-100 rounded-bl-md backdrop-blur-sm border border-white/[0.08]',
          )}
        >
          <p className="whitespace-pre-wrap">{chunk.text}</p>

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

export default function TranscriptChat({ chunks, isStreaming, locale = 'ko' }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, isAutoScroll, isStreaming]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAutoScroll(isAtBottom);
  }, []);

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
