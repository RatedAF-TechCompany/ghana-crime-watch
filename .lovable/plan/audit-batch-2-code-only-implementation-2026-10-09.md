# Audit batch 2 code-only implementation

## Scope
- Add masthead, ownership, contact, organization metadata, and author pages from existing `site_settings` values only.
- Add server-rendered category introductions and crawlable pagination, plus requested noindex and sitemap exclusions.
- Add security headers, CSP reporting, redirects, generated icon configuration, and optimized banner images.
- Preserve article rows and URLs, all audit batch 1 behavior, and current publishing/editorial rules.

## Implementation
1. Build shared validated masthead/author readers and presentation helpers; wire `/masthead`, About, Contact, footer, homepage/About structured data, author hubs, article bylines, and live metadata.
2. Extend category definitions and server data pagination; add numbered category pages and simplify `CategoryView` to render server-provided pages with real links.
3. Harden hub/notices query errors and apply requested robots metadata only to successful empty/hidden pages; align sitemap, news sitemap, and feed counts.
4. Update Next configuration, CSP report endpoint, icon metadata/manifest generation, and banner rendering with `next/image`.
5. Run focused checks and the project build signal; verify public routes and pagination in the preview.

## Constraints
- Code only: no migration, no new tables, and no `site_settings` row changes.
- Never delete articles or change existing article URLs.
- Do not alter batch 1 middleware, route-state, robots, or font work.
