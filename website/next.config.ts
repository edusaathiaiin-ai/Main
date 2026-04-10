import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vpmpuxosyrijknbxautx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Static assets — content-hashed by Next.js, safe to cache forever
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Optimised images — cache 7 days, serve stale while revalidating
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // Page HTML — serve instantly from cache, revalidate in background
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, stale-while-revalidate=60' },
        ],
      },
    ];
  },
};

export default nextConfig;
