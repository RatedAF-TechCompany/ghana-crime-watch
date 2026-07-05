// Shared hero-image extractor for RSS and article-URL sources.
// Waterfall: media:content -> media:thumbnail -> enclosure -> <img> in
// content:encoded/description -> og:image -> twitter:image -> link[rel=image_src]
// -> first large in-body <img>. Validates each candidate before returning.
// Re-hosts the winning image to Supabase Storage bucket "article-images"
// at newsroom/{articleId}.{ext}. Falls back to the source URL on upload failure.

const UA = "Mozilla/5.0 (compatible; GhanaCrimesBot/1.0; +https://ghanacrimes.com)";
const FETCH_TIMEOUT = 8000;

const JUNK_PATTERNS = [
  /1x1|spacer|pixel|tracking|beacon/i,
  /gravatar/i,
  /favicon/i,
  /feedburner/i,
  /emoji/i,
  /sprite/i,
  /avatar/i,
  /\/logo[-_./]/i,
  /\.svg(\?|$)/i,
];

function isJunkUrl(url: string): boolean {
  return JUNK_PATTERNS.some((r) => r.test(url));
}

function resolveUrl(raw: string, base?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/&amp;/g, "&");
  if (cleaned.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (cleaned.startsWith("//")) return "https:" + cleaned;
  if (base) {
    try {
      return new URL(cleaned, base).toString();
    } catch {
      return null;
    }
  }
  return null;
}

function dimsFromUrl(url: string): { w?: number; h?: number } {
  const out: { w?: number; h?: number } = {};
  const wm = url.match(/[?&](?:w|width)=(\d+)/i);
  const hm = url.match(/[?&](?:h|height)=(\d+)/i);
  if (wm) out.w = parseInt(wm[1], 10);
  if (hm) out.h = parseInt(hm[1], 10);
  // WordPress -1024x768.jpg style
  const dashDims = url.match(/-(\d{2,4})x(\d{2,4})\.(?:jpe?g|png|webp|gif)/i);
  if (dashDims) {
    out.w = out.w ?? parseInt(dashDims[1], 10);
    out.h = out.h ?? parseInt(dashDims[2], 10);
  }
  return out;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = FETCH_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function validateImageUrl(url: string): Promise<{ ok: boolean; contentType?: string; bytes?: Uint8Array }> {
  try {
    // HEAD first
    const head = await fetchWithTimeout(url, { method: "HEAD", headers: { "User-Agent": UA } }, 6000);
    if (head.ok) {
      const ct = head.headers.get("content-type") || "";
      if (ct.startsWith("image/") && !ct.includes("svg")) {
        return { ok: true, contentType: ct };
      }
    }
  } catch {
    // fall through to GET
  }
  try {
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
    if (!res.ok) return { ok: false };
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/") || ct.includes("svg")) return { ok: false };
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 2000) return { ok: false }; // < ~2KB is almost certainly a pixel/icon
    return { ok: true, contentType: ct, bytes: buf };
  } catch {
    return { ok: false };
  }
}

interface Candidate {
  url: string;
  width?: number;
}

function pushCandidate(list: Candidate[], seen: Set<string>, url: string | null, width?: number) {
  if (!url) return;
  if (seen.has(url)) return;
  if (isJunkUrl(url)) return;
  seen.add(url);
  list.push({ url, width });
}

// Extract candidates from an RSS item XML block
function candidatesFromRssBlock(block: string, base?: string | null): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();

  // media:content entries (may be several — pick widest)
  const mediaContentMatches = [...block.matchAll(/<media:content\b[^>]*>/gi)];
  for (const m of mediaContentMatches) {
    const tag = m[0];
    const urlM = tag.match(/\burl=["']([^"']+)["']/i);
    if (!urlM) continue;
    const medium = tag.match(/\bmedium=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (medium && medium !== "image") continue;
    if (type && !type.startsWith("image/")) continue;
    const width = parseInt(tag.match(/\bwidth=["'](\d+)["']/i)?.[1] || "0", 10) || undefined;
    pushCandidate(out, seen, resolveUrl(urlM[1], base), width);
  }

  // media:thumbnail
  for (const m of block.matchAll(/<media:thumbnail\b[^>]*\burl=["']([^"']+)["'][^>]*>/gi)) {
    pushCandidate(out, seen, resolveUrl(m[1], base));
  }

  // enclosure image
  for (const m of block.matchAll(/<enclosure\b[^>]*>/gi)) {
    const tag = m[0];
    const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!type || !type.startsWith("image/")) continue;
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    pushCandidate(out, seen, resolveUrl(url || "", base));
  }

  // content:encoded / description <img>
  const encoded = block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] || "";
  const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "";
  for (const html of [encoded, desc]) {
    for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
      const tag = m[0];
      const width = parseInt(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || "0", 10) || undefined;
      pushCandidate(out, seen, resolveUrl(m[1], base), width);
    }
  }

  // sort widest first, unknown-width last
  out.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return out;
}

async function candidatesFromArticleUrl(url: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  try {
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return out;
    const html = await res.text();

    const meta = (name: string, attr: "property" | "name" | "rel") => {
      const re1 = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${name}["']`, "i");
      return html.match(re1)?.[1] || html.match(re2)?.[1] || null;
    };

    pushCandidate(out, seen, resolveUrl(meta("og:image", "property") || "", url));
    pushCandidate(out, seen, resolveUrl(meta("og:image:secure_url", "property") || "", url));
    pushCandidate(out, seen, resolveUrl(meta("twitter:image", "name") || "", url));
    pushCandidate(out, seen, resolveUrl(meta("twitter:image:src", "name") || "", url));

    const linkImg = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)?.[1];
    pushCandidate(out, seen, resolveUrl(linkImg || "", url));

    // In-body <img> with width hint
    for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
      const tag = m[0];
      const width =
        parseInt(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || "0", 10) ||
        undefined;
      pushCandidate(out, seen, resolveUrl(m[1], url), width);
    }

    out.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  } catch (_e) {
    // ignore
  }
  return out;
}

async function rehost(
  supabase: any,
  bucket: string,
  articleId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string | null> {
  try {
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";
    const path = `newsroom/${articleId}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export interface ExtractInput {
  rssBlock?: string | null;
  articleUrl?: string | null;
  extraUrls?: string[];      // e.g. tweet media urls
  base?: string | null;      // base URL for relative resolution (defaults to articleUrl)
}

/**
 * Extract, validate, and (best-effort) re-host a hero image.
 * Returns a public URL (rehosted or original) or null.
 * Wrap calls in a try/catch outside — this must never throw for the caller.
 */
export async function extractHeroImage(
  input: ExtractInput,
  articleId: string,
  supabase: any,
  bucket = "article-images",
): Promise<{ url: string | null; source: "rss" | "extra" | "og" | "none" }> {
  const base = input.base || input.articleUrl || null;

  const rssCandidates = input.rssBlock ? candidatesFromRssBlock(input.rssBlock, base) : [];
  const extraCandidates: Candidate[] = (input.extraUrls || [])
    .map((u) => ({ url: resolveUrl(u, base) || "" }))
    .filter((c) => !!c.url && !isJunkUrl(c.url));

  const tryList = async (cands: Candidate[], sourceTag: "rss" | "extra") => {
    for (const c of cands) {
      const dims = dimsFromUrl(c.url);
      if ((dims.w && dims.w < 400) || (dims.h && dims.h < 400)) continue;
      const v = await validateImageUrl(c.url);
      if (!v.ok) continue;
      const bytes = v.bytes;
      if (bytes) {
        const rehosted = await rehost(supabase, bucket, articleId, bytes, v.contentType || "image/jpeg");
        return { url: rehosted || c.url, source: sourceTag };
      }
      return { url: c.url, source: sourceTag };
    }
    return null;
  };

  let hit = await tryList(rssCandidates, "rss");
  if (hit) return hit as any;

  hit = await tryList(extraCandidates, "extra");
  if (hit) return hit as any;

  if (input.articleUrl) {
    const ogCands = await candidatesFromArticleUrl(input.articleUrl);
    hit = await tryList(ogCands, "extra");
    if (hit) return { url: hit.url, source: "og" };
  }

  return { url: null, source: "none" };
}

/**
 * Extract URLs (http/https) from arbitrary text (e.g. a tweet body).
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = m[0].replace(/[.,)\]}>]+$/, "");
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}
