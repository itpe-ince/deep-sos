import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // Next 15 + Turbopack: jsdom 의 .css/.html 자산을 번들링하지 않고 Node 에서 require 하도록 externalize.
  // isomorphic-dompurify 는 서버에서 jsdom 을 동적 로드한다 — 번들에 포함되면 default-stylesheet.css ENOENT 발생.
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3810/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3810/api'}/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
