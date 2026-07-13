import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

// Ensure NEXT_PUBLIC_* vars exist in process.env (for SSG/server runtime),
// falling back to legacy VITE_* vars from .env.
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';


const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      '',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'zninjnjujptjxdikehun.supabase.co' },
    ],
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        // NetworkFirst for Supabase REST API — 5-min TTL, 100 entries
        urlPattern: /^https:\/\/zninjnjujptjxdikehun\.supabase\.co\/rest\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
        },
      },
      {
        // CacheFirst for Supabase Storage images — 7-day TTL, 100 entries
        urlPattern: /^https:\/\/zninjnjujptjxdikehun\.supabase\.co\/storage\/v1\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
  },
})(nextConfig);
