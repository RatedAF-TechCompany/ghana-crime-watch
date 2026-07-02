
# GhanaCrimes Broadcast-News Redesign

Transform the site into a Sky-News-style broadcast layout using the supplied spec, keeping all existing branding, data, routing, SEO, and functionality intact.

## Scope

**In scope (visual/presentation only):**
- Global design tokens (colors, typography, radii, shadows)
- Header (black bar, nav links, mobile menu)
- Breaking bar (orange strip under header)
- Homepage: TOP STORIES asymmetric lead, GHANA CRIME STORIES 4-col grid, MORE GHANA STORIES grid, MOST READ numbered two-column list
- Category page grid
- Article page typography/layout polish
- Search results styling
- Footer (4-column, white, thin top border)
- Reusable `ArticleCard` variants (lead / grid / numbered)
- Badge components (BREAKING yellow, LIVE red-dot, EXCLUSIVE black, video duration)

**Out of scope (untouched):**
- Supabase schema, edge functions, RSS pipeline, auto-tweet kill switch
- Routing, article slugs, SEO meta generation, JSON-LD
- Admin dashboard, newsroom, fraud watch admin
- Auth, RLS, bookmarks, comments, analytics logic
- AdBanner placement logic, WhatsApp CTA, Newsletter component internals (only restyled to fit)

## Design Tokens (index.css + tailwind.config.ts)

```
--background: 0 0% 100%          /* #ffffff */
--foreground: 0 0% 12%           /* #1f1f1f */
--muted: 0 0% 96%                /* #f5f5f5 */
--muted-foreground: 0 0% 42%     /* #6b6b6b */
--border: 0 0% 85%               /* #d9d9d9 */
--primary: 21 89% 54%            /* #f36b21 GhanaCrimes orange */
--primary-foreground: 0 0% 100%
--secondary: 0 0% 0%             /* #000000 nav bar */
--accent-yellow: 51 100% 50%     /* #ffd800 breaking badge */
--accent-red: 0 100% 45%         /* #e60000 live */
--radius: 2px
```

Fonts: keep Inter for body; add **Oswald** (condensed 900) for section headings and MOST READ numbers via Google Fonts. Retire Lora on marketing surfaces (keep only inside `.article-body` for reading comfort — confirm below).

## Files to change

```
src/index.css                          tokens, font imports, .section-heading, .story-title utilities
tailwind.config.ts                     font families (display: Oswald), extend colors
src/components/Header.tsx              black bar, inline nav links, mobile menu
src/components/NavigationDrawer.tsx    restyle to match
src/components/BreakingNewsTicker.tsx  orange strip, "BREAKING" label chip
src/components/HeroArticle.tsx         asymmetric lead card (16:9, 32px headline)
src/components/ArticleCard.tsx         add `variant`: "grid" | "lead" | "secondary" | "numbered"
src/components/MostReadArticles.tsx    numbered two-column list, huge orange numerals
src/components/Layout.tsx              new 4-column footer
src/pages/Index.tsx                    new section structure: TOP STORIES / GHANA CRIME STORIES / MORE GHANA STORIES / MOST READ
src/pages/CategoryPage.tsx             4-col grid + section heading
src/pages/ArticlePage.tsx              typography polish (line-length, byline, meta)
src/pages/FraudWatch* + Search overlay minor restyle to match tokens
```

New small components:
```
src/components/broadcast/SectionHeading.tsx   uppercase Oswald 42/30
src/components/broadcast/Badge.tsx            breaking/live/exclusive/duration variants
src/components/broadcast/StoryGrid.tsx        4/2/1 responsive grid wrapper
```

## Component behavior

- `ArticleCard variant="grid"`: 16:9 image on top, headline 18–21px, meta below, thin `border-b` divider, 28px gap via parent grid.
- `variant="lead"`: 16:9 image, 32px headline, meta, optional video badge slot.
- `MostReadArticles`: fetch top 10 by view count (existing query), render `<ol>` split into two columns on `lg:`, each row `py-6 border-b`, numeral in Oswald 44px `text-primary`.
- Header: dark mode toggle + notification bell + search stay, all restyled white-on-black; admin link kept for staff.
- Dark mode: keep working, but recolor to a neutral dark (not warm brown) to match broadcast aesthetic.

## Data / functionality preserved

- All Supabase queries unchanged.
- Article URLs `/{category_slug}/{article_slug}` unchanged.
- SEO tags, sitemap, RSS untouched.
- AdBanner and WhatsAppChannelCTA still render in the same slots (restyled containers only).
- Newsletter signup kept in sidebar/mobile block.

## Questions before I build

1. **Fonts**: OK to add **Oswald** (Google Fonts) for section headings + numerals, keep Inter for body, and retain Lora only inside article body copy? Or drop Lora entirely?
2. **Sidebar**: Spec shows a full-width single-column homepage (no right sidebar). Should I remove the desktop sidebar (Most Read, Crime Dashboard, Newsletter, Ad, WhatsApp CTA move into full-width sections between grids), or keep the current 8/4 sidebar layout?
3. **Fraud Watch banner**: Keep the red banner on the homepage above TOP STORIES, or move it lower / restyle it into a compact orange strip to fit the broadcast aesthetic?
4. **Dark mode**: Keep the dark-mode toggle, or drop it (broadcast-news sites are typically light-only)?

Once you answer these four I'll implement in a single pass.
