// Daily audio bulletin: Workers AI MeloTTS (free allowance) reads the last 24h headlines; WAV stored in KV (free tier).
type Env = any;
const KV_TTL = 30 * 86400;
const SITE = "https://www.ghanacrimes.com";

export function londonDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
}
function londonHour(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23" }).format(d));
}

async function headlines(env: Env): Promise<{ title: string }[]> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const k = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?select=title&is_published=eq.true&published_at=gte.${since}&order=published_at.desc&limit=8`,
    { headers: { apikey: k, Authorization: `Bearer ${k}`, "Accept-Profile": "ghanacrimes" } });
  if (!r.ok) throw new Error(`bulletin headlines ${r.status}`);
  return r.json();
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
// Find the "data" chunk of a PCM WAV.
function wavParts(w: Uint8Array): { fmt: Uint8Array; data: Uint8Array } {
  const dv = new DataView(w.buffer, w.byteOffset, w.byteLength);
  let p = 12, fmt: Uint8Array | null = null;
  while (p + 8 <= w.length) {
    const id = String.fromCharCode(w[p], w[p + 1], w[p + 2], w[p + 3]); const len = dv.getUint32(p + 4, true);
    if (id === "fmt ") fmt = w.subarray(p + 8, p + 8 + len);
    if (id === "data") return { fmt: fmt!, data: w.subarray(p + 8, Math.min(w.length, p + 8 + len)) };
    p += 8 + len + (len & 1);
  }
  throw new Error("bad wav");
}
function joinWav(parts: Uint8Array[]): Uint8Array {
  const ps = parts.map(wavParts); const fmt = ps[0].fmt;
  const total = ps.reduce((n, x) => n + x.data.length, 0);
  const out = new Uint8Array(12 + 8 + fmt.length + 8 + total); const dv = new DataView(out.buffer);
  out.set([82, 73, 70, 70]); dv.setUint32(4, out.length - 8, true); out.set([87, 65, 86, 69], 8);
  out.set([102, 109, 116, 32], 12); dv.setUint32(16, fmt.length, true); out.set(fmt, 20);
  let p = 20 + fmt.length; out.set([100, 97, 116, 97], p); dv.setUint32(p + 4, total, true); p += 8;
  for (const x of ps) { out.set(x.data, p); p += x.data.length; }
  return out;
}

/** Run from the cron: once per London day, at 07:00-08:59, after the morning brief. */
export async function maybeBuildBulletin(env: Env, force = false): Promise<string> {
  if (!env.AI || !env.GC_OG) return "no binding";
  const day = londonDay();
  if (!force && (londonHour() < 7 || londonHour() > 8)) return "not time";
  if (!force && (await env.GC_OG.get(`bulletin-meta:${day}`))) return "done";
  const rows = await headlines(env);
  if (!rows.length) return "no stories";
  const dateText = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const lines = [`Good morning. This is the GhanaCrimes audio bulletin for ${dateText}.`,
    ...rows.map((r, i) => `Story ${i + 1}. ${r.title.replace(/[^\p{L}\p{N}\s.,'’:;!?%-]/gu, " ").slice(0, 280)}.`),
    "People named in these reports are suspects unless a court has convicted them. Read the full stories at ghana crimes dot com."];
  const parts: Uint8Array[] = [];
  for (const text of lines) {
    const r: any = await env.AI.run("@cf/myshell-ai/melotts", { prompt: text, lang: "en" });
    if (!r?.audio) throw new Error("melotts returned no audio");
    parts.push(b64ToBytes(r.audio));
  }
  const wav = joinWav(parts);
  const meta = { day, title: `GhanaCrimes audio bulletin, ${dateText}`, headlines: rows.map((r) => r.title), bytes: wav.length, created: new Date().toISOString() };
  await env.GC_OG.put(`bulletin:${day}`, wav, { expirationTtl: KV_TTL });
  await env.GC_OG.put(`bulletin-meta:${day}`, JSON.stringify(meta), { expirationTtl: KV_TTL });
  await env.GC_OG.put("bulletin-latest", day);
  return `built ${day} ${wav.length}`;
}

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

/** /podcast.xml, /audio/latest.json and /audio/<day>.wav. Returns null when the path is not ours. */
export async function bulletinRoute(url: URL, env: Env): Promise<Response | null> {
  if (!env.GC_OG) return null;
  const p = url.pathname;
  if (p === "/audio/latest.json") {
    const day = await env.GC_OG.get("bulletin-latest");
    const meta = day && (await env.GC_OG.get(`bulletin-meta:${day}`, "json"));
    return Response.json(meta ? { ...meta, url: `/audio/${day}.wav` } : null, { headers: { "Cache-Control": "public, max-age=600" } });
  }
  const m = p.match(/^\/audio\/(\d{4}-\d{2}-\d{2})\.wav$/);
  if (m) {
    const body = await env.GC_OG.get(`bulletin:${m[1]}`, "arrayBuffer");
    if (!body) return new Response("Not found", { status: 404 });
    return new Response(body, { headers: { "Content-Type": "audio/wav", "Cache-Control": "public, max-age=86400", "Accept-Ranges": "none" } });
  }
  if (p === "/podcast.xml") {
    const list = await env.GC_OG.list({ prefix: "bulletin-meta:" });
    const metas = (await Promise.all(list.keys.map((k: any) => env.GC_OG.get(k.name, "json")))).filter(Boolean)
      .sort((a: any, b: any) => (a.day < b.day ? 1 : -1)).slice(0, 30);
    const items = metas.map((m: any) => `<item><title>${esc(m.title)}</title><guid isPermaLink="false">ghanacrimes-bulletin-${m.day}</guid><pubDate>${new Date(m.created).toUTCString()}</pubDate><description>${esc(m.headlines.join(" | "))}</description><enclosure url="${SITE}/audio/${m.day}.wav" length="${m.bytes}" type="audio/wav"/><itunes:explicit>false</itunes:explicit></item>`).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel><title>GhanaCrimes Daily Audio Bulletin</title><link>${SITE}/</link><language>en-gh</language><description>The day's Ghana crime headlines from GhanaCrimes, read by a synthetic voice every morning.</description><itunes:author>GhanaCrimes</itunes:author><itunes:explicit>false</itunes:explicit><itunes:category text="News"/><itunes:image href="${SITE}/og-image.png"/>${items}</channel></rss>`;
    return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
  }
  return null;
}
