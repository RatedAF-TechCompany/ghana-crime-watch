<!--
Sync Impact Report
==================
Version change: TEMPLATE (unratified) → 1.0.0
Rationale: Initial ratification — constitution had never been filled in; all
values below are derived from repository context (docs/superpowers/plans/
2026-07-06-complete-nextjs-migration.md, existing app/ + src/ architecture,
supabase/ layout, package.json, eslint.config.js) rather than from prior
constitution text, since none existed.

Principles defined (all new):
  - I.   Server/Client Component Separation (the "*View" Pattern)
  - II.  Next.js App Router Is Final (No Regression to Vite/React Router)
  - III. Supabase Schema Changes Flow Through Migrations
  - IV.  Build-Verified, Incremental Changes
  - V.   Browser/Server Secret Boundary

Added sections: Technology Stack Constraints, Development Workflow, Governance
Removed sections: none (template had no prior filled content)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate is derived
     dynamically from this file at plan time; no static text to change.
  ✅ .specify/templates/spec-template.md — generic, no constitution-specific
     references found that need syncing.
  ✅ .specify/templates/tasks-template.md — generic; "Tests are OPTIONAL"
     phrasing already consistent with Principle IV / no test suite reality.
  ⚠ CLAUDE.md — already documents the *View pattern, the Next.js migration
     constraint, and the dual Supabase client split; no edits required now,
     but keep it in sync by hand on future constitution amendments (no
     automated agent-context hook is registered for `after_constitution`).

Follow-up TODOs: none — no placeholders were deferred.
-->

# GhanaCrimes Constitution

## Core Principles

### I. Server/Client Component Separation (the "*View" Pattern)

Route files under `app/**/page.tsx` MUST remain Server Components limited to:
defining the route, fetching data needed for `generateMetadata()` (SEO/Open
Graph tags), and rendering a `Layout` wrapping a corresponding client `*View`
component from `src/components/` (e.g. `HomeView`, `ArticleView`,
`DashboardView`). All interactive logic, state, and client-side data fetching
(via the browser Supabase client and TanStack Query) MUST live inside the
`*View` component, not in `page.tsx`.

Rationale: This split keeps SEO-critical metadata server-rendered and fast
while isolating interactivity and client-only concerns. It is the backbone of
the Next.js migration — bypassing it re-introduces the coupling problems the
migration was meant to fix.

### II. Next.js App Router Is Final (No Regression to Vite/React Router)

The application MUST remain on Next.js App Router. Vite, React Router, or any
other client-side SPA routing/build tooling MUST NOT be reintroduced, and Vite
env-var patterns (`import.meta.env.*`) MUST NOT reappear.

Rationale: The migration from the original Vite/React-Router SPA (scaffolded
by Lovable) to Next.js App Router is complete (see
`docs/superpowers/plans/2026-07-06-complete-nextjs-migration.md`). Reverting
any part of it would undo the SSR, SEO, and server-metadata benefits already
delivered.

### III. Supabase Schema Changes Flow Through Migrations

Any database schema change MUST be captured as a new timestamped SQL file in
`supabase/migrations/`. `src/integrations/supabase/types.ts` MUST be
regenerated from the schema afterward — it MUST NOT be hand-edited.
Authorization MUST be enforced via Postgres Row-Level Security policies,
since the app has no `middleware.ts` and no server-side auth guard.

Rationale: Migrations are the single source of truth for schema, and codegen
is the only supported path to keep the two Supabase clients
(`src/integrations/supabase/client.ts`, `src/lib/supabase/server.ts`) typed
correctly. With no route middleware, RLS is the only real authorization
boundary in the system.

### IV. Build-Verified, Incremental Changes

Every change set MUST end with a successful `npm run build`. Prefer minimal,
incremental diffs that compile over large speculative refactors, and commit
each independently-testable step separately rather than batching unrelated
changes.

Rationale: Carried forward from the Next.js migration's global constraints.
There is no automated test suite (see Technology Stack Constraints below), so
a passing build is the primary automated correctness signal before a change
reaches Vercel.

### V. Browser/Server Secret Boundary

Only `NEXT_PUBLIC_*` environment variables MAY be referenced from client
components or other browser-reachable code. Secrets such as
`SUPABASE_SERVICE_ROLE_KEY` MUST remain server-only (Supabase Edge Functions,
Server Components, or Route Handlers) and MUST NOT be imported into any file
that ships to the browser.

Rationale: Next.js inlines `NEXT_PUBLIC_*` variables into the client bundle at
build time; anything else referenced from client code is a credential leak,
not just a config mistake.

## Technology Stack Constraints

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript with `strict`
  intentionally off (`noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
  disabled) — do not tighten these repo-wide without a dedicated decision and
  a pass over existing violations. Styling via Tailwind CSS + shadcn/ui
  (Radix primitives). Client data fetching via TanStack Query.
- **Backend**: Supabase (Postgres, Auth, Storage) plus Deno Edge Functions
  under `supabase/functions/` for content ingestion (`ingest-ghanaweb`,
  `ingest-ghchronicles`, `ingest-edhub`, `rss-feed`), the automated newsroom
  pipeline (`run-newsroom`, `newsroom-scheduled`, `generate-article-fields`,
  `extract-cities`, `backfill-hero-images`, `auto-tweet`, `auto-comment`), and
  comment/newsletter email flows (`send-comment-verification`,
  `verify-comment`, `send-newsletter-digest`).
- **Deployment**: Vercel (`vercel.json` declares `"framework": "nextjs"`).
  PWA support is provided by `@ducanh2912/next-pwa`, disabled in development.
- **Testing**: No automated test suite exists today. Do not assume CI test
  gates are enforced unless a test framework is explicitly added to
  `package.json`.

## Development Workflow

- **Package manager**: `npm` — `package-lock.json` is authoritative even
  though `bun.lock`/`bun.lockb` are also committed; do not add or update the
  bun lockfiles as part of unrelated changes.
- **Linting**: `next lint` via `eslint.config.js`, which intentionally
  disables several rules repo-wide (`@typescript-eslint/no-explicit-any`,
  `@typescript-eslint/no-unused-vars`, `@next/next/no-img-element`,
  `react-hooks/exhaustive-deps`, `react/no-unescaped-entities`). Do not treat
  violations of these disabled rules as defects in review.
- **New features** follow Principle I (routing vs. `*View` split) and the
  existing component taxonomy in `src/components/` (`admin/`, `editorial/`,
  `broadcast/`, `ui/`, plus loose top-level shared/page components).

## Governance

This constitution supersedes ad hoc practice for this repository. Amendments
are made by editing `.specify/memory/constitution.md` directly, following the
same collection → draft → propagate → validate flow used to create this
version, and require:

1. A version bump following semantic versioning: MAJOR for backward-
   incompatible principle removal/redefinition, MINOR for a new or materially
   expanded principle/section, PATCH for wording/clarification fixes.
2. An updated Sync Impact Report prepended to this file as an HTML comment.
3. A check of `.specify/templates/plan-template.md`,
   `spec-template.md`, and `tasks-template.md` for now-stale references.

Every `/speckit-plan` output MUST include a Constitution Check gate against
the principles above; any violation MUST be documented and justified in that
plan's Complexity Tracking table rather than silently ignored. Use
`CLAUDE.md` for Claude Code-specific runtime/architecture guidance — it is
maintained by hand and should be reviewed (not auto-synced) whenever this
constitution changes materially.

**Version**: 1.0.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
