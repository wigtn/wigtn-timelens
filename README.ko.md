# TimeLens

박물관 유물에 생명을 불어넣는 AI 문화유산 컴패니언. 실시간 대화, 이미지 복원, 인터랙티브 탐험을 제공합니다.

**Gemini Live Agent Challenge** 출품작.

## 주요 기능

- **AI 큐레이터** — Gemini Live API 기반 실시간 음성/영상 대화. 카메라로 유물을 비추고 자연스럽게 질문하세요.
- **유물 인식** — 카메라를 통해 유물을 식별하고 시대, 문명, 역사적 맥락을 제공합니다.
- **이미지 복원** — Gemini Flash로 손상된 유물의 원래 모습을 복원합니다.
- **주변 탐험** — Google Places API로 현재 위치 근처의 박물관과 문화유산을 찾아줍니다.
- **방문 다이어리** — 박물관 방문을 요약한 일러스트 다이어리를 자동 생성합니다.
- **박물관 온보딩** — 시작 전 박물관을 선택하면 AI가 해당 박물관의 전시 정보를 파악하고 맥락 있는 인사로 시작합니다.

## 기술 스택

| 레이어 | 기술 |
|--------|-----|
| 프론트엔드 | Next.js 15, React 19, TypeScript 5, Tailwind CSS 4 |
| AI | Gemini Live API, Google ADK, `@google/genai` |
| 데이터베이스 | Firebase Firestore, Firebase Auth |
| 지도 | Google Places API (New), Geolocation API |
| 배포 | Docker, Cloud Run (서울), GitHub Actions CI/CD |

## 시작하기

### 사전 요구사항

- Node.js 20+
- npm 10+
- Google AI Studio API 키
- Firebase 프로젝트
- Google Places API 키

### 설치

```bash
git clone https://github.com/wigtn/wigtn-timelens.git
cd wigtn-timelens
npm install
cp .env.example .env.local
# .env.local에 API 키를 입력하세요
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

### 환경 변수

| 변수 | 설명 |
|------|------|
| `GOOGLE_GENAI_API_KEY` | Google AI Studio API 키 |
| `GOOGLE_PLACES_API_KEY` | Places API 키 (서버 전용) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 클라이언트 API 키 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API 키 |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (기본값: `http://localhost:3000`) |

전체 목록은 `.env.example`을 참고하세요.

## 스크립트

```bash
npm run dev          # 개발 서버 (Turbopack)
npm run build        # 프로덕션 빌드
npm start            # 프로덕션 서버
npm run lint         # ESLint
npm run type-check   # TypeScript 검증
```

## 아키텍처

```
사용자 디바이스 (카메라 + 마이크)
    │
    ▼
┌─────────────────────────────┐
│  Next.js 프론트엔드 (React) │
│  - 박물관 선택 (온보딩)     │
│  - 라이브 세션 UI           │
│  - 복원 결과 뷰어           │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐  ┌──────────┐
│ Live   │  │ REST API │
│ API    │  │ Routes   │
│(스트림)│  │(온디맨드)│
└───┬────┘  └────┬─────┘
    │            │
    ▼            ▼
┌─────────────────────────────┐
│  Gemini (Live + Flash)      │
│  + Google Search Grounding  │
│  + Places API               │
│  + Firebase                 │
└─────────────────────────────┘
```

**듀얼 파이프라인:**
- **파이프라인 1 (Live):** Gemini Live API를 통한 스트리밍 오디오/비디오 + Function Calling
- **파이프라인 2 (REST):** 이미지 복원, 주변 탐험, 다이어리 생성 등 서버 API 라우트

## 프로젝트 구조

```
src/
  app/            # Next.js 페이지 & API 라우트
  shared/         # 공유 타입, Gemini 도구, 설정
  web/            # 클라이언트 컴포넌트 & 훅
  back/           # 서버 로직 (에이전트, 지도, Firebase)
mobile/           # React Native + Expo 앱
docs/             # PRD, 설계 문서, 계약서
```

## 배포

**Google Cloud Run** (asia-northeast3, 서울)에 GitHub Actions로 자동 배포됩니다.

```bash
# 수동 빌드 (선택)
docker build -t timelens .
docker run -p 8080:8080 timelens
```

## 라이선스

Gemini Live Agent Challenge 해커톤 출품작입니다.
