## GhanaCrimes editorial redesign

Apply the provided design spec across the site without touching CMS data, routes, article URLs, or SEO metadata. Brand always written exactly as `GhanaCrimes`.

### 1. Design tokens and fonts (`src/index.css`, `tailwind.config.ts`)
- Load fonts from Google Fonts: Cormorant Garamond (masthead), Libre Baskerville (headlines + body serif), Inter (nav/meta).
- Update HSL tokens to the spec palette:
  - background `#fffdf8`, panel `#ffffff`, primary/masthead red `#b20d18`, deep red `#9f151f`, body `#161616`, muted `#6f6a64`, hairline `#e5ded6`, pale rule `#d8cfc4`, blue `#174b73`, subscribe yellow `#ffd800`, dark video `#1f1f1f`.
- Border radius set to 0 globally for editorial blocks.
- Utility classes: `.masthead-word` (Cormorant, red, tight tracking), `.headline-serif`, `.author-italic-red`, `.meta-sans`, `.nav-slash` separator, `.red-double-rule`, `.hairline`, `.hatched-rule`, `.section-title-serif`, `.pale-rank-number`.

### 2. Header (`src/components/Header.tsx`)
- Row 1: `GhanaCrimes` masthead left in Cormorant red (44-56px), hamburger icon beside it, then nav links (`Crime / Court / Police / Politics / Economy / World / Culture / Life / Magazine`) with diagonal slash separators. Right side: search icon, `SIGN IN` white pill with black border, `SUBSCRIBE` yellow pill.
- Row 2: Blue full-width strip (`#174b73`) for editorial/membership message.
- Row 3: White "Data hub" style strip with centred short message and small red chevron marks on both sides.
- Thin beige hairline below.
- Mobile: masthead left, hamburger right, nav collapses into sheet.

### 3. Homepage (`src/pages/Index.tsx` and components)
Three-column hero (27% / 46% / 27%):
- Left column: stacked secondary stories with italic red author, serif headline, image, beige hairlines between.
- Centre column: large cover-style lead story, 4:5 image, italic red author, big serif headline.
- Right column: "Latest from GhanaCrimes" panel with red double rule top, small red serif title with a red circular arrow, list of items (italic red author + serif headline + beige divider).

Then in order down the page:
- `Most popular` + `Writers` two-column section separated by vertical hairline, with a long diagonal hatch rule on top. Popular items: pale grey serif number left, italic red author, black serif headline, small 120x74 thumbnail right. Writers items: italic red author, serif headline, circular initials mark (portrait fallback).
- `GhanaCrimes TV`: one large dark video block left, two smaller stacked right, red play dot.
- `Magazine`: white panel with cover placeholder left, main headline centre, supporting links right.
- `Columns`: two-column opinion section, serif headlines, short excerpts.
- `Podcasts`: dark editorial block.
- `Cartoon`: three-column quote/cartoon section.

All existing article data (top stories, most read, category grids) is remapped into these new components — no backend changes.

### 4. Article page (`src/pages/Article.tsx`)
- Cream background, headline in Libre Baskerville 46-64px desktop, italic red author, serif standfirst, body serif 18-20px with 700-760px reading column.
- Right sidebar on desktop: "Most popular" list reusing homepage component.
- No rounded corners on images.

### 5. Footer (`src/components/Layout.tsx`)
- Beige background `#f5f1ea`, top border `#d8cfc4`.
- Five small columns: `GhanaCrimes`, `About us`, `Sections`, `Newsletters`, `Contact`. Small grey sans-serif links.

### 6. Reusable components
- `ArticleCard`: variants for `stacked-secondary`, `cover-lead`, `list-item`, `grid-standard`. Each uses serif headline, italic red author, sharp rectangular image, beige hairline. Brand casing preserved.
- `SectionHeading`: centred serif variant with optional red circular arrow, plus red-double-rule variant.
- New `MostPopularAndWriters`, `GhanaCrimesTV`, `MagazinePanel`, `ColumnsSection`, `PodcastsPanel`, `CartoonSection`.

### 7. Guardrails
- Preserve all routes, slugs, SEO/meta, CMS data, view tracking, admin, auth-tweet kill-switch (paused).
- Never write `GHANACRIMES`, `Ghana Crimes`, `Ghanacrimes`, or `ghana crimes`.
- No em/en dashes in any new copy or placeholders.
- No shadows except the faint magazine-cover shadow on the magazine cover image.
- No rounded corners on story blocks.

### Technical notes
- Fonts loaded via `<link>` in `index.html` for performance rather than `@import` in CSS.
- All colors go through HSL semantic tokens in `index.css` + `tailwind.config.ts`; no hardcoded hex in components.
- Reuse existing Supabase queries in components; only presentation changes.
- Fallback content for empty video / magazine / columns / podcasts / cartoon sections uses neutral GhanaCrimes-branded placeholders (no random stock faces).
