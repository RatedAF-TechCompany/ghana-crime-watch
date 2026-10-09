import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';
import fs from 'node:fs';

async function makeIcons() {
  // Derives correctly sized icons from the existing logo public/favicon.png. Never edits or deletes the source.
  const SRC = 'public/favicon.png', OUT = 'public/icons';
  const sizes: Record<string, number> = { 'icon-32.png': 32, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512, 'logo-512.png': 512 };
  try {
    fs.mkdirSync(OUT, { recursive: true });
    if (fs.existsSync(`${OUT}/favicon.ico`) && fs.statSync(`${OUT}/favicon.ico`).mtimeMs > fs.statSync(SRC).mtimeMs) return;
    const sharp: any = (await import('sharp' as string)).default; // non-literal specifier: no type dependency on sharp
    const png = (n: number) => sharp(SRC).resize(n, n, { fit: 'cover' }).png().toBuffer();
    for (const [f, n] of Object.entries(sizes)) fs.writeFileSync(`${OUT}/${f}`, await png(n));
    const inner = await sharp(SRC).resize(410, 410, { fit: 'cover' }).png().toBuffer();
    fs.writeFileSync(`${OUT}/icon-maskable-512.png`, await sharp({ create: { width: 512, height: 512, channels: 4, background: '#000000' } }).composite([{ input: inner, gravity: 'center' }]).png().toBuffer());
    const ns = [16, 32, 48], imgs = await Promise.all(ns.map(png));
    const head = Buffer.alloc(6 + 16 * ns.length); head.writeUInt16LE(1, 2); head.writeUInt16LE(ns.length, 4);
    let off = head.length;
    imgs.forEach((b, i) => { const e = 6 + 16 * i; head.writeUInt8(ns[i], e); head.writeUInt8(ns[i], e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(b.length, e + 8); head.writeUInt32LE(off, e + 12); off += b.length; });
    fs.writeFileSync(`${OUT}/favicon.ico`, Buffer.concat([head, ...imgs]));
  } catch (e: any) {
    console.warn('makeIcons: sharp unavailable, copying the source unchanged:', e?.message);
    try { for (const f of [...Object.keys(sizes), 'icon-maskable-512.png', 'favicon.ico']) fs.copyFileSync(SRC, `${OUT}/${f}`); } catch {}
  }
}

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
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/crime', destination: '/violent-crime', permanent: true },
      { source: '/court', destination: '/court-cases', permanent: true },
      { source: '/police', destination: '/police-reports', permanent: true },
      { source: '/fraud', destination: '/fraud-scams', permanent: true },
      { source: '/news', destination: '/top-stories', permanent: true },
      { source: '/latest', destination: '/top-stories', permanent: true },
      { source: '/rss', destination: '/rss.xml', permanent: true },
      { source: '/feed', destination: '/rss.xml', statusCode: 301 } as any,
      { source: '/drugs', destination: '/drug-offences', permanent: true },
      { source: '/breaking-news', destination: '/top-stories', permanent: true },
      { source: '/about/ownership', destination: '/masthead', permanent: true },
      { source: '/authors', destination: '/authors/ghanacrimes-newsroom', permanent: false },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: '/favicon.ico', destination: '/icons/favicon.ico' }], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app https://*.lovableproject.com" },
      { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://zninjnjujptjxdikehun.supabase.co https://police.gov.gh https://*.police.gov.gh https://*.interpol.int https://*.google-analytics.com https://*.googletagmanager.com; font-src 'self' data:; connect-src 'self' https://zninjnjujptjxdikehun.supabase.co wss://zninjnjujptjxdikehun.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; media-src 'self' https://zninjnjujptjxdikehun.supabase.co; worker-src 'self' blob:; manifest-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; report-uri /api/csp-report" },
    ] }];
  },
  outputFileTracingRoot: process.cwd(),
  // Lint runs separately (npm run lint); auto-generated files must not block deploys.
  eslint: { ignoreDuringBuilds: true },
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

export default async function config() {
  await makeIcons();
  return withPWA({
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
}
