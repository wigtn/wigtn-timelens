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
