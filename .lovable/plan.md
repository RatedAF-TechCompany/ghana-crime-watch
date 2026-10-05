# GhanaCrimes P0 UI pass

## Scope
- Make the desktop navigation appear only at 1024px and above, keep the menu available below that width, remove slash separators, and keep the admin link strictly session-gated.
- Add a visible homepage H1, use exact published timestamps, retain Tools & data, and render editorial modules only when their articles genuinely match that module.
- Add permanent legacy redirects and SSR index pages for all topic and region hubs.
- Update Missing, Alerts, and Wanted copy and fields using only verified data already stored.
- Add the new hub indexes to the sitemap and verify desktop/mobile navigation, public pages, redirects, and build health.

## Technical details
- Use Next.js App Router redirects and Server Component index pages.
- Use existing region/topic constants and article data; no new database records or invented metadata.
- Treat `date_seen` as the notice/warrant date currently available, and only show a separate last-verified value if the database contains one.
- Keep article records, publishing automation, email, tweets, and editorial policy unchanged.
