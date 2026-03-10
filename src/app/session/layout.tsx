// ============================================================
// 파일: src/app/session/layout.tsx
// 역할: 메인 화면 레이아웃 — ErrorBoundary + I18nProvider 래핑
// ============================================================

'use client';

import ErrorBoundary from '@web/components/ErrorBoundary';
import { I18nProvider } from '@web/lib/i18n';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <div className="fixed inset-0 flex flex-col bg-black">
          {children}
        </div>
      </I18nProvider>
    </ErrorBoundary>
  );
}
