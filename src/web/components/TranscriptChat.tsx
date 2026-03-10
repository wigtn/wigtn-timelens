// ============================================================
// 파일: src/web/components/TranscriptChat.tsx
// 역할: 채팅형 트랜스크립트
// ============================================================

'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import type { TranscriptProps } from '@shared/types/components';
import type { TranscriptChunk } from '@shared/types/live-session';
import { cn } from '@web/lib/utils';
import { t, type Locale } from '@shared/i18n';

const ChatBubble = memo(function ChatBubble({ chunk, locale = 'ko' }: { chunk: TranscriptChunk; locale?: Locale }) {
  const isUser = chunk.role === 'user';

  return (
    <div className={cn('flex gap-2 animate-msg-fade-in', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-timelens-gold/30 to-timelens-bronze/20
                        border border-timelens-gold/20 flex items-center justify-center mt-0.5">
          <span className="text-xs">🏛</span>
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-white/10 text-white rounded-br-md border border-white/[0.06]'
            : 'bg-gradient-to-br from-white/[0.06] to-white/[0.02] text-gray-100 rounded-bl-md border border-white/[0.06]',
        )}
      >
        {!isUser && (
          <span className="text-[10px] font-semibold text-timelens-gold/70 tracking-wide uppercase block mb-1">
            TimeLens
          </span>
        )}

        <p className="whitespace-pre-wrap">{chunk.text}</p>

        {chunk.sources && chunk.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <span className="text-[10px] text-gray-500 italic">{t('chat.sources', locale)}</span>
          </div>
        )}
      </div>
    </div>
  );
});

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-start">
      <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-timelens-gold/30 to-timelens-bronze/20
                      border border-timelens-gold/20 flex items-center justify-center">
        <span className="text-xs">🏛</span>
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gradient-to-br from-white/[0.06] to-white/[0.02]
                      border border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-timelens-gold/60"
              style={{
                animation: `typing-dot 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
      className="space-y-3 h-full overflow-y-auto overscroll-contain scrollbar-hide"
    >
      {chunks.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full opacity-40">
          <span className="text-2xl mb-2">🏛</span>
          <span className="text-xs text-gray-500">{t('chat.empty', locale)}</span>
        </div>
      )}

      {chunks.map((chunk) => (
        <ChatBubble key={chunk.id} chunk={chunk} locale={locale} />
      ))}

      {isStreaming && <TypingIndicator />}
    </div>
  );
}
