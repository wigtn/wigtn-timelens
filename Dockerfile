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
