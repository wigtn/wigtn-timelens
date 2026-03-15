// ============================================================
// 파일: src/app/session/layout.tsx
// 역할: 메인 화면 레이아웃 — ErrorBoundary + I18nProvider 래핑
// ============================================================

'use client';

import { Suspense } from 'react';
import ErrorBoundary from '@web/components/ErrorBoundary';
import { I18nProvider } from '@web/lib/i18n';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <Suspense>
          <div className="fixed inset-0 flex flex-col bg-canvas">
            {/* 메인 랜딩과 동일한 배경 글로우 */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.10] blur-[160px]"
                style={{ background: 'radial-gradient(circle, #D4A574 0%, transparent 70%)' }}
              />
              <div
                className="absolute bottom-0 right-[-10%] w-[320px] h-[320px] rounded-full opacity-[0.06] blur-[100px]"
                style={{ background: 'radial-gradient(circle, #8B6914 0%, transparent 70%)' }}
              />
            </div>
            {children}
          </div>
        </Suspense>
      </I18nProvider>
    </ErrorBoundary>
  );
}
