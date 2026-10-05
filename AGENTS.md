# Architecture rules

- Public pages (home, category, article) fetch their first data on the server (`src/lib/server-data.ts`) and pass it to the client `*View` as `initialData`, so content is in the HTML for crawlers.
- JSON-LD is emitted with the `JsonLd` server component as a real `<script type="application/ld+json">`, never via metadata `other`.
- Unknown categories and articles call `notFound()` (real HTTP 404); valid slugs come from `isValidCategory` in `src/lib/categories.ts`.
- Legacy article slugs with epoch suffixes resolve via `findSlugRedirect` (permanent redirect); new slugs are clean with `-2`, `-3` on collision.
- Feeds and sitemaps are Next route handlers on the site domain (`/rss.xml`, `/feed.xml`, `/sitemap.xml` index, `/sitemaps/*`, `/news-sitemap.xml`), not edge-function URLs.
- Article images render through `getArticleImage`, which only allows self-hosted storage URLs; anything else shows the placeholder card. Ingestion never stores third-party image URLs.
- Article HTML is sanitised with `sanitize-html` (`src/lib/sanitize.ts`) because DOMPurify does not sanitise during server rendering.
- Public form submissions (contact, tips, corrections) go to insert-only tables; only staff roles can read them, checked via `has_role`.
- Approved comments are read through the `get_approved_comments` function; the comments table is not readable anonymously.
- Legacy public section aliases use permanent redirects in `next.config.ts`, keeping redirect behavior centralized without middleware.
- Logged-out /admin is HTTP-redirected to /auth by `middleware.ts` using a client-set `gc_session` hint cookie; real authorization stays in AdminGate and RLS, because sessions live in localStorage, not server cookies.
- `/top-stories` lists the latest published stories across all sections, not a single category filter.
