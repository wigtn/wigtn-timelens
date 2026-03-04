// ============================================================
// 파일: src/app/session/layout.tsx
// 담당: Part 2
// 역할: 메인 화면 레이아웃 — ErrorBoundary 래핑 + 전체 화면 고정
// 출처: part2-curator-ui.md §3.3
// ============================================================

import ErrorBoundary from '@/components/ErrorBoundary';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="fixed inset-0 flex flex-col bg-black">
        {children}
      </div>
    </ErrorBoundary>
  );
}
