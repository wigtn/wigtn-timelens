# TimeLens Part 5: Infrastructure + DevOps -- 상세 설계 문서

> **파트**: Part 5 (인프라 + DevOps)
> **버전**: 1.0
> **최종 수정**: 2026-03-04
> **목적**: Claude Code가 이 문서만 읽고 Part 5의 모든 파일을 독립적으로 구현할 수 있는 수준의 상세 명세
> **참조 문서**: `docs/contracts/shared-contract.md`, `docs/contracts/gemini-sdk-reference.md`, `docs/prd/timelens-prd-ko.md`, `docs/contracts/README.md`
>
> **Source of Truth**: env var / model ID → `docs/reference/gemini-sdk-reference.md` · 타입 / 파일 소유권 → `docs/contracts/shared-contract.md` · 충돌 시 위 문서가 우선

---

## 0. 아키텍처 결정 요약 (확정)

| 결정 | 내용 |
|---|---|
| **프레임워크** | Next.js 15 (App Router, Server Components, API Routes) |
| **언어** | TypeScript 5.x |
| **스타일링** | Tailwind CSS 4.x (유틸리티 퍼스트, 모바일 반응형) |
| **UI 컴포넌트** | shadcn/ui (사전 제작 접근성 컴포넌트) |
| **인증** | Firebase Anonymous Auth (PII 수집 없음) |
| **데이터베이스** | Firestore (서버리스, 실시간 동기화, GCP 네이티브) |
| **배포** | Cloud Run (서버리스, 오토스케일링, WebSocket 지원) |
| **CI/CD** | Cloud Build (푸시 시 자동 배포) |
| **AI SDK** | `@google/genai` v1.43.0+ (필수), `@google/adk` v0.3.0 (멀티에이전트) |

### Part 5의 역할

Part 5는 **프로젝트의 토대**다. 모든 파트가 의존하는 기반을 제공한다:

```
Part 5 (인프라)
└──► 모든 파트에 제공:
     ├── 공유 타입 파일 (src/types/*.ts)
     ├── Firebase 설정 + CRUD 유틸
     ├── 프로젝트 스캐폴드 (package.json, tsconfig, next.config 등)
     ├── Docker + Cloud Run 배포
     ├── CI/CD 파이프라인
     └── 환경 변수 템플릿
```

**구현 순서**: Part 5 (스캐폴드) --> Part 1 (코어) --> Part 2/3/4 (병렬)

---

## 1. 파일 소유권 맵

```
# 프로젝트 루트
package.json                            ← 의존성 정의
next.config.ts                          ← Next.js 설정
tailwind.config.ts                      ← Tailwind CSS 설정
tsconfig.json                           ← TypeScript 설정
Dockerfile                              ← Cloud Run 배포용
cloudbuild.yaml                         ← CI/CD 파이프라인
.env.example                            ← 환경변수 템플릿
firestore.rules                         ← Firestore 보안 규칙
storage.rules                           ← Cloud Storage 보안 규칙

# 공유 타입 (shared-contract.md에서 추출)
src/types/
├── common.ts                           ← §A 공유 기본 타입
├── live-session.ts                     ← §B Live Session 타입
├── restoration.ts                      ← §C Restoration 타입
├── discovery.ts                        ← §D Discovery 타입
├── diary.ts                            ← §D Diary 타입
├── ws-messages.ts                      ← §E WebSocket 메시지 타입
├── api.ts                              ← §F REST API 타입
├── models.ts                           ← §G Firestore 모델 타입
└── env.d.ts                            ← §J 환경 변수 타입

# Firebase
src/lib/firebase/
├── config.ts                           ← Firebase 초기화
├── firestore.ts                        ← Firestore 유틸 (CRUD)
└── auth.ts                             ← Firebase Anonymous Auth

# UI 기반
src/app/globals.css                     ← 전역 스타일
src/lib/utils.ts                        ← cn() 등 유틸
src/components/ui/                      ← shadcn/ui 컴포넌트

# API
src/app/api/health/route.ts             ← Health check 엔드포인트

# PWA
public/manifest.json                    ← PWA 매니페스트
public/icons/                           ← 앱 아이콘
```

---

## 2. 파일별 상세 설계

---

### 2.1 `package.json` -- 프로젝트 의존성

**역할**: 전체 프로젝트의 npm 의존성과 스크립트를 정의한다. 모든 파트에서 필요한 패키지를 여기서 관리한다.

**내용**:

```json
{
  "name": "timelens",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "@google/genai": "^1.43.0",
    "@google/adk": "^0.3.0",

    "firebase": "^10.14.0",
    "firebase-admin": "^12.7.0",

    "zod": "^3.24.0",
    "dotenv": "^16.4.0",

    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.468.0",

    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-slider": "^1.2.2",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-scroll-area": "^1.2.2"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.5.0",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.3.0",
    "@eslint/eslintrc": "^3.2.0",
    "@google/adk-devtools": "^0.3.0"
  }
}
```

**구현 상세**:

1. **Core Framework**: `next` 15.x + `react` 19.x -- App Router 기반
2. **Gemini SDK**: `@google/genai` -- Live API, Image Generation 모두 이 패키지 사용. `@google/generative-ai`는 deprecated (2025-11-30)이므로 절대 사용 금지
3. **ADK**: `@google/adk` -- 멀티에이전트 오케스트레이션. `zod` 필수 의존성 (FunctionTool 파라미터 스키마)
4. **Firebase**: 클라이언트(`firebase`) + 서버(`firebase-admin`) 분리. Anonymous Auth, Firestore, Storage 사용
5. **UI**: shadcn/ui 기반으로 Radix UI 프리미티브 사용. `class-variance-authority` + `clsx` + `tailwind-merge`로 조건부 클래스
6. **아이콘**: `lucide-react` -- shadcn/ui 기본 아이콘 라이브러리

**의존성**: 없음 (루트 파일)

---

### 2.2 `tsconfig.json` -- TypeScript 설정

**역할**: 프로젝트 전체의 TypeScript 컴파일러 옵션을 설정한다. `src/types/` 하위의 모든 타입이 프로젝트 전역에서 참조 가능하도록 한다.

**내용**:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "src/types/env.d.ts"
  ],
  "exclude": ["node_modules"]
}
```

**구현 상세**:

1. `strict: true` -- 타입 안전성 최대화
2. `paths`에 `@/*` 매핑 -- `import { SessionDoc } from '@/types/models'` 형태로 모든 파트가 사용
3. `src/types/env.d.ts`를 `include`에 명시 -- 환경 변수 타입이 전역으로 인식
4. `moduleResolution: "bundler"` -- Next.js 15 App Router 권장
5. `target: "ES2017"` -- async/await 네이티브 지원

**의존성**: 없음 (루트 파일)

---

### 2.3 `next.config.ts` -- Next.js 설정

**역할**: Next.js 빌드 및 런타임 설정. 이미지 도메인, 환경 변수 노출, 실험적 기능 등을 구성한다.

**내용**:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 이미지 최적화 도메인 (복원 이미지, Places API 사진)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'places.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // 서버사이드 환경 변수 (클라이언트에 노출하지 않음)
  serverExternalPackages: ['firebase-admin'],

  // 실험적 기능
  experimental: {
    // Server Actions (diary 생성 등에 사용 가능)
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // 헤더 보안
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Cloud Run에서 standalone 모드로 빌드
  output: 'standalone',
};

export default nextConfig;
```

**구현 상세**:

1. `images.remotePatterns` -- Firebase Storage, Google Cloud Storage, Places API 이미지를 Next.js Image 컴포넌트에서 사용 가능하도록 허용
2. `serverExternalPackages` -- `firebase-admin`은 서버에서만 로드. 클라이언트 번들에 포함 방지
3. `output: 'standalone'` -- **필수**. Cloud Run Docker 배포 시 standalone 모드로 빌드해야 최소 이미지 크기 달성
4. 보안 헤더 -- X-Frame-Options (클릭재킹 방지), X-Content-Type-Options (MIME 스니핑 방지), Referrer-Policy
5. `serverActions.bodySizeLimit: '10mb'` -- 이미지 base64 전송 시 기본 1MB 제한 초과 방지

**의존성**: `next`

---

### 2.4 `tailwind.config.ts` -- Tailwind CSS 설정

**역할**: Tailwind CSS 구성. shadcn/ui 테마 확장, 커스텀 색상, 애니메이션 등을 정의한다.

**내용**:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS 변수 기반 테마
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // TimeLens 커스텀 색상
        timelens: {
          gold: '#D4A574',
          bronze: '#8B6914',
          marble: '#F5F0EB',
          patina: '#4A7C59',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'scan-line': {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'scan-line': 'scan-line 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      // 모바일 safe area 대응
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};

export default config;
```

**구현 상세**:

1. **shadcn/ui 테마**: CSS 변수 기반(`hsl(var(--*))`) -- `globals.css`에서 실제 값 정의
2. **TimeLens 커스텀 색상**: 박물관/유물 테마에 맞는 gold, bronze, marble, patina 4가지 액센트
3. **커스텀 애니메이션**:
   - `scan-line`: 카메라 스캐닝 효과 (Part 2 CameraView에서 사용)
   - `pulse-ring`: 오디오 비주얼라이저 파동 (Part 2 AudioVisualizer에서 사용)
   - `slide-up`: Knowledge Panel 등장 (Part 2)
   - `fade-in`: 범용 페이드인
4. **Safe area spacing**: iOS 노치/홈바 대응용 `safe-*` 유틸리티

**의존성**: `tailwindcss`

---

### 2.5 `src/app/globals.css` -- 전역 스타일

**역할**: Tailwind 디렉티브, shadcn/ui CSS 변수, 전역 리셋 스타일을 정의한다.

**내용**:

```css
@import 'tailwindcss';

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 35 45% 55%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 35 45% 55%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 35 45% 55%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 35 45% 55%;
  }
}

@layer base {
  * {
    border-color: theme('colors.border');
  }

  body {
    background-color: theme('colors.background');
    color: theme('colors.foreground');
    /* 모바일 텍스트 사이즈 조정 방지 */
    -webkit-text-size-adjust: 100%;
    /* 모바일 터치 하이라이트 제거 */
    -webkit-tap-highlight-color: transparent;
    /* safe area padding */
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* 카메라 뷰에서 전체 화면 사용 */
  html, body {
    height: 100%;
    overflow: hidden;
  }

  #__next {
    height: 100%;
  }
}

/* 스크롤바 숨기기 (Knowledge Panel 등에서 사용) */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

**구현 상세**:

1. **Tailwind v4 방식**: `@import 'tailwindcss'` 사용 (`@tailwind base/components/utilities` 대신)
2. **shadcn/ui CSS 변수**: 라이트/다크 모드 모두 정의. `--primary`를 TimeLens 골드 톤(35 45% 55%)으로 설정
3. **모바일 최적화**:
   - `overflow: hidden` + `height: 100%` -- 카메라 전체 화면 뷰에 적합
   - `-webkit-tap-highlight-color: transparent` -- 터치 시 파란 하이라이트 제거
   - `safe-area-inset-*` -- iOS 노치/홈바 대응
4. **scrollbar-hide**: Knowledge Panel, Transcript 등 스크롤 영역에서 스크롤바 숨김

**의존성**: `tailwindcss`

---

### 2.6 `src/lib/utils.ts` -- 유틸리티 함수

**역할**: shadcn/ui 컴포넌트에서 사용하는 `cn()` 클래스 병합 함수 등 공용 유틸리티를 제공한다.

**내용**:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 조건부 클래스 병합 유틸리티
 * shadcn/ui 컴포넌트에서 Tailwind 클래스 충돌 해결에 사용
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 타임스탬프를 상대 시간 문자열로 변환
 *
 * @example
 * formatRelativeTime(Date.now() - 60000) // "1분 전"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * 거리를 사람이 읽기 좋은 형태로 변환
 *
 * @example
 * formatDistance(1500) // "1.5 km"
 * formatDistance(500)  // "500 m"
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * 도보 시간 추정 (평균 보행 속도 5km/h 기준)
 */
export function estimateWalkingTime(meters: number): number {
  return Math.ceil(meters / 83.33); // 5km/h = 83.33m/min
}
```

**구현 상세**:

1. `cn()` -- shadcn/ui 표준 패턴. `clsx`로 조건부 클래스 생성 후 `twMerge`로 Tailwind 충돌 해결
2. `formatRelativeTime()` -- 다이어리, 방문 기록 표시에 사용
3. `formatDistance()`, `estimateWalkingTime()` -- Discovery 카드 (Part 4)에서 사용

**의존성**: `clsx`, `tailwind-merge`

---

### 2.7 `src/types/common.ts` -- 공유 기본 타입

**역할**: shared-contract.md §A에서 정의된 모든 공유 기본 타입을 제공한다. 모든 파트가 이 파일을 import한다.

**내용**:

```typescript
// ============================================================
// 파일: src/types/common.ts
// 담당: Part 5 (인프라) 가 생성, 모든 파트가 참조
// 출처: shared-contract.md §A
// ============================================================

// --- 에이전트 ---
export type AgentType = 'curator' | 'restoration' | 'discovery' | 'diary';

// --- 세션 ---
export type SessionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'expired';

// --- 유물 카테고리 ---
export type ArtifactCategory =
  | 'pottery'
  | 'sculpture'
  | 'painting'
  | 'weapon'
  | 'jewelry'
  | 'textile'
  | 'coin'
  | 'mosaic'
  | 'inscription'
  | 'fossil'
  | 'mask';

export type HeritageCategory =
  | 'artifact'
  | 'monument'
  | 'building'
  | 'painting'
  | 'sculpture';

export type Material =
  | 'marble'
  | 'bronze'
  | 'ceramic'
  | 'gold'
  | 'stone'
  | 'wood'
  | 'iron'
  | 'glass';

export type Civilization =
  | 'Greek'
  | 'Roman'
  | 'Egyptian'
  | 'Mesopotamian'
  | 'Chinese'
  | 'Japanese'
  | 'Korean'
  | 'Indian'
  | 'Persian'
  | 'Mayan'
  | 'Other';

// --- Knowledge Panel ---
export type PanelState = 'closed' | 'mini' | 'expanded' | 'fullscreen';

// --- 오디오 ---
export type AudioState = 'idle' | 'listening' | 'speaking' | 'generating';

// --- 에러 ---
export interface AppError {
  code: string;
  message: string;
  recoverable: boolean;
  action?: 'retry' | 'fallback' | 'manual';
}
```

**의존성**: 없음

---

### 2.8 `src/types/live-session.ts` -- Live Session 타입

**역할**: shared-contract.md §B에서 정의된 Live Session Contract. Part 1이 구현하고 Part 2가 소비하는 인터페이스.

**내용**:

```typescript
// ============================================================
// 파일: src/types/live-session.ts
// Part 1이 구현, Part 2가 소비
// 출처: shared-contract.md §B
// ============================================================

import type {
  AgentType,
  AudioState,
  SessionStatus,
  AppError,
} from './common';

// --- 유물 인식 결과 (Live API Vision -> UI) ---
export interface ArtifactSummary {
  name: string;
  era: string;
  civilization: string;
  oneLiner: string;
  topics: TopicChip[];
  confidence: number;
  isOutdoor: boolean;
  architectureStyle?: string;
}

export interface TopicChip {
  id: string;
  label: string;
}

// --- Live Session이 UI에 보내는 이벤트 ---
export interface LiveSessionEvents {
  onArtifactRecognized: (summary: ArtifactSummary) => void;
  onTranscript: (data: TranscriptData) => void;
  onUserSpeech: (data: UserSpeechData) => void;
  onAgentSwitch: (data: AgentSwitchData) => void;
  onAudioStateChange: (state: AudioState) => void;
  onSessionStatusChange: (status: SessionStatus) => void;
  onToolResult: (data: ToolResultData) => void;
  onTopicDetail: (data: TopicDetailData) => void;
  onError: (error: AppError) => void;
}

export interface TranscriptData {
  text: string;
  delta: string;
  isFinal: boolean;
  sources?: string[];
}

export interface UserSpeechData {
  text: string;
  isFinal: boolean;
}

export interface AgentSwitchData {
  from: AgentType;
  to: AgentType;
  reason: string;
}

export interface ToolResultData {
  tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
  result: RestorationResult | DiscoveryResult | DiaryResult;
}

export interface TopicDetailData {
  topicId: string;
  topicLabel: string;
  content: string;
  sources?: string[];
}

// --- Tool Result 타입 (import-free 참조용, 실제 정의는 각 타입 파일) ---
// ToolResultData.result에서 사용하는 discriminated union 멤버
import type { RestorationResult } from './restoration';
import type { DiscoveryResult } from './discovery';
import type { DiaryResult } from './diary';
export type { RestorationResult, DiscoveryResult, DiaryResult };

// --- UI가 Live Session에 보내는 명령 ---
export interface LiveSessionControls {
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  interrupt: () => void;
  requestTopicDetail: (topicId: string, topicLabel: string) => void;
  sendTextMessage: (text: string) => void;
  sendPhoto: (imageBase64: string) => void;
  getSessionState: () => SessionState;
}

export interface SessionConfig {
  language: string;
  sessionId?: string;
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  activeAgent: AgentType;
  audioState: AudioState;
  currentArtifact: ArtifactSummary | null;
  visitCount: number;
  isFallbackMode: boolean;
}

// --- useLiveSession Hook 반환 타입 ---
export interface UseLiveSessionReturn {
  sessionState: SessionState;
  isConnected: boolean;
  isFallbackMode: boolean;
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  interrupt: () => void;
  requestTopicDetail: (topicId: string, topicLabel: string) => void;
  sendTextMessage: (text: string) => void;
  sendPhoto: (imageBase64: string) => void;
  currentArtifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  audioState: AudioState;
  activeAgent: AgentType;
}

export interface TranscriptChunk {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  sources?: string[];
}
```

**구현 상세**:

1. `ToolResultData`의 `result` 필드가 `RestorationResult | DiscoveryResult | DiaryResult` union이므로, 각 타입 파일에서 re-export
2. `TranscriptChunk`는 UI 렌더링에 사용하는 채팅 히스토리 아이템. `sources`는 Search Grounding 출처 URL 배열

**의존성**: `./common`, `./restoration`, `./discovery`, `./diary`

---

### 2.9 `src/types/restoration.ts` -- Restoration 타입

**역할**: shared-contract.md §C에서 정의된 Restoration Contract.

**내용**:

```typescript
// ============================================================
// 파일: src/types/restoration.ts
// Part 1이 Tool Call 이벤트 전달, Part 3이 REST API + UI 구현
// 출처: shared-contract.md §C
// ============================================================

import type { ArtifactCategory } from './common';

// --- Live API가 발생시키는 Tool Call ---
export interface RestorationToolCall {
  tool: 'generate_restoration';
  params: {
    artifact_name: string;
    era: string;
    artifact_type?: string;
    damage_description?: string;
    site_name?: string;
    current_description?: string;
  };
}

// --- REST API: POST /api/restore ---
export interface RestorationRequest {
  artifactName: string;
  era: string;
  artifactType?: ArtifactCategory;
  damageDescription?: string;
  referenceImage?: string;
  isArchitecture: boolean;
  siteName?: string;
  currentDescription?: string;
}

export interface RestorationResponse {
  success: true;
  imageUrl: string;
  description: string;
  era: string;
  generationTimeMs: number;
}

export interface RestorationErrorResponse {
  success: false;
  error: string;
  code: 'GENERATION_FAILED' | 'TIMEOUT' | 'CONTENT_FILTERED' | 'RATE_LIMITED';
  retryable: boolean;
}

// --- Tool Result -> UI로 전달되는 결과 ---
export interface RestorationResult {
  type: 'restoration';
  imageUrl: string;
  description: string;
  artifactName: string;
  era: string;
  referenceImageUrl?: string;
}

// --- Before/After 슬라이더 상태 ---
export type RestorationUIState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number; artifactName: string; era: string }
  | { status: 'ready'; data: RestorationResult }
  | { status: 'error'; error: string; retryable: boolean };
```

**의존성**: `./common`

---

### 2.10 `src/types/discovery.ts` -- Discovery 타입

**역할**: shared-contract.md §D (Discovery)에서 정의된 Discovery Contract.

**내용**:

```typescript
// ============================================================
// 파일: src/types/discovery.ts
// Part 1이 Tool Call 이벤트 전달, Part 4가 REST API + UI 구현
// 출처: shared-contract.md §D (Discovery)
// ============================================================

// --- Live API Tool Call ---
export interface DiscoveryToolCall {
  tool: 'discover_nearby';
  params: {
    lat: number;
    lng: number;
    radius_km: number;
    interest_filter?: string;
  };
}

// --- REST API: GET /api/discover ---
export interface DiscoveryQueryParams {
  lat: number;
  lng: number;
  radius: number;
  type?: string;
}

export interface DiscoveryResponse {
  success: true;
  sites: NearbyPlace[];
  searchRadius: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  era?: string;
  description: string;
  distance: number;
  walkingTime: number;
  rating?: number;
  isOpen?: boolean;
  openingHours?: string;
  photoUrl?: string;
  location: { lat: number; lng: number };
}

// --- Tool Result ---
export interface DiscoveryResult {
  type: 'discovery';
  sites: NearbyPlace[];
  userLocation: { lat: number; lng: number };
}
```

**의존성**: 없음

---

### 2.11 `src/types/diary.ts` -- Diary 타입

**역할**: shared-contract.md §D (Diary)에서 정의된 Diary Contract.

**내용**:

```typescript
// ============================================================
// 파일: src/types/diary.ts
// Part 1이 Tool Call 이벤트 전달, Part 4가 REST API + UI 구현
// 출처: shared-contract.md §D (Diary)
// ============================================================

// --- Live API Tool Call ---
export interface DiaryToolCall {
  tool: 'create_diary';
  params: {
    session_id: string;
  };
}

// --- REST API: POST /api/diary/generate ---
export interface DiaryGenerateRequest {
  sessionId: string;
}

export interface DiaryGenerateResponse {
  success: true;
  diaryId: string;
  diary: DiaryData;
}

export interface DiaryData {
  id: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: number;
  shareToken?: string;
}

export interface DiaryEntry {
  type: 'text' | 'image';
  content: string;
  siteName?: string;
  order: number;
}

// --- Tool Result ---
export interface DiaryResult {
  type: 'diary';
  diaryId: string;
  title: string;
  entryCount: number;
}

// --- Diary UI 상태 ---
export type DiaryUIState =
  | { status: 'idle' }
  | { status: 'generating'; progress: number }
  | { status: 'ready'; diary: DiaryData }
  | { status: 'error'; error: string };
```

**의존성**: 없음

---

### 2.12 `src/types/ws-messages.ts` -- WebSocket 메시지 타입

**역할**: shared-contract.md §E에서 정의된 WebSocket 프로토콜 타입. Part 1이 구현, Part 2는 Hook을 통해 추상화하여 사용.

**내용**:

```typescript
// ============================================================
// 파일: src/types/ws-messages.ts
// Part 1이 구현. Part 2는 직접 사용하지 않음 (Hook을 통해 추상화)
// 출처: shared-contract.md §E
// ============================================================

import type { SessionStatus, AppError } from './common';
import type {
  ArtifactSummary,
  AgentSwitchData,
  TopicDetailData,
} from './live-session';
import type { RestorationResult } from './restoration';
import type { DiscoveryResult } from './discovery';
import type { DiaryResult } from './diary';

// === Client -> Server ===

export type ClientMessage =
  | ClientSessionConfig
  | ClientAudioInput
  | ClientVideoFrame
  | ClientInterrupt
  | ClientTextMessage;

export interface ClientSessionConfig {
  type: 'session.config';
  payload: {
    language: string;
    sessionId?: string;
  };
}

export interface ClientAudioInput {
  type: 'audio.input';
  payload: {
    data: string;
    timestamp: number;
  };
}

export interface ClientVideoFrame {
  type: 'video.frame';
  payload: {
    data: string;
    timestamp: number;
  };
}

export interface ClientInterrupt {
  type: 'audio.interrupt';
}

export interface ClientTextMessage {
  type: 'text.input';
  payload: {
    text: string;
    image?: string;
  };
}

// === Server -> Client ===

export type ServerMessage =
  | ServerAudioOutput
  | ServerTranscript
  | ServerArtifactRecognized
  | ServerToolCall
  | ServerToolResult
  | ServerAgentSwitch
  | ServerSessionStatus
  | ServerTopicDetail
  | ServerError;

export interface ServerAudioOutput {
  type: 'audio.output';
  payload: {
    data: string;
  };
}

export interface ServerTranscript {
  type: 'transcript';
  payload: {
    text: string;
    delta: string;
    isFinal: boolean;
    sources?: string[];
  };
}

export interface ServerArtifactRecognized {
  type: 'artifact.recognized';
  payload: ArtifactSummary;
}

export interface ServerToolCall {
  type: 'tool.call';
  payload: {
    callId: string;
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    params: Record<string, unknown>;
  };
}

export interface ServerToolResult {
  type: 'tool.result';
  payload: {
    callId: string;
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    result: RestorationResult | DiscoveryResult | DiaryResult;
  };
}

export interface ServerAgentSwitch {
  type: 'agent.switch';
  payload: AgentSwitchData;
}

export interface ServerSessionStatus {
  type: 'session.status';
  payload: {
    status: SessionStatus;
    sessionId: string;
    expiresAt?: number;
  };
}

export interface ServerTopicDetail {
  type: 'topic.detail';
  payload: TopicDetailData;
}

export interface ServerError {
  type: 'error';
  payload: AppError;
}
```

**의존성**: `./common`, `./live-session`, `./restoration`, `./discovery`, `./diary`

---

### 2.13 `src/types/api.ts` -- REST API 타입

**역할**: shared-contract.md §F에서 정의된 REST API 공통 응답 형식과 엔드포인트별 요청/응답 타입.

**내용**:

```typescript
// ============================================================
// 파일: src/types/api.ts
// Part 5가 공통 에러 형식 정의
// Part 1/3/4가 각 엔드포인트 구현
// 출처: shared-contract.md §F
// ============================================================

// --- 공통 API 응답 ---
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- POST /api/session ---
export interface CreateSessionRequest {
  language: string;
  userId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
  expiresAt: number;
}

// --- POST /api/session/resume ---
export interface ResumeSessionRequest {
  sessionId: string;
}

export interface ResumeSessionResponse {
  wsUrl: string;
  context: string;
  expiresAt: number;
}

// --- GET /api/health ---
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  services: {
    liveApi: boolean;
    imageGen: boolean;
    firestore: boolean;
    placesApi: boolean;
  };
}
```

**의존성**: 없음

---

### 2.14 `src/types/models.ts` -- Firestore 모델 타입

**역할**: shared-contract.md §G에서 정의된 Firestore 문서 스키마. Part 5가 정의하고 Part 1/3/4가 읽기/쓰기에 사용.

**내용**:

```typescript
// ============================================================
// 파일: src/types/models.ts
// Part 5가 정의, Part 1/3/4가 읽기/쓰기
// 출처: shared-contract.md §G
// ============================================================

import { Timestamp, GeoPoint } from 'firebase/firestore';
import type {
  HeritageCategory,
  ArtifactCategory,
  Material,
  Civilization,
} from './common';
import type { DiaryEntry } from './diary';

// --- Collection: sessions ---
export interface SessionDoc {
  id: string;
  userId: string;
  language: string;
  status: 'active' | 'paused' | 'completed';
  liveApiSessionId?: string;
  contextSnapshot?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

// --- Collection: sessions/{sessionId}/visits ---
export interface VisitDoc {
  id: string;
  itemName: string;
  location: GeoPoint;
  venueName?: string;
  recognizedAt: Timestamp;
  conversationSummary: string;
  restorationImageUrl?: string;
  userPhotoUrl?: string;
  metadata: {
    era?: string;
    category: HeritageCategory;
    artifactType?: ArtifactCategory;
    material?: Material;
    civilization?: Civilization;
    damageDescription?: string;
    searchGroundingSources?: string[];
  };
}

// --- Collection: diaries ---
export interface DiaryDoc {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: Timestamp;
  shareToken?: string;
}

// --- Firestore 경로 상수 ---
export const COLLECTIONS = {
  SESSIONS: 'sessions',
  VISITS: 'visits',        // sessions/{sessionId}/visits
  DIARIES: 'diaries',
} as const;
```

**의존성**: `firebase/firestore`, `./common`, `./diary`

---

### 2.15 `src/types/env.d.ts` -- 환경 변수 타입

**역할**: shared-contract.md §J에서 정의된 환경 변수 타입 선언. `process.env.*`에 대한 전역 타입 안전성 제공.

**내용**:

```typescript
// ============================================================
// 파일: src/types/env.d.ts
// Part 5가 .env.example과 함께 정의
// 출처: shared-contract.md §J
// ============================================================

declare namespace NodeJS {
  interface ProcessEnv {
    // Gemini API + ADK 공용 (서버 전용)
    GOOGLE_GENAI_API_KEY: string;
    GOOGLE_CLOUD_PROJECT: string;
    GOOGLE_GENAI_USE_VERTEXAI?: string;

    // Firebase (클라이언트)
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;

    // Firebase (서버 전용)
    FIREBASE_SERVICE_ACCOUNT_KEY: string;

    // Google Maps / Places
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
    GOOGLE_PLACES_API_KEY: string;

    // App
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_WS_URL: string;

    // Node
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
```

**의존성**: 없음

---

### 2.16 `.env.example` -- 환경 변수 템플릿

**역할**: 프로젝트 셋업 시 `.env.local`로 복사하여 사용하는 환경 변수 템플릿.

**내용**:

```bash
# ============================================================
# TimeLens Environment Variables
# 사용법: cp .env.example .env.local 후 값을 채워주세요
# ============================================================

# ── Gemini API ──────────────────────────────────────────────
# Google AI Studio에서 발급: https://aistudio.google.com/apikey
# Live API, Image Generation, ADK 모두 이 단일 키 사용 (서버 전용)
# Source of Truth: docs/reference/gemini-sdk-reference.md §4.2
GOOGLE_GENAI_API_KEY=
GOOGLE_GENAI_USE_VERTEXAI=FALSE

# GCP 프로젝트 ID
GOOGLE_CLOUD_PROJECT=

# ── Firebase ────────────────────────────────────────────────
# Firebase Console > 프로젝트 설정 > 일반 > 웹 앱 구성
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Firebase Admin SDK 서비스 계정 키 (base64 인코딩)
# 생성: Firebase Console > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성
# 인코딩: cat service-account.json | base64 | tr -d '\n'
FIREBASE_SERVICE_ACCOUNT_KEY=

# ── Google Maps / Places ────────────────────────────────────
# Google Cloud Console > APIs & Services > Credentials
# Maps JavaScript API 활성화 필요 (클라이언트)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Places API (New) 키 (서버 전용)
# APIs & Services에서 Places API (New) 활성화 필요
GOOGLE_PLACES_API_KEY=

# ── App ─────────────────────────────────────────────────────
# 개발: http://localhost:3000 / 프로덕션: Cloud Run URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

**구현 상세**:

1. `GOOGLE_GENAI_API_KEY` 하나로 통일 — `@google/genai` SDK와 `@google/adk` 모두 이 이름을 사용
   - GenAI SDK: `new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })`
   - ADK: 자동으로 `GOOGLE_GENAI_API_KEY` 환경변수 읽음
2. `FIREBASE_SERVICE_ACCOUNT_KEY`는 JSON 파일을 base64 인코딩한 문자열. Cloud Run에서 시크릿으로 관리
3. `NEXT_PUBLIC_*` 접두사 변수만 클라이언트 번들에 포함됨. 나머지는 서버 전용

**의존성**: 없음

---

### 2.17 `src/lib/firebase/config.ts` -- Firebase 초기화

**역할**: Firebase 클라이언트 SDK를 초기화하고 앱 인스턴스를 제공한다. Firestore, Auth 인스턴스를 싱글턴으로 내보낸다.

**내용**:

```typescript
// ============================================================
// 파일: src/lib/firebase/config.ts
// 담당: Part 5
// 역할: Firebase 클라이언트 SDK 초기화 (싱글턴)
// ============================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

/**
 * Firebase 앱 인스턴스 (싱글턴)
 * Next.js의 핫 리로드에서 중복 초기화 방지
 */
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

/** Firestore 클라이언트 인스턴스 */
export const db: Firestore = getFirestore(app);

/** Firebase Auth 클라이언트 인스턴스 */
export const auth: Auth = getAuth(app);

export default app;
```

**구현 상세**:

1. `getApps().length > 0` 체크 -- Next.js 개발 환경의 HMR (Hot Module Replacement)에서 `initializeApp`이 중복 호출되는 것을 방지
2. `firebaseConfig` -- `NEXT_PUBLIC_*` 환경 변수 사용. 이 값들은 공개 가능 (API key는 Firebase Security Rules로 보호)
3. `db`와 `auth`를 named export -- 다른 모듈에서 `import { db } from '@/lib/firebase/config'` 형태로 사용

**에러 처리**: 환경 변수 누락 시 Firebase SDK가 자체 에러를 throw

**의존성**: `firebase/app`, `firebase/firestore`, `firebase/auth`, 환경 변수 (`NEXT_PUBLIC_FIREBASE_*`)

---

### 2.18 `src/lib/firebase/auth.ts` -- Firebase Anonymous Auth

**역할**: Firebase Anonymous Auth를 통한 사용자 인증. PII를 수집하지 않으면서 세션과 데이터를 사용자에게 연결한다.

**내용**:

```typescript
// ============================================================
// 파일: src/lib/firebase/auth.ts
// 담당: Part 5
// 역할: Firebase Anonymous Auth 유틸리티
// ============================================================

import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './config';

/**
 * 익명 로그인 수행
 *
 * 이미 로그인된 경우 기존 사용자를 반환.
 * 최초 방문 시 새 익명 UID를 생성.
 *
 * @returns Firebase User 객체
 * @throws 네트워크 오류 또는 Firebase 설정 오류 시
 */
export async function signInAnonymous(): Promise<User> {
  // 이미 로그인된 사용자가 있으면 반환
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

/**
 * 현재 로그인된 사용자의 UID를 반환
 *
 * @returns UID 문자열 또는 null (미로그인 시)
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}

/**
 * 인증 상태 변경 리스너 등록
 *
 * @param callback 사용자 상태 변경 시 호출되는 콜백
 * @returns unsubscribe 함수
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * 인증 상태가 준비될 때까지 대기
 *
 * Next.js App Router에서 클라이언트 컴포넌트 마운트 시
 * Firebase Auth가 초기화를 완료할 때까지 기다린다.
 *
 * @returns 현재 사용자 또는 null
 */
export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    if (auth.currentUser !== undefined) {
      // auth가 이미 초기화된 경우
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
```

**구현 상세**:

1. `signInAnonymous()` -- 앱 시작 시 1회 호출. `auth.currentUser` 체크로 중복 로그인 방지
2. `getCurrentUserId()` -- Firestore CRUD에서 `userId` 필드로 사용
3. `waitForAuth()` -- SSR/CSR 전환 시 auth 상태가 아직 로드되지 않은 상태 대응. Promise로 초기화 완료를 보장
4. PII 수집 없음 -- Anonymous Auth는 기기별 UID만 생성. 이메일, 비밀번호 등 수집하지 않음

**에러 처리**:
- 네트워크 오류: `signInAnonymously()`가 reject됨 --> 호출자에서 catch
- Firebase 미설정: Firebase SDK가 자체 에러 throw

**의존성**: `firebase/auth`, `./config`

---

### 2.19 `src/lib/firebase/firestore.ts` -- Firestore CRUD 유틸

**역할**: Firestore 문서에 대한 CRUD 헬퍼 함수를 제공한다. shared-contract.md §G의 스키마를 기반으로 sessions, visits, diaries 컬렉션을 관리한다.

**내용**:

```typescript
// ============================================================
// 파일: src/lib/firebase/firestore.ts
// 담당: Part 5
// 역할: Firestore CRUD 유틸리티
// 출처: shared-contract.md §G (Firestore 데이터 모델)
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  GeoPoint,
  serverTimestamp,
  type DocumentReference,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import type { SessionDoc, VisitDoc, DiaryDoc, COLLECTIONS } from '@/types/models';

// ──────────────────────────────────────────────────────────
// Sessions
// ──────────────────────────────────────────────────────────

/**
 * 새 세션 문서 생성
 *
 * @param sessionId 세션 ID (API Route에서 생성)
 * @param data 세션 데이터 (id, createdAt, updatedAt, expiresAt 제외)
 * @returns 생성된 SessionDoc
 */
export async function createSession(
  sessionId: string,
  data: {
    userId: string;
    language: string;
    liveApiSessionId?: string;
  }
): Promise<SessionDoc> {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 TTL
  );

  const sessionDoc: SessionDoc = {
    id: sessionId,
    userId: data.userId,
    language: data.language,
    status: 'active',
    liveApiSessionId: data.liveApiSessionId,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await setDoc(doc(db, 'sessions', sessionId), sessionDoc);
  return sessionDoc;
}

/**
 * 세션 문서 조회
 */
export async function getSession(
  sessionId: string
): Promise<SessionDoc | null> {
  const snapshot = await getDoc(doc(db, 'sessions', sessionId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as SessionDoc;
}

/**
 * 세션 상태 업데이트
 */
export async function updateSession(
  sessionId: string,
  data: Partial<
    Pick<
      SessionDoc,
      'status' | 'liveApiSessionId' | 'contextSnapshot'
    >
  >
): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 사용자의 활성 세션 조회
 */
export async function getActiveSession(
  userId: string
): Promise<SessionDoc | null> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as SessionDoc;
}

// ──────────────────────────────────────────────────────────
// Visits (세션 하위 컬렉션)
// ──────────────────────────────────────────────────────────

/**
 * 방문 기록 추가
 *
 * @param sessionId 부모 세션 ID
 * @param visitId 방문 ID
 * @param data 방문 데이터 (id, recognizedAt 제외)
 */
export async function addVisit(
  sessionId: string,
  visitId: string,
  data: Omit<VisitDoc, 'id' | 'recognizedAt'>
): Promise<VisitDoc> {
  const visitDoc: VisitDoc = {
    ...data,
    id: visitId,
    recognizedAt: Timestamp.now(),
  };

  await setDoc(
    doc(db, 'sessions', sessionId, 'visits', visitId),
    visitDoc
  );
  return visitDoc;
}

/**
 * 세션의 모든 방문 기록 조회 (시간순)
 */
export async function getVisits(
  sessionId: string
): Promise<VisitDoc[]> {
  const q = query(
    collection(db, 'sessions', sessionId, 'visits'),
    orderBy('recognizedAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as VisitDoc);
}

/**
 * 방문 기록 업데이트 (복원 이미지 URL 추가 등)
 */
export async function updateVisit(
  sessionId: string,
  visitId: string,
  data: Partial<Pick<VisitDoc, 'restorationImageUrl' | 'userPhotoUrl' | 'conversationSummary'>>
): Promise<void> {
  await updateDoc(
    doc(db, 'sessions', sessionId, 'visits', visitId),
    data
  );
}

/**
 * 세션의 방문 수 조회
 */
export async function getVisitCount(
  sessionId: string
): Promise<number> {
  const snapshot = await getDocs(
    collection(db, 'sessions', sessionId, 'visits')
  );
  return snapshot.size;
}

// ──────────────────────────────────────────────────────────
// Diaries
// ──────────────────────────────────────────────────────────

/**
 * 다이어리 생성
 */
export async function createDiary(
  diaryId: string,
  data: Omit<DiaryDoc, 'id' | 'createdAt'>
): Promise<DiaryDoc> {
  const diaryDoc: DiaryDoc = {
    ...data,
    id: diaryId,
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'diaries', diaryId), diaryDoc);
  return diaryDoc;
}

/**
 * 다이어리 조회
 */
export async function getDiary(
  diaryId: string
): Promise<DiaryDoc | null> {
  const snapshot = await getDoc(doc(db, 'diaries', diaryId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as DiaryDoc;
}

/**
 * 공유 토큰으로 다이어리 조회 (공개 공유 링크용)
 */
export async function getDiaryByShareToken(
  shareToken: string
): Promise<DiaryDoc | null> {
  const q = query(
    collection(db, 'diaries'),
    where('shareToken', '==', shareToken),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as DiaryDoc;
}

/**
 * 사용자의 모든 다이어리 조회
 */
export async function getUserDiaries(
  userId: string
): Promise<DiaryDoc[]> {
  const q = query(
    collection(db, 'diaries'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as DiaryDoc);
}

/**
 * 다이어리에 공유 토큰 설정
 */
export async function setDiaryShareToken(
  diaryId: string,
  shareToken: string
): Promise<void> {
  await updateDoc(doc(db, 'diaries', diaryId), { shareToken });
}

// ──────────────────────────────────────────────────────────
// 유틸리티
// ──────────────────────────────────────────────────────────

/**
 * 고유 ID 생성 (Firestore auto-id 호환)
 */
export function generateId(): string {
  return doc(collection(db, '_')).id;
}

/**
 * GeoPoint 생성 헬퍼
 */
export function createGeoPoint(lat: number, lng: number): GeoPoint {
  return new GeoPoint(lat, lng);
}
```

**구현 상세**:

1. **Sessions CRUD**:
   - `createSession()` -- 24시간 TTL이 포함된 `expiresAt` 자동 설정
   - `getActiveSession()` -- 사용자의 가장 최근 활성 세션 조회 (재연결에 사용)
   - `updateSession()` -- `updatedAt` 자동 갱신

2. **Visits CRUD**:
   - 하위 컬렉션 경로: `sessions/{sessionId}/visits/{visitId}`
   - `addVisit()` -- `recognizedAt` 자동 설정
   - `getVisits()` -- 시간순 정렬 (다이어리 생성 시 순서 유지)

3. **Diaries CRUD**:
   - `getDiaryByShareToken()` -- 공유 링크에서 shareToken으로 다이어리 조회
   - `setDiaryShareToken()` -- 공유 링크 생성 시 토큰 저장

4. **유틸리티**:
   - `generateId()` -- Firestore의 auto-id 알고리즘 사용. 어디서든 사전에 ID 생성 가능
   - `createGeoPoint()` -- `VisitDoc.location` 필드에 사용

**에러 처리**: 모든 Firestore 호출은 async/await. 네트워크 오류나 권한 오류는 호출자에서 catch.

**의존성**: `firebase/firestore`, `./config`, `@/types/models`

---

### 2.20 `firestore.rules` -- Firestore 보안 규칙

**역할**: Firestore 문서에 대한 접근 제어 규칙. 사용자 인증과 데이터 소유권을 검증한다.

**내용**:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ── Sessions ───────────────────────────────────────────
    // 인증된 사용자만 자기 세션에 접근 가능
    match /sessions/{sessionId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;

      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.status in ['active', 'paused', 'completed']
                    && request.resource.data.language is string;

      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid
                    && request.resource.data.userId == resource.data.userId;

      allow delete: if false;  // 세션 삭제는 TTL로만 처리

      // ── Visits (세션 하위 컬렉션) ──────────────────────
      // 부모 세션의 소유자만 접근 가능
      match /visits/{visitId} {
        allow read: if request.auth != null
                    && get(/databases/$(database)/documents/sessions/$(sessionId))
                       .data.userId == request.auth.uid;

        allow create: if request.auth != null
                      && get(/databases/$(database)/documents/sessions/$(sessionId))
                         .data.userId == request.auth.uid
                      && request.resource.data.itemName is string;

        allow update: if request.auth != null
                      && get(/databases/$(database)/documents/sessions/$(sessionId))
                         .data.userId == request.auth.uid;

        allow delete: if false;
      }
    }

    // ── Diaries ────────────────────────────────────────────
    // 소유자: 전체 접근 가능
    // 공유: shareToken 매칭 시 읽기만 가능
    match /diaries/{diaryId} {
      allow read: if request.auth != null
                  && (resource.data.userId == request.auth.uid
                      || resource.data.shareToken != null);

      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.sessionId is string
                    && request.resource.data.title is string;

      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid;

      allow delete: if false;
    }

    // ── 기본 거부 ──────────────────────────────────────────
    // 위에서 명시적으로 허용하지 않은 모든 접근 차단
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**구현 상세**:

1. **Sessions**: `userId == request.auth.uid` -- 본인 세션만 접근. 삭제 금지 (TTL이 자동 처리)
2. **Visits**: 부모 세션의 `userId`를 `get()`으로 조회하여 소유자 검증. 추가 Firestore 읽기 발생하나 보안 필수
3. **Diaries**: 소유자는 전체 CRUD, 공유 토큰이 있으면 누구나 읽기 가능 (공개 공유 링크 지원)
4. **기본 거부**: 최하단 `match /{document=**}`가 명시적으로 허용되지 않은 모든 경로 차단

**의존성**: 없음 (Firebase 프로젝트 설정에서 배포)

---

### 2.21 `storage.rules` -- Cloud Storage 보안 규칙

**역할**: Cloud Storage 파일(복원 이미지, 다이어리 삽화 등)에 대한 접근 제어.

**내용**:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // 복원 이미지: 인증된 사용자만 업로드, 누구나 읽기
    match /restorations/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024  // 10MB
                   && request.resource.contentType.matches('image/.*');
    }

    // 다이어리 이미지: 인증된 사용자만 업로드, 누구나 읽기 (공유 대응)
    match /diaries/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }

    // 사용자 캡처 사진: 본인만 접근
    match /captures/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId
                         && request.resource.size < 10 * 1024 * 1024;
    }

    // 기본 거부
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**구현 상세**:

1. **restorations/**: AI 생성 복원 이미지. 공개 읽기 허용 (Before/After 슬라이더에서 로드)
2. **diaries/**: 다이어리 삽화. 공개 읽기 허용 (공유 링크에서 접근)
3. **captures/**: 사용자가 카메라로 촬영한 원본 이미지. 본인만 접근
4. 모든 업로드 제한: 10MB, 이미지 MIME 타입만 허용

**의존성**: 없음 (Firebase 프로젝트 설정에서 배포)

---

### 2.22 `src/app/api/health/route.ts` -- Health Check 엔드포인트

**역할**: Cloud Run 헬스 체크 및 서비스 상태 모니터링 API.

**내용**:

```typescript
// ============================================================
// 파일: src/app/api/health/route.ts
// 담당: Part 5
// 역할: 서비스 헬스 체크
// 출처: shared-contract.md §F (GET /api/health)
// ============================================================

import { NextResponse } from 'next/server';
import type { HealthResponse } from '@/types/api';

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const services = {
    liveApi: !!process.env.GOOGLE_GENAI_API_KEY,
    imageGen: !!process.env.GOOGLE_GENAI_API_KEY,
    firestore: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    placesApi: !!process.env.GOOGLE_PLACES_API_KEY,
  };

  const allHealthy = Object.values(services).every(Boolean);

  const response: HealthResponse = {
    status: allHealthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}
```

**구현 상세**:

1. 각 서비스의 환경 변수 존재 여부로 간단한 health 판단 -- 실제 API 호출은 하지 않음 (응답 속도 확보)
2. `status: 'degraded'` -- 일부 서비스 키가 누락된 경우. Cloud Run 배포 시 환경 변수 설정 누락 알림
3. `uptime` -- 서버 시작 이후 경과 시간 (초)
4. `version` -- package.json의 version 필드

**의존성**: `next/server`, `@/types/api`

---

### 2.23 `Dockerfile` -- Cloud Run 배포용

**역할**: Next.js 프로젝트를 Cloud Run에 배포하기 위한 멀티스테이지 Docker 이미지 빌드.

**내용**:

```dockerfile
# ============================================================
# TimeLens Dockerfile
# 멀티스테이지 빌드: deps → build → runner
# Next.js standalone 모드로 최소 이미지 생성
# ============================================================

# ── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# 패키지 파일 복사 (캐시 레이어 최적화)
COPY package.json package-lock.json* ./

# 의존성 설치 (production only는 standalone이 처리하므로 전체 설치)
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 필요한 환경 변수 (NEXT_PUBLIC_* 은 빌드 타임에 임베드됨)
# Cloud Build에서 --build-arg로 전달
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Next.js 빌드 (standalone 모드)
RUN npm run build

# ── Stage 3: Runner ────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# 보안: non-root 사용자
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 출력 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run은 $PORT 환경 변수로 포트를 지정
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

EXPOSE 8080

# standalone 서버 실행
CMD ["node", "server.js"]
```

**구현 상세**:

1. **3단계 멀티스테이지 빌드**:
   - `deps`: `npm ci`로 의존성 설치 (캐시 레이어 분리)
   - `builder`: 소스 복사 + `next build` 실행
   - `runner`: standalone 출력만 복사 (최소 이미지 크기)

2. **`node:20-alpine`**: 경량 Alpine 이미지 사용. 최종 이미지 ~150MB

3. **`NEXT_PUBLIC_*` build-arg**:
   - Next.js의 `NEXT_PUBLIC_*` 환경 변수는 **빌드 타임에 JavaScript에 인라인**됨
   - 따라서 Docker 빌드 시 `--build-arg`로 전달 필수
   - 서버 전용 변수 (`GOOGLE_GENAI_API_KEY` 등)는 런타임 환경 변수로 Cloud Run에서 설정

4. **non-root 사용자**: `nextjs` 사용자로 실행. 컨테이너 보안 모범 사례

5. **`PORT=8080`**: Cloud Run 기본 포트. `$PORT` 환경 변수를 Cloud Run이 주입하며 Next.js standalone 서버가 이를 인식

6. **standalone 모드**: `next.config.ts`의 `output: 'standalone'`과 연동. `node_modules`에서 필요한 파일만 추출하여 최소 번들 생성

**의존성**: `next.config.ts`의 `output: 'standalone'` 설정

---

### 2.24 `cloudbuild.yaml` -- CI/CD 파이프라인

**역할**: Google Cloud Build를 통한 자동 빌드 및 Cloud Run 배포. 보너스 포인트 +0.2 (IaC).

**내용**:

```yaml
# ============================================================
# TimeLens CI/CD Pipeline
# Google Cloud Build -> Cloud Run 자동 배포
# 보너스: IaC (+0.2 점)
# ============================================================

steps:
  # ── Step 1: Docker 이미지 빌드 ─────────────────────────
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/timelens:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/timelens:latest'
      # NEXT_PUBLIC_* 빌드 타임 환경 변수
      - '--build-arg'
      - 'NEXT_PUBLIC_FIREBASE_API_KEY=$_NEXT_PUBLIC_FIREBASE_API_KEY'
      - '--build-arg'
      - 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
      - '--build-arg'
      - 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=$_NEXT_PUBLIC_FIREBASE_PROJECT_ID'
      - '--build-arg'
      - 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
      - '--build-arg'
      - 'NEXT_PUBLIC_APP_URL=$_NEXT_PUBLIC_APP_URL'
      - '--build-arg'
      - 'NEXT_PUBLIC_WS_URL=$_NEXT_PUBLIC_WS_URL'
      - '.'

  # ── Step 2: Container Registry에 푸시 ──────────────────
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/timelens:$COMMIT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/timelens:latest'

  # ── Step 3: Cloud Run에 배포 ───────────────────────────
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'timelens'
      - '--image'
      - 'gcr.io/$PROJECT_ID/timelens:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '8080'
      - '--memory'
      - '1Gi'
      - '--cpu'
      - '1'
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '3'
      - '--timeout'
      - '300'
      - '--concurrency'
      - '80'
      - '--set-env-vars'
      - 'NODE_ENV=production'
      - '--set-secrets'
      - 'GOOGLE_GENAI_API_KEY=GOOGLE_GENAI_API_KEY:latest,FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest,GOOGLE_PLACES_API_KEY=GOOGLE_PLACES_API_KEY:latest'

# 이미지 태깅
images:
  - 'gcr.io/$PROJECT_ID/timelens:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/timelens:latest'

# 빌드 옵션
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'

# 타임아웃 (빌드 + 배포)
timeout: '1200s'

# Cloud Build 트리거에서 설정하는 대체 변수
substitutions:
  _NEXT_PUBLIC_FIREBASE_API_KEY: ''
  _NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ''
  _NEXT_PUBLIC_FIREBASE_PROJECT_ID: ''
  _NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ''
  _NEXT_PUBLIC_APP_URL: ''
  _NEXT_PUBLIC_WS_URL: ''
```

**구현 상세**:

1. **3단계 파이프라인**: Build --> Push --> Deploy
2. **이중 태깅**: `$COMMIT_SHA` (롤백용) + `latest` (최신 참조)
3. **빌드 타임 변수 (`NEXT_PUBLIC_*`)**:
   - Cloud Build 트리거의 `substitutions`로 설정
   - Docker `--build-arg`로 전달
   - JavaScript에 인라인되므로 빌드 시점에 결정
4. **런타임 시크릿 (`--set-secrets`)**:
   - Google Secret Manager에 저장된 시크릿을 환경 변수로 주입
   - `GOOGLE_GENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `GOOGLE_PLACES_API_KEY`
5. **Cloud Run 설정**:
   - `--memory 1Gi` -- Image Generation 응답 처리에 충분한 메모리
   - `--min-instances 0` -- 비용 절감 (해커톤 무료 크레딧)
   - `--max-instances 3` -- 데모/심사 트래픽 대응
   - `--timeout 300` -- 이미지 생성이 최대 15초 소요
   - `--concurrency 80` -- 동시 요청 제한
6. **`machineType: 'E2_HIGHCPU_8'`** -- Docker 멀티스테이지 빌드 속도 향상

**의존성**: GCP 프로젝트, Secret Manager에 시크릿 등록 필요

---

### 2.25 `public/manifest.json` -- PWA 매니페스트

**역할**: Progressive Web App 매니페스트. 홈 화면에 추가 시 앱처럼 동작하도록 구성.

**내용**:

```json
{
  "name": "TimeLens - AI Cultural Heritage Companion",
  "short_name": "TimeLens",
  "description": "See history come alive. AI-powered museum and cultural heritage companion.",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a1a",
  "theme_color": "#D4A574",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**구현 상세**:

1. `display: "standalone"` -- 브라우저 UI 없이 앱처럼 표시
2. `orientation: "portrait"` -- 모바일 세로 모드 고정 (카메라 뷰 최적화)
3. `theme_color: "#D4A574"` -- TimeLens 골드 (상단바 색상)
4. `background_color: "#1a1a1a"` -- 다크 배경 (카메라 뷰와 일관)
5. 아이콘: 192px (홈 화면) + 512px (스플래시) -- `maskable` 지원

**의존성**: `public/icons/icon-192.png`, `public/icons/icon-512.png` (별도 생성 필요)

---

### 2.26 shadcn/ui 컴포넌트 목록 -- `src/components/ui/`

**역할**: Part 2/3/4에서 사용하는 UI 프리미티브. shadcn/ui CLI로 설치하거나 직접 파일로 생성.

**필요한 컴포넌트 목록**:

| 컴포넌트 | 사용처 | Radix 의존성 |
|---|---|---|
| `button.tsx` | 전역 (모든 버튼) | `@radix-ui/react-slot` |
| `card.tsx` | Knowledge Panel 요약 카드, Discovery 카드, Diary 카드 | 없음 |
| `dialog.tsx` | 모달 다이얼로그 (에러, 확인) | `@radix-ui/react-dialog` |
| `sheet.tsx` | Knowledge Panel (bottom sheet 스타일) | `@radix-ui/react-dialog` |
| `slider.tsx` | Before/After 슬라이더 | `@radix-ui/react-slider` |
| `switch.tsx` | 마이크/카메라 ON/OFF | `@radix-ui/react-switch` |
| `tabs.tsx` | Diary 뷰어 탭 | `@radix-ui/react-tabs` |
| `toast.tsx` | 알림 토스트 (에러, 성공) | `@radix-ui/react-toast` |
| `toaster.tsx` | 토스트 컨테이너 | `@radix-ui/react-toast` |
| `use-toast.ts` | 토스트 훅 | 없음 |
| `scroll-area.tsx` | 스크롤 영역 (트랜스크립트, 패널) | `@radix-ui/react-scroll-area` |
| `badge.tsx` | 에이전트 이름 뱃지, 토픽 칩 | 없음 |
| `skeleton.tsx` | 로딩 스켈레톤 | 없음 |
| `separator.tsx` | 구분선 | 없음 |
| `progress.tsx` | 이미지 생성 진행률 | 없음 |

**구현 방법**: shadcn/ui CLI 사용 (권장)

```bash
# shadcn/ui 초기화
npx shadcn@latest init

# 필요한 컴포넌트 설치
npx shadcn@latest add button card dialog sheet slider switch tabs toast scroll-area badge skeleton separator progress
```

**또는** 직접 파일 생성: 각 컴포넌트는 `src/components/ui/{name}.tsx`에 배치. shadcn/ui의 GitHub 소스를 참조하여 구현.

**의존성**: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/*`

---

## 3. GCP 프로젝트 셋업 가이드

### 3.1 필수 API 활성화 목록

GCP Console (https://console.cloud.google.com) 에서 다음 API를 활성화한다:

| API | 용도 | 활성화 경로 |
|---|---|---|
| **Generative Language API** | Gemini Live API + Image Generation | APIs & Services > Library > "Generative Language API" |
| **Places API (New)** | 주변 박물관/유적지 검색 | APIs & Services > Library > "Places API (New)" |
| **Maps JavaScript API** | 지도 표시 (클라이언트) | APIs & Services > Library > "Maps JavaScript API" |
| **Geocoding API** | 좌표-주소 변환 | APIs & Services > Library > "Geocoding API" |
| **Cloud Run API** | 서버리스 배포 | APIs & Services > Library > "Cloud Run Admin API" |
| **Cloud Build API** | CI/CD 파이프라인 | APIs & Services > Library > "Cloud Build API" |
| **Container Registry API** | Docker 이미지 저장 | APIs & Services > Library > "Container Registry API" |
| **Secret Manager API** | 시크릿 관리 | APIs & Services > Library > "Secret Manager API" |

### 3.2 Firebase 프로젝트 셋업 순서

1. Firebase Console (https://console.firebase.google.com) > 프로젝트 추가 > GCP 프로젝트 선택
2. **Authentication**:
   - Sign-in method > Anonymous > 사용 설정
3. **Firestore Database**:
   - 데이터베이스 만들기 > 프로덕션 모드
   - 위치: `us-central1` (Cloud Run과 동일 리전)
   - `firestore.rules` 내용을 규칙 탭에 배포
4. **Storage**:
   - 기본 버킷 생성
   - `storage.rules` 내용을 규칙 탭에 배포
5. **웹 앱 등록**:
   - 프로젝트 설정 > 일반 > 앱 추가 > 웹
   - `firebaseConfig` 값을 `.env.local`에 복사
6. **서비스 계정 키**:
   - 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성
   - JSON 파일을 base64 인코딩: `cat service-account.json | base64 | tr -d '\n'`
   - 결과를 `FIREBASE_SERVICE_ACCOUNT_KEY`에 설정

### 3.3 Secret Manager 설정

Cloud Build에서 Cloud Run 배포 시 사용하는 시크릿:

```bash
# 시크릿 생성 (최초 1회)
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GOOGLE_GENAI_API_KEY --data-file=-
echo -n "BASE64_SERVICE_ACCOUNT" | gcloud secrets create FIREBASE_SERVICE_ACCOUNT_KEY --data-file=-
echo -n "YOUR_PLACES_API_KEY" | gcloud secrets create GOOGLE_PLACES_API_KEY --data-file=-

# Cloud Run 서비스 계정에 시크릿 접근 권한 부여
gcloud secrets add-iam-policy-binding GOOGLE_GENAI_API_KEY \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
# (나머지 시크릿도 동일하게)
```

### 3.4 Cloud Build 트리거 설정

1. Cloud Build > 트리거 > 트리거 만들기
2. **소스**: GitHub 레포 연결
3. **이벤트**: `main` 브랜치 push
4. **구성**: `cloudbuild.yaml` (저장소 루트)
5. **대체 변수**:
   - `_NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API 키
   - `_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: `{project-id}.firebaseapp.com`
   - `_NEXT_PUBLIC_FIREBASE_PROJECT_ID`: GCP 프로젝트 ID
   - `_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Maps JavaScript API 키
   - `_NEXT_PUBLIC_APP_URL`: Cloud Run 서비스 URL
   - `_NEXT_PUBLIC_WS_URL`: Cloud Run 서비스 WebSocket URL

---

## 4. 에러 처리 전략

### 4.1 Firebase 에러 코드 매핑

```typescript
// 주요 Firebase 에러 코드와 사용자 메시지 매핑
const FIREBASE_ERROR_MAP: Record<string, string> = {
  'permission-denied': '접근 권한이 없습니다',
  'not-found': '요청한 데이터를 찾을 수 없습니다',
  'already-exists': '이미 존재하는 데이터입니다',
  'resource-exhausted': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요',
  'unavailable': '서비스에 연결할 수 없습니다. 네트워크를 확인해주세요',
  'unauthenticated': '인증이 필요합니다',
};
```

### 4.2 API Route 에러 응답 패턴

모든 API Route는 `ApiErrorResponse` 형식으로 에러를 반환한다:

```typescript
import { NextResponse } from 'next/server';
import type { ApiErrorResponse } from '@/types/api';

function errorResponse(
  code: string,
  message: string,
  retryable: boolean,
  status: number = 500
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, retryable },
    },
    { status }
  );
}
```

---

## 5. 성능 최적화 가이드

### 5.1 Firestore 인덱스

Firestore 복합 인덱스가 필요한 쿼리:

| 컬렉션 | 필드 조합 | 용도 |
|---|---|---|
| `sessions` | `userId` (ASC) + `status` (ASC) + `createdAt` (DESC) | `getActiveSession()` |
| `diaries` | `userId` (ASC) + `createdAt` (DESC) | `getUserDiaries()` |
| `diaries` | `shareToken` (ASC) | `getDiaryByShareToken()` |

Firestore가 자동으로 인덱스 생성을 안내하므로, 첫 쿼리 실행 시 콘솔 에러 링크를 따라 생성하면 된다.

### 5.2 번들 크기 최적화

1. **firebase-admin**: `serverExternalPackages`에 포함하여 클라이언트 번들에서 제외
2. **Dynamic import**: firebase 클라이언트 SDK를 필요 시점에 동적 로드

```typescript
// 권장: 동적 import
const { db } = await import('@/lib/firebase/config');
```

3. **Tree shaking**: firebase SDK 개별 모듈 import

```typescript
// 올바른 방법
import { getDoc, doc } from 'firebase/firestore';

// 잘못된 방법 (전체 SDK 로드)
import firebase from 'firebase/app';
```

---

## 6. 구현 순서

Part 5 구현 시 다음 순서를 따른다:

### Phase 1: 프로젝트 초기화

1. `package.json` 생성 + `npm install`
2. `tsconfig.json` 생성
3. `next.config.ts` 생성
4. `tailwind.config.ts` 생성
5. `src/app/globals.css` 생성
6. `src/lib/utils.ts` 생성

### Phase 2: 공유 타입 추출

7. `src/types/common.ts` 생성
8. `src/types/restoration.ts` 생성
9. `src/types/discovery.ts` 생성
10. `src/types/diary.ts` 생성
11. `src/types/live-session.ts` 생성 (7-10 이후, import 의존성)
12. `src/types/ws-messages.ts` 생성
13. `src/types/api.ts` 생성
14. `src/types/models.ts` 생성
15. `src/types/env.d.ts` 생성

### Phase 3: Firebase 설정

16. `src/lib/firebase/config.ts` 생성
17. `src/lib/firebase/auth.ts` 생성
18. `src/lib/firebase/firestore.ts` 생성
19. `firestore.rules` 생성
20. `storage.rules` 생성

### Phase 4: UI 기반

21. shadcn/ui 초기화 + 컴포넌트 설치 (또는 직접 생성)

### Phase 5: API + 배포

22. `src/app/api/health/route.ts` 생성
23. `.env.example` 생성
24. `Dockerfile` 생성
25. `cloudbuild.yaml` 생성
26. `public/manifest.json` 생성

### Phase 6: 검증

27. `npm run build` -- 빌드 성공 확인
28. `npm run type-check` -- 타입 오류 없음 확인
29. Docker 로컬 빌드 테스트: `docker build -t timelens .`

---

## 7. Part 1이 Part 5에 기대하는 것

Part 1 설계 문서(`part1-core-pipeline.md`)에서 Part 5에 의존하는 항목:

| Part 1 파일 | Part 5 의존 | 상세 |
|---|---|---|
| `src/lib/gemini/client.ts` | `process.env.GOOGLE_GENAI_API_KEY` | `.env.example`에 정의 |
| `src/app/api/session/route.ts` | `@/types/api` (`CreateSessionRequest/Response`) | `src/types/api.ts`에서 import |
| `src/app/api/session/route.ts` | `@/lib/firebase/firestore` (`createSession`) | `src/lib/firebase/firestore.ts`에서 import |
| `src/hooks/use-live-session.ts` | `@/types/live-session` (모든 타입) | `src/types/live-session.ts`에서 import |
| `src/hooks/use-live-session.ts` | `@/types/common` (`AgentType`, `AudioState` 등) | `src/types/common.ts`에서 import |
| `src/lib/ws/manager.ts` | `@/types/ws-messages` (모든 메시지 타입) | `src/types/ws-messages.ts`에서 import |
| `src/app/api/health/route.ts` | 직접 Part 5 소유 | 그대로 구현 |

**핵심**: Part 5가 완성되어야 Part 1이 `import` 없이 컴파일 가능한 상태가 된다.

---

## 8. 체크리스트

### 구현 완료 확인

- [ ] `package.json` -- 모든 의존성 포함, `npm install` 성공
- [ ] `tsconfig.json` -- `@/*` 경로 매핑, strict 모드
- [ ] `next.config.ts` -- standalone 출력, 이미지 도메인, 보안 헤더
- [ ] `tailwind.config.ts` -- shadcn/ui 테마, TimeLens 커스텀 색상, 애니메이션
- [ ] `src/app/globals.css` -- Tailwind v4 디렉티브, CSS 변수, 모바일 최적화
- [ ] `src/lib/utils.ts` -- `cn()` 함수
- [ ] `src/types/common.ts` -- shared-contract §A 완전 일치
- [ ] `src/types/live-session.ts` -- shared-contract §B 완전 일치
- [ ] `src/types/restoration.ts` -- shared-contract §C 완전 일치
- [ ] `src/types/discovery.ts` -- shared-contract §D (Discovery) 완전 일치
- [ ] `src/types/diary.ts` -- shared-contract §D (Diary) 완전 일치
- [ ] `src/types/ws-messages.ts` -- shared-contract §E 완전 일치
- [ ] `src/types/api.ts` -- shared-contract §F 완전 일치
- [ ] `src/types/models.ts` -- shared-contract §G 완전 일치
- [ ] `src/types/env.d.ts` -- shared-contract §J 완전 일치
- [ ] `src/lib/firebase/config.ts` -- 싱글턴, HMR 안전
- [ ] `src/lib/firebase/auth.ts` -- 익명 인증, waitForAuth
- [ ] `src/lib/firebase/firestore.ts` -- sessions/visits/diaries CRUD 전체
- [ ] `firestore.rules` -- userId 기반 보안, 공유 토큰 읽기
- [ ] `storage.rules` -- 이미지 업로드 제한, 경로별 권한
- [ ] `src/app/api/health/route.ts` -- 서비스 상태 확인
- [ ] `.env.example` -- 모든 환경 변수, 설명 주석
- [ ] `Dockerfile` -- 멀티스테이지, standalone, non-root
- [ ] `cloudbuild.yaml` -- Build/Push/Deploy 3단계, Secret Manager
- [ ] `public/manifest.json` -- PWA 설정
- [ ] shadcn/ui 컴포넌트 15종 설치/생성
- [ ] `npm run build` 성공
- [ ] `npm run type-check` 오류 없음

### shared-contract.md 타입 일치 확인

- [ ] `src/types/common.ts`의 모든 타입이 §A와 정확히 일치
- [ ] `src/types/models.ts`의 `SessionDoc`, `VisitDoc`, `DiaryDoc`가 §G와 정확히 일치
- [ ] `src/types/api.ts`의 `HealthResponse`가 §F와 정확히 일치
- [ ] `src/types/env.d.ts`의 모든 환경 변수가 §J와 정확히 일치

### 다른 파트에서 사용 가능 확인

- [ ] Part 1이 `@/types/*`, `@/lib/firebase/*`를 import할 수 있음
- [ ] Part 2가 `@/components/ui/*`, `@/lib/utils`를 import할 수 있음
- [ ] Part 3이 `@/types/restoration`, `@/lib/firebase/firestore`를 import할 수 있음
- [ ] Part 4가 `@/types/discovery`, `@/types/diary`, `@/lib/firebase/firestore`를 import할 수 있음

---

*TimeLens Part 5: Infrastructure + DevOps*
*Gemini Live Agent Challenge 2026*
