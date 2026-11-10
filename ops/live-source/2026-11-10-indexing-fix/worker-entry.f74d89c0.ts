// Edge wrapper around the OpenNext worker: canonical host + HTTPS, then a cheap edge layer before Next runs.
// @ts-ignore generated at build time by opennextjs-cloudflare
import handler from "./.open-next/worker.js";
import { pingIndexNow } from "./src/lib/indexnow";
import { isValidCategory } from "./src/lib/categories";
import { maybeBuildBulletin, bulletinRoute } from "./src/lib/bulletin";

// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

const CANONICAL_HOST = "www.ghanacrimes.com";
const REDIRECT_HOSTS = new Set(["ghanacrimes.com", "www.ghanacrimes.com"]);

// Permanent aliases handled at the edge (no Next render).
const EDGE_REDIRECTS: Record<string, string> = {
  "/ethics": "/editorial-policy",
  "/editorial-standards": "/editorial-policy",
  "/standards": "/editorial-policy",
  "/accountability": "/corrections",
  "/authors/ghanacrimes-data-desk": "/authors/ghanacrimes-newsroom",
  "/authors/ghanacrimes-desk": "/authors/ghanacrimes-newsroom",
  "/authors/ghanacrimes": "/authors/ghanacrimes-newsroom",
  "/about-us": "/about",
  "/author/ghanacrimes-newsroom": "/authors/ghanacrimes-newsroom",
  "/author": "/authors/ghanacrimes-newsroom",
  "/feed": "/rss.xml",
  "/rss": "/rss.xml",
  "/apple-touch-icon.png": "/pwa-192x192.png",
  "/apple-touch-icon-precomposed.png": "/pwa-192x192.png",
  // Same story re-slugged under a new category (found in 404 logs, 4 Nov 2026).
  "/police-reports/bank-of-ghana-warns-public-against-20-unlicensed-mobile-loan-apps": "/fraud-scams/bank-of-ghana-warns-20-mobile-loan-apps-are-operating-illegally",
};

// WordPress/PHP scanner probes: no such paths exist on this Next.js site. Mirrors the Cloudflare WAF custom rule
// (docs/waf-probe-rule.txt) so probes stay cheap even before/without the zone rule. Real UAs of link-preview bots are exempt.
const PROBE_PATH = /(^|\/)(wp-admin|wp-login|wp-content|wp-includes|wp-json|wp-config|wordpress)(\/|\.|$)|\.php\d?($|\/)|xmlrpc/i;
const PREVIEW_BOT_UA = /facebookexternalhit|meta-externalagent|googlebot|bingbot/i;

// Section names cut off mid-word (truncated shares, e.g. "/court-cas"): 301 to the one section they prefix.
const SECTION_SLUGS = ["top-stories", "violent-crime", "property-crime", "cybercrime", "fraud-scams", "drug-offences", "domestic-violence",
  "traffic-offences", "youth-crime", "organised-crime", "white-collar-crime", "police-reports", "court-cases", "prison-news",
  "crime-prevention", "investigations"];
function truncatedSection(seg: string): string | null {
  if (seg.length < 3) return null;
  const m = SECTION_SLUGS.filter((c) => c !== seg && c.startsWith(seg));
  return m.length === 1 ? m[0] : null;
}

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


export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      const res = await handleFetch(request, env, ctx);
      if (res.status >= 500 && res.status !== 503) {
        const u = new URL(request.url);
        ctx.waitUntil(reportError(env, `HTTP ${res.status} ${u.pathname.split("/").slice(0, 2).join("/") || "/"}`,
          `${request.method} ${u.pathname}${u.search}\nStatus: ${res.status}\nVersion: ${DEPLOY_ID}`));
      }
      return res;
    } catch (e: any) {
      const u = new URL(request.url);
      ctx.waitUntil(reportError(env, `Exception ${String(e?.name || "Error")}: ${String(e?.message || e).slice(0, 80)}`,
        `${request.method} ${u.pathname}${u.search}\nVersion: ${DEPLOY_ID}\n\n${String(e?.stack || e).slice(0, 4000)}`));
      throw e;
    }
  },
  // Every 15 min: ping IndexNow with articles published since the last run and pre-render their share cards.
  async scheduled(_event: unknown, env: any, ctx: any): Promise<void> {
    ctx.waitUntil(pingRecentlyPublished(env, ctx).catch((e) => reportError(env, `Cron ${String(e?.message || e).slice(0, 80)}`, String(e?.stack || e))));
    ctx.waitUntil(maybeBuildBulletin(env).then((r) => console.log("bulletin", r)).catch((e) => reportError(env, `Bulletin ${String(e?.message || e).slice(0, 80)}`, String(e?.stack || e))));
  },
};

// ---- Error alerts: email officeofnajib@gmail.com via the ghanacrimes.notifications queue (max 1 per type per hour) ----
const errorSeen = new Map<string, number>(); // per-isolate pre-filter; the database enforces the hourly limit globally
async function reportError(env: any, type: string, detail: string): Promise<void> {
  try {
    if (!env.GC_ALERT_SECRET) return;
    const t = Date.now();
    if ((errorSeen.get(type) ?? 0) > t - 3600_000) return;
    if (errorSeen.size > 500) errorSeen.clear();
    errorSeen.set(type, t);
    console.error("reportError", type);
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/report_worker_error`, {
      method: "POST",
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Content-Profile": "ghanacrimes", "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: env.GC_ALERT_SECRET, p_type: type, p_detail: detail }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* alerting must never break a request */ }
}

async function handleFetch(request: Request, env: any, ctx: any): Promise<Response> {
  {
    DEPLOY_ID ||= env.CF_VERSION_METADATA?.id || "";
    const url = new URL(request.url);
    if (REDIRECT_HOSTS.has(url.hostname) && (url.protocol === "http:" || url.hostname !== CANONICAL_HOST)) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      url.port = "";
      // Resolve the final target in the same hop (no host -> slash -> story -> section chains).
      if (request.method === "GET" || request.method === "HEAD") {
        const v = await variantTarget(env, url, true).catch(() => null);
        if (v) return permanent(v.to, 600, `host+${v.rule}`);
      }
      return new Response(null, { status: 301, headers: { Location: url.toString(), "Cache-Control": "public, max-age=3600" } });
    }
    if (url.pathname === "/__internal/mail" && request.method === "POST") return internalMail(request, env);
    if (url.pathname === "/__internal/bulletin" && request.method === "POST") {
      if (!env.GC_MAIL_SECRET || request.headers.get("x-gc-mail") !== env.GC_MAIL_SECRET) return new Response("forbidden", { status: 403 });
      return new Response(await maybeBuildBulletin(env, true).catch((e) => `error ${e?.message || e}`));
    }
    if (url.pathname === "/__internal/push" && request.method === "POST") {
      if (!env.GC_MAIL_SECRET || request.headers.get("x-gc-mail") !== env.GC_MAIL_SECRET) return new Response("forbidden", { status: 403 });
      return new Response(await sendPushAlerts(env));
    }
    if (request.method === "GET" && (url.pathname === "/podcast.xml" || url.pathname.startsWith("/audio/"))) {
      const r = await bulletinRoute(url, env);
      if (r) return r;
    }
    // Old build chunks (/_next/static/<old-hash>) only reach the Worker when the assets binding has no such file.
    // Answer 410 + no-store so caches and crawlers stop asking, instead of a full Next 404 render.
    if (url.pathname.startsWith("/_next/static/")) {
      return new Response("Gone", { status: 410, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    }
    if (PROBE_PATH.test(url.pathname) && !PREVIEW_BOT_UA.test(request.headers.get("user-agent") || "")) {
      return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" } });
    }
    // Category ?page=N duplicates page 1: send it to the real paginated URL (/cat/page/N).
    if (request.method === "GET" && url.searchParams.has("page")) {
      const seg = url.pathname.split("/").filter(Boolean);
      const n = Number(url.searchParams.get("page"));
      if (seg.length === 1 && isValidCategory(seg[0]) && Number.isInteger(n) && n >= 1 && n <= 10000) {
        const target = n === 1 ? `/${seg[0]}` : `/${seg[0]}/page/${n}`;
        return new Response(null, { status: 301, headers: { Location: `https://${CANONICAL_HOST}${target}`, "Cache-Control": "public, max-age=86400" } });
      }
    }
    // Trailing slash, case, aliases, truncated sections, empty sections, filters, tag/legacy prefixes: one 301 to the final URL.
    if (request.method === "GET" || request.method === "HEAD") {
      const v = await variantTarget(env, url, false).catch(() => null);
      if (v) return permanent(v.to, /retired|latest|section-filter|tag-or-category/.test(v.rule) ? 600 : 86400, v.rule);
    }
    // Form pages read their query (?article=, ?type=) in the browser, so render and cache one copy.
    if (QUERY_FREE_PATHS.has(url.pathname) && url.search && request.method === "GET" && !request.headers.has("rsc")) {
      url.search = "";
      request = new Request(url.toString(), request);
    }
    if (request.method === "GET" && (url.pathname.startsWith("/api/og/") || url.pathname === "/api/og-image")) {
      return ogCached(request, url, env, ctx);
    }
    if (!isCacheable(request, url)) return (handler as any).fetch(request, env, ctx);
    // Unknown article URLs (mostly retired pre-migration slugs crawled by bots) get a cheap 404 without a Next render.
    const fast = await fastArticle404(request, url, env, ctx);
    if (fast) return fast;
    return after404(request, url, env, await edgeCached(request, url, env, ctx));
  }
}

// Edge HTML cache (free Cache API). Next SSR costs ~50-400ms CPU per page, which trips the Workers free-plan CPU
// limit (error 1102). Serve anonymous GETs (HTML and RSC payloads) from the colo cache; refresh in the background once stale.
const QUERY_FREE_PATHS = new Set(["/corrections", "/tips", "/contact"]);
const LIST_FRESH_SECONDS = 300;      // home, sections, hubs, feeds
const ARTICLE_FRESH_SECONDS = 1800;  // article pages change rarely after publish
const RSC_FRESH_SECONDS = 60;
const MAX_STALE_SECONDS = 7 * 86400;
const NOT_FOUND_SECONDS = 3600;
const NO_CACHE_PREFIXES = ["/admin", "/api", "/auth", "/_next/data", "/search", "/fraud-watch/search"];
// Click/tracking params never change the page; dropping them stops every shared link from forcing a fresh render.
const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|gbraid|wbraid|dclid|msclkid|igshid|mc_cid|mc_eid|_ga|_gl|ref|ref_src|s|si|cb|share|amp)$/i;

function cleanUrl(url: URL): URL {
  const u = new URL(url.toString());
  for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAM.test(k)) u.searchParams.delete(k);
  u.searchParams.delete("_rsc");
  u.searchParams.sort();
  return u;
}

function isCacheable(request: Request, url: URL): boolean {
  if (request.method !== "GET") return false;
  if (NO_CACHE_PREFIXES.some((p) => url.pathname.startsWith(p))) return false;
  const cookie = request.headers.get("cookie") || "";
  if (/sb-|auth|gc_session/i.test(cookie)) return false;
  return true;
}

function isArticlePath(pathname: string): string[] | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !isValidCategory(parts[0])) return null;
  return parts;
}

async function shortHash(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Worker version id: cached HTML/RSC is keyed per deploy, so a new deploy never serves pages pointing at old JS chunks. */
let DEPLOY_ID = "";

async function cacheKeyFor(request: Request, url: URL): Promise<{ key: Request; fresh: number }> {
  const u = cleanUrl(url);
  if (DEPLOY_ID) u.searchParams.set("__v", DEPLOY_ID.slice(0, 8));
  if (request.headers.has("rsc")) {
    // RSC payloads depend on the client's router state; key on it so router.refresh() on /latest and nav hits are shared.
    const v = [request.headers.get("next-router-state-tree") || "", request.headers.get("next-router-prefetch") || "",
      request.headers.get("next-router-segment-prefetch") || "", request.headers.get("next-url") || ""].join("|");
    u.searchParams.set("__rsc", await shortHash(v));
    return { key: new Request(u.toString(), { method: "GET" }), fresh: RSC_FRESH_SECONDS };
  }
  return { key: new Request(u.toString(), { method: "GET" }), fresh: isArticlePath(u.pathname) ? ARTICLE_FRESH_SECONDS : LIST_FRESH_SECONDS };
}

async function fetchAndStore(request: Request, key: Request, env: unknown, ctx: any): Promise<Response> {
  const res: Response = await (handler as any).fetch(request, env, ctx);
  if (res.status === 200 && !res.headers.has("set-cookie")) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set("x-edge-cached-at", String(Date.now()));
    copy.headers.set("Cache-Control", `public, max-age=${MAX_STALE_SECONDS}`);
    copy.headers.delete("Vary");
    ctx.waitUntil((caches as any).default.put(key, copy));
  } else if (res.status === 404 || res.status === 410 || (res.status >= 301 && res.status <= 308)) {
    // Page is gone or now redirects (e.g. emptied section, unpublished story, duplicate merged into a kept URL):
    // evict the stale cached copy instead of serving it.
    ctx.waitUntil((caches as any).default.delete(key));
  }
  return res;
}

// Sitemaps and feeds are read rarely, so stale-while-revalidate let a colo hand Googlebot a copy days old (seen 10 Nov 2026:
// 4.2 days, missing every story since). Past 15 min, render first; fall back to the stale copy if the render fails.
const FEED_PATH = /^\/(sitemap\.xml|news-sitemap\.xml|sitemaps\/[a-z0-9-]+\.xml|rss\.xml|feed\.xml|podcast\.xml|[a-z0-9\/-]+\/rss\.xml)$/;
const FEED_MAX_STALE_SERVE_SECONDS = 900;

async function edgeCached(request: Request, url: URL, env: unknown, ctx: any): Promise<Response> {
  const { key, fresh } = await cacheKeyFor(request, url);
  const cache = (caches as any).default as Cache;
  const hit = await cache.match(key);
  if (hit && FEED_PATH.test(url.pathname) && !request.headers.has("rsc")) {
    const age = (Date.now() - Number(hit.headers.get("x-edge-cached-at") || 0)) / 1000;
    if (age > FEED_MAX_STALE_SERVE_SECONDS) {
      try {
        const res = await fetchAndStore(request.clone(), key, env, ctx);
        if (res.status === 200) { const out = new Response(res.body, res); out.headers.set("Cache-Control", "public, max-age=0, must-revalidate"); out.headers.set("x-edge-cache", "REFRESHED"); return out; }
      } catch { /* fall through to the stale copy */ }
    }
  }
  if (hit) {
    const at = Number(hit.headers.get("x-edge-cached-at") || 0);
    const age = (Date.now() - at) / 1000;
    const out = new Response(hit.body, hit);
    out.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    out.headers.set("x-edge-cache", age > fresh ? "STALE" : "HIT");
    if (age > fresh && !(await refreshLocked(key))) ctx.waitUntil(fetchAndStore(request.clone(), key, env, ctx).catch(() => {}));
    return out;
  }
  return fetchAndStore(request, key, env, ctx);
}

/** One background refresh per key per colo per minute, so a burst of stale hits does not trigger a burst of renders. */
async function refreshLocked(key: Request): Promise<boolean> {
  const lockKey = new Request(`${key.url}${key.url.includes("?") ? "&" : "?"}__lock=1`);
  const cache = (caches as any).default as Cache;
  if (await cache.match(lockKey)) return true;
  await cache.put(lockKey, new Response("1", { headers: { "Cache-Control": "public, max-age=60" } }));
  return false;
}

// ---- Cheap 404 for unknown article URLs ----
const missingSlug = new Map<string, number>(); // slug -> time it was confirmed missing (per isolate)

async function slugExists(env: any, slug: string): Promise<boolean | null> {
  const stripped = slug.replace(/-(\d{10,}|[0-9a-z]{8,9})$/, "");
  const cacheKey = `${slug}|${stripped}`;
  const seen = missingSlug.get(cacheKey);
  if (seen && Date.now() - seen < 10 * 60 * 1000) return false; // re-check after 10 min in case it gets published
  const list = [...new Set([slug, stripped])].map((s) => `"${s.replace(/"/g, "")}"`).join(",");
  const q = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?select=id&article_slug=in.(${encodeURIComponent(list)})&limit=1`;
  try {
    const r = await fetch(q, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Accept-Profile": "ghanacrimes" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const rows = (await r.json()) as unknown[];
    const exists = rows.length > 0;
    if (!exists) { if (missingSlug.size > 5000) missingSlug.clear(); missingSlug.set(cacheKey, Date.now()); }
    return exists;
  } catch { return null; }
}

const routeMemo = new Map<string, { t: number; target: string | null }>(); // "cat/slug" -> redirect target (per isolate)

/** Redirect target for an unpublished article URL (article_route_state RPC), null if none, undefined on lookup error. */
async function routeRedirect(env: any, category: string, slug: string): Promise<string | null | undefined> {
  const k = `${category}/${slug}`;
  const m = routeMemo.get(k);
  if (m && Date.now() - m.t < 10 * 60 * 1000) return m.target;
  try {
    const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/article_route_state`, {
      method: "POST",
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Content-Profile": "ghanacrimes", "Content-Type": "application/json" },
      body: JSON.stringify({ _category: category, _slug: slug }),
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return undefined;
    const rows = (await r.json()) as { state: string; target: string | null }[];
    const row = Array.isArray(rows) ? rows[0] : null;
    const target = row?.state === "redirect" && row.target && /^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(row.target) ? row.target : null;
    if (routeMemo.size > 5000) routeMemo.clear();
    routeMemo.set(k, { t: Date.now(), target });
    return target;
  } catch { return undefined; }
}

const prefixMemo = new Map<string, { t: number; target: string | null }>();
/** Published article whose slug starts with this (>= 20 chars) truncated slug; null if none or ambiguous. */
async function truncatedSlugTarget(env: any, slug: string): Promise<string | null> {
  if (slug.length < 20 || !/^[a-z0-9-]+$/.test(slug)) return null;
  const m = prefixMemo.get(slug);
  if (m && Date.now() - m.t < 10 * 60 * 1000) return m.target;
  try {
    const q = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?select=category_slug,article_slug&is_published=eq.true&article_slug=like.${encodeURIComponent(slug)}*&limit=2`;
    const r = await fetch(q, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Accept-Profile": "ghanacrimes" }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const rows = (await r.json()) as { category_slug: string; article_slug: string }[];
    const target = rows.length === 1 ? `/${rows[0].category_slug}/${rows[0].article_slug}` : null;
    if (prefixMemo.size > 5000) prefixMemo.clear();
    prefixMemo.set(slug, { t: Date.now(), target });
    return target;
  } catch { return null; }
}

async function fastArticle404(request: Request, url: URL, env: any, ctx: any): Promise<Response | null> {
  const parts = isArticlePath(url.pathname);
  if (!parts || request.headers.has("rsc")) return null;
  // Published or recently cached pages go through the normal path.
  const { key } = await cacheKeyFor(request, url);
  if (await ((caches as any).default as Cache).match(key)) return null;
  // Retired, unpublished or unknown story: same story if one exists, else its own section index (never a different story).
  const t = await articleTarget(env, parts[0], parts[1]);
  if (!t) return null;
  return permanent(t.to, t.rule === "retired-to-section" ? 600 : 3600, t.rule);
}

async function notFoundBody(env: any, ctx: any): Promise<string> {
  const key = new Request(`https://${CANONICAL_HOST}/__gc-not-found-page`);
  const cache = (caches as any).default as Cache;
  const hit = await cache.match(key);
  if (hit) return hit.text();
  const res: Response = await (handler as any).fetch(new Request(`https://${CANONICAL_HOST}/__gc-not-found-page`), env, ctx);
  const html = await res.text();
  ctx.waitUntil(cache.put(key, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": `public, max-age=${NOT_FOUND_SECONDS}` } })));
  return html;
}

// ---- Share images: Cache API (per colo) -> KV (global, free tier) -> render once ----
const OG_TTL = 30 * 86400;
let kvWritesThisIsolate = 0;

function ogKvKey(url: URL): string | null {
  if (!url.pathname.startsWith("/api/og/")) return null;
  const id = decodeURIComponent(url.pathname.slice(8));
  if (!/^([0-9a-f-]{36}|(topic|region|live)-[a-z0-9-]{1,80})$/i.test(id)) return null;
  const ar = url.searchParams.get("ar") || "16x9";
  return `og:v1:${id}:${/^(16x9|4x3|1x1)$/.test(ar) ? ar : "16x9"}`;
}

async function ogCached(request: Request, url: URL, env: any, ctx: any): Promise<Response> {
  const cache = (caches as any).default as Cache;
  const key = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) { const o = new Response(hit.body, hit); o.headers.set("x-edge-cache", "HIT"); return o; }
  const kvKey = ogKvKey(url);
  const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable" };
  if (kvKey && env.GC_OG) {
    const buf = await env.GC_OG.get(kvKey, "arrayBuffer");
    if (buf) {
      ctx.waitUntil(cache.put(key, new Response(buf, { headers })));
      return new Response(buf, { headers: { ...headers, "x-edge-cache": "KV" } });
    }
  }
  const res: Response = await (handler as any).fetch(request, env, ctx);
  if (res.status !== 200) return res;
  const buf = await res.arrayBuffer();
  const type = res.headers.get("content-type") || "image/png";
  const h = { ...headers, "Content-Type": type };
  ctx.waitUntil(cache.put(key, new Response(buf, { headers: h })));
  if (kvKey && env.GC_OG && kvWritesThisIsolate < 100 && type.startsWith("image/")) {
    kvWritesThisIsolate++;
    ctx.waitUntil(env.GC_OG.put(kvKey, buf, { expirationTtl: OG_TTL }).catch(() => {}));
  }
  return new Response(buf, { headers: { ...h, "x-edge-cache": "MISS" } });
}

async function pingRecentlyPublished(env: any, ctx: any): Promise<void> {
  const since = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const base = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const q = `${base}/rest/v1/articles?select=id,category_slug,article_slug,published_at&is_published=eq.true&or=(published_at.gte.${since},content_updated_at.gte.${since})&limit=500`;
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "ghanacrimes" } });
  if (!res.ok) { console.error("IndexNow: article query failed", res.status); return; }
  const rows = (await res.json()) as { id: string; category_slug: string; article_slug: string; published_at: string }[];
  if (!rows.length) return;
  if (rows.some((x) => x.published_at >= since)) ctx.waitUntil(sendPushAlerts(env).catch((e) => console.error("push failed", e)));
  const urls = rows.map((r) => `https://${CANONICAL_HOST}/${r.category_slug}/${r.article_slug}`);
  urls.push(`https://${CANONICAL_HOST}/`, `https://${CANONICAL_HOST}/latest`);
  console.log("IndexNow ping", urls.length, await pingIndexNow(urls));
  // Pre-render the default share card for up to 2 new stories into KV, so social crawlers never wait on a render.
  if (!env.GC_OG) return;
  for (const r of rows.filter((x) => x.published_at >= since).slice(0, 2)) {
    const u = new URL(`https://${CANONICAL_HOST}/api/og/${r.id}`);
    const k = ogKvKey(u);
    if (!k || (await env.GC_OG.get(k, "stream").then((s: any) => { s?.cancel?.(); return !!s; }))) continue;
    try {
      const img: Response = await (handler as any).fetch(new Request(u.toString()), env, ctx);
      if (img.ok) await env.GC_OG.put(k, await img.arrayBuffer(), { expirationTtl: OG_TTL });
    } catch (e) { console.error("og prerender failed", r.id, e); }
  }
}

// ---- Web push (payload-free VAPID): the service worker fetches /api/push/latest on each push. ----
// Max 4 sends per London day, only when a new story was published in the last cron window.
const VAPID_PUBLIC_KEY = "BNjdhkXSDckcdF7VuQVIDQ9XifEcqsHjjBNnsQJmKwAemtKv4af-cADXt96lQ3phKyvlwfK-lwOAxWj_S-I3C0w";
const PUSH_DAILY_CAP = 4;
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function vapidJwt(env: any, aud: string): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:editor@ghanacrimes.com" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}
async function sendPushAlerts(env: any): Promise<string> {
  if (!env.VAPID_PRIVATE_JWK || !env.GC_ALERT_SECRET || !env.GC_OG) return "no config";
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const capKey = `push-count:${day}`;
  const sent = Number((await env.GC_OG.get(capKey)) || 0);
  if (sent >= PUSH_DAILY_CAP) return "daily cap";
  const base = env.NEXT_PUBLIC_SUPABASE_URL, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rpc = (fn: string, body: unknown) => fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Profile": "ghanacrimes", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const res = await rpc("push_targets", { p_secret: env.GC_ALERT_SECRET });
  if (!res.ok) { console.error("push_targets", res.status); return `targets ${res.status}`; }
  const targets = (await res.json()) as { endpoint: string }[];
  if (!targets.length) return "no targets";
  const out: number[] = [];
  await env.GC_OG.put(capKey, String(sent + 1), { expirationTtl: 2 * 86400 });
  const jwts = new Map<string, string>();
  for (const { endpoint } of targets.slice(0, 500)) {
    try {
      const aud = new URL(endpoint).origin;
      if (!jwts.has(aud)) jwts.set(aud, await vapidJwt(env, aud));
      const r = await fetch(endpoint, { method: "POST", headers: { TTL: "21600", Urgency: "high", Authorization: `vapid t=${jwts.get(aud)}, k=${VAPID_PUBLIC_KEY}` } });
      out.push(r.status);
      if (r.status === 404 || r.status === 410 || r.status >= 400) await rpc("push_result", { p_secret: env.GC_ALERT_SECRET, p_endpoint: endpoint, p_status: r.status });
    } catch (e) { console.error("push send", e); }
  }
  return `sent ${out.join(",")}`;
}

// ---- Outbound email from @ghanacrimes.com via the Cloudflare send_email binding (free for verified destination addresses).
// Called by ghanacrimes.send_pending_notifications() with a shared secret held in Supabase Vault and a Worker secret.
async function internalMail(request: Request, env: any): Promise<Response> {
  if (!env.GC_MAIL_SECRET || request.headers.get("x-gc-mail") !== env.GC_MAIL_SECRET) return new Response("forbidden", { status: 403 });
  if (!env.EMAIL) return new Response("no email binding", { status: 500 });
  try {
    const m: any = await request.json();
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.headers || {})) if (/^List-Unsubscribe(-Post)?$/i.test(k)) headers[k] = String(v);
    const fm = /^\s*(.*?)\s*<([^>]+@ghanacrimes\.com)>\s*$/i.exec(String(m.from || ""));
    const from = fm ? { name: fm[1] || "GhanaCrimes", email: fm[2] } : { email: "alerts@ghanacrimes.com", name: "GhanaCrimes Alerts" };
    const r = await env.EMAIL.send({ to: m.to, from,
      subject: String(m.subject || "").slice(0, 180), text: String(m.text || ""), ...(m.html ? { html: m.html } : {}),
      replyTo: "officeofnajib@gmail.com", ...(Object.keys(headers).length ? { headers } : {}) });
    return Response.json({ id: r?.messageId || null });
  } catch (e: any) {
    return Response.json({ error: String(e?.code || ""), message: String(e?.message || e) }, { status: 502 });
  }
}
