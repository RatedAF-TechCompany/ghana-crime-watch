// ---- Indexing fix, 10 Nov 2026: retired and variant URLs get ONE permanent redirect (owner's redirect rules) ----
// Same story -> that story. Retired, unpublished or unknown story -> its own section index, never a different story.
// Empty or hidden sections -> /latest. Legacy prefixes and tag/category/filter URLs -> the section index.
// Anything else that Next answers 404 keeps its 404 and gains X-Robots-Tag: noindex.
const EMPTY_SECTIONS = new Set(["youth-crime", "domestic-violence", "prison-news"]);
const HIDDEN_SECTIONS = new Set(["crime-statistics", "most-wanted"]);
const SECTION_ALIASES: Record<string, string> = { "breaking-news": "/top-stories" };
// Mirrors next.config redirects so chained hops (e.g. /news/ -> /news -> /top-stories) collapse into one 301.
const CONFIG_ALIASES: Record<string, string> = {
  "/crime": "/violent-crime", "/court": "/court-cases", "/police": "/police-reports", "/fraud": "/fraud-scams",
  "/news": "/top-stories", "/drugs": "/drug-offences", "/breaking-news": "/top-stories", "/contact-us": "/contact",
  "/privacy-policy": "/privacy", "/about/ownership": "/masthead",
};
const TAG_PREFIXES = new Set(["tag", "tags", "category", "categories"]);
const STORY_PREFIXES = new Set(["news", "posts", "post", "story", "stories", "article", "articles"]);
const HUB_INDEX: Record<string, string> = {
  topics: "/topics", regions: "/regions", explainers: "/explainers", live: "/latest", "scam-alerts": "/scam-alerts",
  latest: "/latest", courts: "/courts", agencies: "/agencies",
};
const TS_SUFFIX = /(-\d{13})+$/;
const SLUG_RE = /^[a-z0-9-]{3,200}$/;

function sectionIndex(cat: string): string {
  if (EMPTY_SECTIONS.has(cat) || HIDDEN_SECTIONS.has(cat)) return "/latest";
  return SECTION_ALIASES[cat] || `/${cat}`;
}

function permanent(path: string, maxAge: number, rule: string): Response {
  return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${path}`, "Cache-Control": `public, max-age=${maxAge}`, "x-edge-cache": "REDIRECT", "x-gc-redirect": rule } });
}

type Pub = { category_slug: string; article_slug: string };
const pubMemo = new Map<string, { t: number; rows: Pub[] }>();
/** Published articles whose slug is one of these (exact match). null on lookup error. */
async function publishedBySlug(env: any, slugs: string[]): Promise<Pub[] | null> {
  const list = [...new Set(slugs.filter((s) => SLUG_RE.test(s)))];
  if (!list.length) return [];
  const k = list.join("|");
  const m = pubMemo.get(k);
  if (m && Date.now() - m.t < 10 * 60 * 1000) return m.rows;
  try {
    const q = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?select=category_slug,article_slug&is_published=eq.true&article_slug=in.(${encodeURIComponent(list.map((s) => `"${s}"`).join(","))})&limit=5`;
    const r = await fetch(q, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Accept-Profile": "ghanacrimes" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const rows = (await r.json()) as Pub[];
    if (!Array.isArray(rows)) return null;
    if (pubMemo.size > 5000) pubMemo.clear();
    pubMemo.set(k, { t: Date.now(), rows });
    return rows;
  } catch { return null; }
}

/** Same story for a bare slug (no section, or a legacy prefix): exact slug, or the slug minus 13-digit timestamps. */
async function sameStoryForSlug(env: any, raw: string): Promise<string | null | undefined> {
  const slug = raw.toLowerCase();
  const stripped = slug.replace(TS_SUFFIX, "");
  const rows = await publishedBySlug(env, [slug, stripped]);
  if (rows === null) return undefined;
  for (const s of [slug, stripped]) {
    const hit = rows.filter((r) => r.article_slug === s);
    if (hit.length === 1) return `/${hit[0].category_slug}/${s}`;
  }
  return null;
}

/** Where a section/slug URL should go. null = serve it as is (live story in this section, or a lookup failed). */
async function articleTarget(env: any, cat: string, rawSlug: string): Promise<{ to: string; rule: string } | null> {
  const slug = rawSlug.toLowerCase();
  const stripped = slug.replace(TS_SUFFIX, "");
  const rows = await publishedBySlug(env, [slug, stripped]);
  if (rows === null) return null;
  const exact = rows.filter((r) => r.article_slug === slug);
  if (exact.some((r) => r.category_slug === cat)) return slug === rawSlug ? null : { to: `/${cat}/${slug}`, rule: "same-story-case" };
  if (exact.length === 1) return { to: `/${exact[0].category_slug}/${slug}`, rule: "same-story-other-section" };
  if (stripped !== slug) {
    const s = rows.filter((r) => r.article_slug === stripped);
    if (s.length === 1) return { to: `/${s[0].category_slug}/${stripped}`, rule: "same-story-timestamp" };
  }
  if (SLUG_RE.test(slug)) {
    const merged = await routeRedirect(env, cat, slug); // unpublished duplicate merged into the kept story (redirect_to)
    if (merged === undefined) return null;
    if (merged) return { to: merged, rule: "merged-duplicate" };
    const full = await truncatedSlugTarget(env, slug); // share link cut off mid-slug: the one story it prefixes
    if (full) return { to: full, rule: "truncated-slug" };
  }
  return { to: sectionIndex(cat), rule: "retired-to-section" };
}

/** One-hop target for URL variants (host handled by the caller). Returns the final path+query, or null to serve as is.
 *  `force` resolves article URLs even when unchanged (used when a host redirect is happening anyway). */
async function variantTarget(env: any, url: URL, force: boolean): Promise<{ to: string; rule: string } | null> {
  const p0 = url.pathname;
  if (p0.startsWith("/api/") || p0.startsWith("/_next/") || p0.startsWith("/__internal/")) return null;
  let path = p0.length > 1 ? (p0.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/") : p0;
  let search = url.search;
  const rules: string[] = [];
  if (path !== p0) rules.push("trailing-slash");
  let first = (path.split("/")[1] || "").toLowerCase();
  if (/[A-Z]/.test(path) && (isValidCategory(first) || TAG_PREFIXES.has(first) || STORY_PREFIXES.has(first) || EMPTY_SECTIONS.has(first))) { path = path.toLowerCase(); rules.push("lower-case"); }
  const alias = EDGE_REDIRECTS[path] || CONFIG_ALIASES[path];
  let segs = path.split("/").filter(Boolean);
  const sec = !alias && segs.length === 1 ? truncatedSection(segs[0]) : null;
  if (alias) { path = alias; rules.push("alias"); } else if (sec) { path = `/${sec}`; rules.push("truncated-section"); }
  segs = path.split("/").filter(Boolean);
  first = segs[0] || "";
  if ((EMPTY_SECTIONS.has(first) || HIDDEN_SECTIONS.has(first) || first === "breaking-news") && (segs.length === 1 || segs[1] === "page")) {
    path = sectionIndex(first); search = ""; rules.push("empty-or-hidden-section");
  } else if (segs.length === 1 && isValidCategory(first) && search) {
    const keys = [...new URLSearchParams(search).keys()];
    if (keys.some((k) => !TRACKING_PARAM.test(k) && k !== "_rsc" && k !== "page")) { search = ""; rules.push("section-filter"); }
  } else if (segs.length >= 2 && TAG_PREFIXES.has(first)) {
    path = isValidCategory(segs[1]) ? sectionIndex(segs[1]) : "/latest"; search = ""; rules.push("tag-or-category");
  } else if (segs.length >= 2 && STORY_PREFIXES.has(first)) {
    const t = await sameStoryForSlug(env, segs[segs.length - 1]);
    if (t === undefined) return null;
    path = t || "/latest"; search = ""; rules.push(t ? "legacy-prefix-same-story" : "legacy-prefix-to-latest");
  } else if (segs.length >= 3 && isValidCategory(first) && segs[1] !== "page") {
    path = `/${first}/${segs[1]}`; search = ""; rules.push("article-extra-segment");
  }
  segs = path.split("/").filter(Boolean);
  const changed = path + search !== p0 + url.search;
  if ((changed || force) && segs.length === 2 && isValidCategory(segs[0])) {
    const t = await articleTarget(env, segs[0], segs[1]);
    if (t) { path = t.to; search = ""; rules.push(t.rule); }
  }
  return path + search !== p0 + url.search ? { to: path + search, rule: rules.join("+") || "canonical" } : null;
}

/** Next answered 404: send retired/unknown URLs inside a section or hub to that index; otherwise keep the 404 + noindex. */
async function after404(request: Request, url: URL, env: any, res: Response): Promise<Response> {
  if (res.status !== 404 || request.method !== "GET" || request.headers.has("rsc")) return res;
  const segs = url.pathname.split("/").filter(Boolean);
  let t: { to: string; rule: string } | null = null;
  if (segs.length >= 1 && isValidCategory(segs[0])) {
    if (segs.length === 2 && segs[1] !== "page") t = await articleTarget(env, segs[0], segs[1]);
    else if (segs.length >= 2) t = { to: sectionIndex(segs[0]), rule: "section-unknown-subpath" };
  } else if (segs[0] === "courts" && segs[1] === "cases" && segs.length > 2) {
    t = { to: "/courts/cases", rule: "hub-unknown-slug" };
  } else if (segs.length >= 2 && HUB_INDEX[segs[0]]) {
    t = { to: HUB_INDEX[segs[0]], rule: "hub-unknown-slug" };
  } else if (segs.length >= 1 && (TAG_PREFIXES.has(segs[0]) || STORY_PREFIXES.has(segs[0]))) {
    t = { to: "/latest", rule: "legacy-prefix-to-latest" };
  } else if (segs.length === 1 && segs[0].includes("-")) {
    const s = await sameStoryForSlug(env, segs[0]);
    if (s) t = { to: s, rule: "same-story-no-section" };
  }
  if (t && t.to !== url.pathname) return permanent(t.to, t.rule.startsWith("same-story") || t.rule === "merged-duplicate" ? 3600 : 600, t.rule);
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex");
  return out;
}
