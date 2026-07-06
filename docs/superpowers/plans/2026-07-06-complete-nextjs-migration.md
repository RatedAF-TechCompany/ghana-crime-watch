# Complete Next.js Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the remaining build/runtime blockers left over from the Vite → Next.js migration so `npm run build` succeeds and the app can run.

**Architecture:** Keep the existing App Router structure and `*View.tsx` component split. The remaining work is config cleanup (ESLint, PWA), replacing leftover Vite env references in client components, and removing orphan files.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase, `@ducanh2912/next-pwa`, ESLint 9 flat config.

## Global Constraints

- Do not reintroduce Vite or React Router.
- Use `NEXT_PUBLIC_*` env vars for browser-exposed values.
- Prefer minimal changes; don't refactor component logic unless required to compile.
- All tasks must end with a successful `npm run build`.
- Commit after each independently testable task.

---

## Task 1: Fix ESLint config and re-enable module type

**Files:**
- Modify: `eslint.config.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `eslint-config-next` and `@next/eslint-plugin-next` (already installed via `eslint-config-next` dependency).
- Produces: A valid ESLint 9 flat config that Next.js can use during `next build`.

**Context:** The current `eslint.config.js` imports `typescript-eslint`, but that package was removed from `devDependencies`. `eslint-config-next` is already installed and bundles the TypeScript ESLint parser/plugin, so we can use `FlatCompat` to extend `next/core-web-vitals` and `next/typescript`. Adding `"type": "module"` silences the Node ESM-reparse warning without affecting the project (only config files are `.js`).

- [ ] **Step 1: Replace `eslint.config.js` with a Next.js flat config**

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
```

- [ ] **Step 2: Add `"type": "module"` back to `package.json`**

Modify the root object in `package.json`:

```json
{
  "name": "ghana-crime-watch",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
```

- [ ] **Step 3: Verify ESLint loads**

Run: `npx eslint --max-warnings 0 .`
Expected: No `Cannot find package 'typescript-eslint'` error. Warnings about existing code issues are acceptable; fatal config errors are not.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js package.json
git commit -m "fix(build): replace removed typescript-eslint with eslint-config-next flat config"
```

---

## Task 2: Fix `next.config.ts` PWA runtime-caching type error

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `@ducanh2912/next-pwa` `PluginOptions` type (top-level `runtimeCaching`, no `workbox` key).
- Produces: A type-correct PWA config that compiles.

**Context:** `@ducanh2912/next-pwa` accepts `runtimeCaching` as a top-level plugin option. The current config nests it under `workbox`, which does not exist in `PluginOptions`.

- [ ] **Step 1: Move `runtimeCaching` to the top level of the PWA options**

Replace the contents of `next.config.ts` with:

```ts
import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'zninjnjujptjxdikehun.supabase.co' },
    ],
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
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
})(nextConfig);
```

- [ ] **Step 2: Verify the config type-checks**

Run: `npx tsc --noEmit`
Expected: No error on `next.config.ts`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "fix(build): move next-pwa runtimeCaching to top-level option"
```

---

## Task 3: Replace Vite env vars in admin views

**Files:**
- Modify: `src/components/admin/DashboardView.tsx`
- Modify: `src/components/admin/QuickPublishView.tsx`
- Modify: `src/components/admin/NewsroomView.tsx`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` (already defined in `.env.local`).
- Produces: Admin views that fetch Supabase Edge Functions using Next.js public env vars.

**Context:** These three components still reference `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`, which do not exist in Next.js. Replace them with the `NEXT_PUBLIC_` equivalents. The fallback to the publishable key for the `Authorization` header is preserved but uses the anon key, which is the same value.

- [ ] **Step 1: Update `src/components/admin/DashboardView.tsx`**

Find the `handleTweetArticle` function (around line 240) and replace the fetch block:

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const resp = await fetch(`${supabaseUrl}/functions/v1/auto-tweet`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
  },
  body: JSON.stringify({ article_id: article.id }),
});
```

- [ ] **Step 2: Update `src/components/admin/QuickPublishView.tsx`**

Find the fetch inside `handleSubmit` (around line 88) and replace it:

```ts
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manual-article-submit`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      content,
      publishMode,
      scheduledTime: publishMode === 'schedule' ? scheduledTime : undefined,
    }),
  }
);
```

- [ ] **Step 3: Update `src/components/admin/NewsroomView.tsx`**

Find the `handleRunNewsroom` function (around line 108) and replace the fetch block:

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const response = await fetch(`${supabaseUrl}/functions/v1/run-newsroom`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
  },
  body: JSON.stringify({ trigger_type: 'manual' }),
});
```

- [ ] **Step 4: Confirm no Vite env references remain**

Run: `rg "import\.meta\.env|VITE_" src/ --type tsx`
Expected: Zero matches.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/DashboardView.tsx src/components/admin/QuickPublishView.tsx src/components/admin/NewsroomView.tsx
git commit -m "fix(admin): replace Vite env vars with NEXT_PUBLIC_* in edge function calls"
```

---

## Task 4: Clean up migration artifacts

**Files:**
- Delete: `src/vite-env.d.ts`
- Modify: `.env`

**Interfaces:**
- Consumes: `.env.local` already contains the canonical `NEXT_PUBLIC_*` values.
- Produces: A repo without orphaned Vite declaration files or duplicate legacy env vars.

**Context:** `src/vite-env.d.ts` only existed for Vite client types and is now unused. `.env` still contains legacy `VITE_*` entries that are superseded by `.env.local`.

- [ ] **Step 1: Delete `src/vite-env.d.ts`**

```bash
rm src/vite-env.d.ts
```

- [ ] **Step 2: Replace `.env` with Next.js public variables**

Write `env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zninjnjujptjxdikehun.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaW5qbmp1anB0anhkaWtlaHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTEyNjYsImV4cCI6MjA3OTk4NzI2Nn0.6n_eWoQ789-Gg_77GpRF-Nw49NpafzqNQuWRwoDAVCQ
NEXT_PUBLIC_GA_MEASUREMENT_ID=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Verify no Vite artifacts remain**

Run: `rg "vite|VITE_" . --glob '!node_modules' --glob '!.git' --glob '!public/*.js'`
Expected: Matches only in `package-lock.json` or unrelated files; no source/config hits.

- [ ] **Step 4: Commit**

```bash
git rm src/vite-env.d.ts
git add .env
git commit -m "chore(migration): remove Vite artifacts and legacy env vars"
```

---

## Task 5: Full build verification

**Files:**
- None (verification task).

**Interfaces:**
- Consumes: All changes from Tasks 1–4.
- Produces: A passing production build.

- [ ] **Step 1: Clean and build**

```bash
rm -rf .next
npm run build
```

Expected:
- ESLint loads without the `typescript-eslint` error.
- `next.config.ts` type-checks without the `workbox` error.
- No `import.meta.env` errors from admin views.
- Build completes with `Build completed successfully`.

- [ ] **Step 2: (Optional) Smoke-test dev server start**

Run: `timeout 20 npm run dev 2>&1 | head -40`
Expected: `Ready` or `Local:` appears within 20 seconds; no fatal startup errors.

- [ ] **Step 3: Commit (if any last-minute fixes were needed)**

If the build required additional tweaks, commit them with a message like:

```bash
git commit -m "fix(build): final migration fixes for successful next build"
```

---

## Self-Review

**Spec coverage:**
- Fix build errors → Tasks 1, 2, 5.
- Fix runtime Vite env references → Task 3.
- Clean up migration leftovers → Task 4.

**Placeholder scan:**
- No TBD/TODO/"implement later"/"similar to" placeholders.
- Every code step contains exact file content or exact replacement code.

**Type consistency:**
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only public env vars introduced; they already exist in `.env.local`.
- `@ducanh2912/next-pwa` option names match the installed package's `PluginOptions` type.
