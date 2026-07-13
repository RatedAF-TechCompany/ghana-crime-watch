# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GhanaCrimes is a Next.js 15 (App Router) news site covering Ghana crime news, plus a "Fraud Watch" community reporting feature and a CMS-style admin/newsroom section. Backend is Supabase (Postgres + Auth + Storage + Edge Functions). Deployed on Vercel.

The project was migrated from a Vite/React-Router SPA (originally scaffolded by Lovable) to Next.js App Router — see `docs/superpowers/plans/2026-07-06-complete-nextjs-migration.md` for that history. Do not reintroduce Vite or React Router.

## Commands

```bash
npm run dev      # start dev server (Next.js, port 8080 per .claude/launch.json)
npm run build    # production build
npm run start    # run production build
npm run lint     # next lint (ESLint 9 flat config)
npx tsc --noEmit # typecheck (strict mode is off; noEmit only)
```

There is no test suite configured. Both `package-lock.json` and `bun.lock`/`bun.lockb` are committed; use `npm` (matches the scripts and the migration plan) unless told otherwise.

Env vars live in `.env` / `.env.local`: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `SUPABASE_SERVICE_ROLE_KEY`. Only `NEXT_PUBLIC_*` vars are exposed to the browser.

## Architecture

### Routing vs. rendering split ("`*View` pattern")

`app/**/page.tsx` files are thin Server Components. Their only jobs are: define the route, fetch data server-side for `generateMetadata()` (SEO/OG tags via `createServerClient()`), and render a `Layout` wrapping a `*View` component from `src/components/`. All actual page content, interactivity, and data fetching lives in the client-side `*View` component (e.g. `app/page.tsx` → `HomeView`, `app/[categorySlug]/[articleSlug]/page.tsx` → `ArticleView`, `app/admin/page.tsx` → `DashboardView`). When adding a route, follow this split rather than putting logic directly in `page.tsx`.

Dynamic routes: `app/[categorySlug]/page.tsx` (category listing) and `app/[categorySlug]/[articleSlug]/page.tsx` (article detail) drive most public content. `route params` are async (`Promise<{...}>`) per Next 15.

### Data layer: two Supabase clients

- `src/integrations/supabase/client.ts` — browser client (anon key, `persistSession: true`, localStorage). Import as `import { supabase } from "@/integrations/supabase/client"`. Used inside client components, typically via TanStack Query (`useQuery`/`useMutation`).
- `src/lib/supabase/server.ts` — server client (anon key, `persistSession: false`) for use inside `generateMetadata()` and other server-only code (e.g. `app/sitemap.ts`, `app/news-sitemap.xml/route.ts`).
- `src/integrations/supabase/types.ts` — generated `Database` types from the Supabase schema; both clients are typed with it. Regenerate this after schema/migration changes rather than hand-editing.
- No `middleware.ts` exists — there's no session-refresh or route-guard middleware; auth/authorization is handled client-side and via Postgres RLS policies.

### Supabase backend (`supabase/`)

- `supabase/migrations/` — timestamped SQL migrations (source of truth for schema).
- `supabase/functions/` — Deno Edge Functions: content ingestion (`ingest-ghanaweb`, `ingest-ghchronicles`, `ingest-edhub`, `rss-feed`), the automated "newsroom" pipeline (`run-newsroom`, `newsroom-scheduled`, `generate-article-fields`, `extract-cities`, `backfill-hero-images`, `auto-tweet`, `auto-comment`), and comment/newsletter mail flows (`send-comment-verification`, `verify-comment`, `send-newsletter-digest`). `supabase/config.toml` sets per-function `verify_jwt`. Shared helper: `supabase/functions/_shared/extract-image.ts`.

### Component organization (`src/components/`)

- Top-level loose files: shared/global components (`Layout`, `Header`, `NavigationDrawer`, `SearchOverlay`) and the page-level `*View` components (`HomeView`, `ArticleView`, `CategoryView`, `AuthView`, `FraudWatch*View`, etc.).
- `admin/` — CMS/newsroom tooling: `DashboardView`, `ArticleEditorView` (+ `TiptapEditor`), `NewsroomView`, `QuickPublishView`, `AnalyticsView`, `AdSettingsPanel`, `ImageUpload`.
- `editorial/` — magazine-style content sections (`MagazinePanel`, `ColumnsSection`, `CartoonSection`, `PodcastsPanel`, `GhanaCrimesTV`).
- `broadcast/` — small layout primitives (`StoryGrid`, `SectionHeading`, `Badge`).
- `ui/` — shadcn/ui primitives (Radix-based); path aliases configured in `components.json` (`@/components`, `@/lib`, `@/hooks`, `@/components/ui`). Only path alias is `@/*` → `./src/*` (see `tsconfig.json`).

### Fraud Watch feature

A parallel section (`app/fraud-watch/**`, `src/components/FraudWatch*View.tsx`) letting users search/report fraudulent phone numbers/accounts, backed by its own Supabase tables and an admin moderation view (`src/components/admin/FraudWatchAdminView.tsx`).

### SEO / social sharing

Article Open Graph/Twitter images are proxied through `app/api/og-image/route.ts` (see recent commits around hero-image OG proxying) rather than linked directly to Supabase storage. `BASE_URL` is centralized in `src/lib/utils.ts` — use it instead of hardcoding the domain. `app/sitemap.ts` and `app/news-sitemap.xml/route.ts` generate sitemaps server-side from Supabase.

### PWA

`next.config.ts` wraps the config with `@ducanh2912/next-pwa` (disabled in dev), with custom `runtimeCaching`: NetworkFirst for the Supabase REST API, CacheFirst for Supabase Storage images. `public/manifest.json` + `src/components/PWAInstallPrompt.tsx` + `src/hooks/use-pwa-install.ts` handle install prompts.

## Linting notes

`eslint.config.js` extends `next/core-web-vitals` + `next/typescript` but turns off several rules repo-wide (`no-explicit-any`, `no-unused-vars`, `no-img-element`, `react-hooks/exhaustive-deps`, etc.) — don't assume these rules are enforced when reviewing code style.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
