// ============================================================
// 파일: src/components/ErrorBoundary.tsx
// 담당: Part 2
// 역할: React Error Boundary — 렌더링 에러 포착 + 복구 UI
// 출처: part2-curator-ui.md §3.12
// ============================================================

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { t, type Locale } from '@shared/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private getLocale(): Locale {
    if (typeof window !== 'undefined') {
      const lang = navigator.language;
      if (lang.startsWith('ko')) return 'ko';
    }
    return 'en';
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const locale = this.getLocale();

      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <span className="text-3xl" role="img" aria-label="warning">
              ⚠️
            </span>
          </div>

          <h2 className="text-xl font-heading font-bold text-white text-center">
            {t('error.title', locale)}
          </h2>

          <p className="text-gray-400 text-center mt-3 text-sm">
            {this.state.error?.message || t('error.unknown', locale)}
          </p>

          <button
            onClick={this.handleRetry}
            className="mt-8 px-8 py-3 bg-white text-black rounded-full font-medium"
          >
            {t('error.retry', locale)}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-8 py-3 text-gray-400 text-sm"
          >
            {t('error.refresh', locale)}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
