// ============================================================
// 파일: src/components/ErrorBoundary.tsx
// 담당: Part 2
// 역할: React Error Boundary — 렌더링 에러 포착 + 복구 UI
// 출처: part2-curator-ui.md §3.12
// ============================================================

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

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

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <span className="text-3xl" role="img" aria-label="warning">
              ⚠️
            </span>
          </div>

          <h2 className="text-xl font-heading font-bold text-white text-center">
            문제가 발생했습니다
          </h2>

          <p className="text-gray-400 text-center mt-3 text-sm">
            {this.state.error?.message || '알 수 없는 오류가 발생했습니다'}
          </p>

          <button
            onClick={this.handleRetry}
            className="mt-8 px-8 py-3 bg-white text-black rounded-full font-medium"
          >
            다시 시도
          </button>

          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-8 py-3 text-gray-400 text-sm"
          >
            페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
