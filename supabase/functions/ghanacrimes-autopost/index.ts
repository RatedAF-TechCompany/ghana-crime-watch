import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_ORIGIN = "https://www.ghanacrimes.com";

// ---------- OAuth 1.0a (X API) ----------
function percentEncode(s: string) {
  return encodeURIComponent(s)
    .replace(/!/g, "%21").replace(/\*/g, "%2A")
    .replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
}
async function hmacSha1(key: string, data: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
function nonce() {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let n = ""; for (let i = 0; i < 32; i++) n += c.charAt(Math.floor(Math.random() * c.length));
  return n;
}
async function oauthHeader(method: string, url: string, ck: string, cs: string, at: string, ats: string) {
  const p: Record<string, string> = {
    oauth_consumer_key: ck, oauth_nonce: nonce(), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_token: at, oauth_version: "1.0",
  };
  const base = Object.keys(p).sort().map(k => `${percentEncode(k)}=${percentEncode(p[k])}`).join("&");
  const sigBase = `${method}&${percentEncode(url)}&${percentEncode(base)}`;
  const signingKey = `${percentEncode(cs)}&${percentEncode(ats)}`;
  p.oauth_signature = await hmacSha1(signingKey, sigBase);
  return "OAuth " + Object.keys(p).sort().map(k => `${percentEncode(k)}="${percentEncode(p[k])}"`).join(", ");
}

// ---------- Qualification ----------
const GHANA_KEYWORDS = [
  "ghana", "ghanaian", "accra", "kumasi", "tema", "takoradi", "cape coast", "tamale",
  "ho ", "koforidua", "sunyani", "bolgatanga", "wa ", "sekondi", "obuasi",
  "ashanti", "greater accra", "volta region", "northern region", "eastern region",
  "central region", "western region", "upper east", "upper west", "bono",
  "ghs", "gh₵", "cedi", "cedis", "ghana police", "eoco", "cid",
];
const CRIME_KEYWORDS = [
  "arrest", "arrested", "police", "court", "jailed", "sentenc", "prison", "prosecut",
  "robbery", "robbed", "steal", "stole", "stolen", "theft", "burgl", "fraud", "scam",
  "cybercrime", "trafficking", "abuse", "assault", "murder", "kill", "shot", "raid",
  "seized", "seizure", "smuggl", "corruption", "bribe", "missing person", "abduct",
  "kidnap", "gunmen", "armed", "suspect", "charged", "convict", "acquit", "remand",
  "custody", "security", "fire outbreak", "hit and run", "collision", "fatal",
  "sexual", "defiled", "defraud", "cyber", "money laundering", "drug",
];

function looksAboutGhana(text: string): boolean {
  const t = text.toLowerCase();
  return GHANA_KEYWORDS.some(k => t.includes(k));
}
function isCrimeAngle(text: string, categorySlug: string): boolean {
  const catAllow = new Set([
    "top-stories", "crime", "courts", "police", "security", "fraud",
    "corruption", "cybercrime", "prisons", "public-safety", "fraud-watch",
  ]);
  if (catAllow.has(categorySlug)) return true;
  const t = text.toLowerCase();
  return CRIME_KEYWORDS.some(k => t.includes(k));
}
function hasConcreteFact(text: string): boolean {
  // Strip years (1900-2099) and vague timing, then look for meaningful numbers.
  const cleaned = text
    .replace(/\b(19|20)\d{2}\b/g, " ") // years
    .replace(/\b(a few|several|some|many|multiple|numerous)\b/gi, " ");
  // Patterns: 5 suspects, 12 years, GHS 431,825, 3 vehicles, 2kg, aged 24, sentenced to 15
  const patterns = [
    /\b\d{1,3}(,\d{3})+(\.\d+)?\b/,                  // 431,825
    /\bghs?\s*\d/i, /gh₵\s*\d/i, /\$\s*\d/,          // money
    /\b\d+\s*(years?|months?|weeks?|days?)\b/i,       // sentence / age duration
    /\b\d+\s*(suspects?|victims?|people|persons?|men|women|children|officers?|arrests?|accused|convicts?)\b/i,
    /\b\d+\s*(kg|kilograms?|grams?|tonnes?|rounds?|bullets?|guns?|weapons?|vehicles?|cars?|motorbikes?|phones?)\b/i,
    /\baged?\s*\d+/i,
    /\bsentenc(ed|e)\s+to\s+\d+/i,
    /\bjailed?\s+(for\s+)?\d+/i,
    /\bfined\s+\d/i,
  ];
  return patterns.some(r => r.test(cleaned));
}

function buildArticleUrl(cat: string, slug: string) {
  return `${SITE_ORIGIN}/${cat}/${slug}`;
}

// ---------- Post generation ----------
type StoryType = "breaking" | "arrest" | "court" | "investigation" | "followup" | "sensitive" | "generic";

const CITY_TAGS: Array<[RegExp, string]> = [
  [/\baccra\b/i, "#Accra"], [/\bkumasi\b/i, "#Kumasi"], [/\bcape coast\b/i, "#CapeCoast"],
  [/\btamale\b/i, "#Tamale"], [/\btakoradi\b/i, "#Takoradi"], [/\btema\b/i, "#Tema"],
  [/\bkoforidua\b/i, "#Koforidua"], [/\bsunyani\b/i, "#Sunyani"], [/\bho\b/i, "#Ho"],
  [/\bbolgatanga\b/i, "#Bolgatanga"], [/\bobuasi\b/i, "#Obuasi"], [/\bsekondi\b/i, "#Sekondi"],
];
function pickLocationTag(text: string): string {
  for (const [re, tag] of CITY_TAGS) if (re.test(text)) return tag;
  return "";
}

function classifyStory(text: string, publishedAt: string | null): StoryType {
  const t = text.toLowerCase();
  if (/\b(child|minor|underage|8-year|10-year|12-year|defiled|defilement|rape|raped|sexual assault|deceased|died|killed)\b/.test(t)
      && /\b(victim|girl|boy|child|minor|woman|man)\b/.test(t)) {
    // Sensitive if child victim OR sexual offence OR deceased victim families
    if (/\b(child|minor|defile|rape|sexual)\b/.test(t) || /\b(deceased|died|dead|killed|fatal)\b/.test(t)) {
      return "sensitive";
    }
  }
  if (/\bupdate\b|\bfollow[- ]?up\b|\blatest on\b/.test(t)) return "followup";
  if (/\b(investigation|expose|exposed|revealed|uncovered|our probe|documents show)\b/.test(t)) return "investigation";
  if (/\b(court|judge|verdict|sentenc|acquit|convict|habeas|prosecut|hearing|remand|bail|plea)\b/.test(t)) return "court";
  if (/\b(arrest|arrested|charged|detained|nabbed|apprehended|in custody)\b/.test(t)) return "arrest";
  if (publishedAt) {
    const ageHrs = (Date.now() - new Date(publishedAt).getTime()) / 36e5;
    if (ageHrs <= 2 && /\b(breaking|just in|moments ago|now|ongoing|developing)\b/.test(t)) return "breaking";
  }
  return "generic";
}

const CTAS = ["Full story:", "What we know:", "Details:", "The full report:"];
function pickCta(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CTAS[h % CTAS.length];
}

function formulaFor(type: StoryType): string {
  switch (type) {
    case "breaking":
      return `TYPE: BREAKING. Format: "🚨 BREAKING: [most dramatic verifiable fact, under 15 words]. [One line of essential context]." Withhold the outcome. End marker line will be "Developing story:".`;
    case "arrest":
      return `TYPE: ARREST/CHARGE. Format: "[Role or identity of suspect] arrested over [crime], [one detail that raises a question]." Withhold exactly how they were caught or the specific act.`;
    case "court":
      return `TYPE: COURT/LEGAL. Format: "[Unexpected legal development] in [case name] case. [Why it matters or what nobody expected]." Withhold the underlying reason. Optional single ⚖ only if a verdict was delivered.`;
    case "investigation":
      return `TYPE: INVESTIGATION. Format: "[Number or scale]. [Revelation]." Lead with the numeric scale. No emoji.`;
    case "followup":
      return `TYPE: FOLLOW-UP. Format: "UPDATE: [what changed]. [Brief reference to the earlier development]." No emoji.`;
    case "sensitive":
      return `TYPE: SENSITIVE. Straight, factual, dignified single sentence. No curiosity gap. No emoji. No hashtag. Do not name minors. Do not pair a child's age with graphic crime terms in the same sentence.`;
    default:
      return `TYPE: GENERIC. Lead first 8 words with the most shocking specific element (number, title, place, unusual detail). One or two short sentences. Withhold the outcome or the how.`;
  }
}

// ---------- Significance score (editor rules, 8 Oct 2026) ----------
function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, "").split(".").slice(-2).join("."); } catch { return ""; }
}
function scoreArticle(a: any): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const g = a.gate_report || {};
  const text = `${a.title} ${a.summary || ""} ${(a.body || "").replace(/<[^>]+>/g, " ")}`.toLowerCase();
  const head = `${a.title} ${a.summary || ""}`.toLowerCase();
  const off = String(a.offence_type || g.analysis?.offence_type || "").toLowerCase();
  const cs = String(a.case_status || "").toLowerCase();
  const cat = String(a.category_slug || "");
  const hosts = new Set([...(a.source_urls || []), a.source_url].filter(Boolean).map(hostOf).filter(Boolean));
  if (hosts.size >= 2 || Number(g.corroborating_sources || 0) >= 1 || Number(g.source_tier) === 1) {
    score += 3; reasons.push(Number(g.source_tier) === 1 ? "+3 official source" : `+3 corroborated (${hosts.size} outlets)`);
  }
  if (/murder|homicide|kidnap|abduct|armed_robbery|robbery|sexual|rape|defile|arson|trafficking/.test(off) || cat === "violent-crime" ||
      /\b(murder|killed|killing|shot dead|shooting|stabbed to death|kidnap|abduct|armed robbery|rape|defile|arson|human trafficking)/.test(head)) {
    score += 3; reasons.push("+3 violent crime");
  }
  if (/charged|plea|convicted|sentenced|acquitted|on_trial|ruling|remanded/.test(cs) || cat === "court-cases" ||
      /\b(sentenced|convicted|jailed|pleads? (not )?guilty|charged with|court rules|verdict|acquitted)\b/.test(head)) {
    score += 2; reasons.push("+2 court/charge");
  }
  const bigMoney = (() => {
    const re = /(gh[s₵¢]|ghc|ghs|cedis?|us\$|\$|usd)\s*([\d.,]+)\s*(million|m|billion|bn|k)?/gi;
    let m; while ((m = re.exec(text))) {
      let n = parseFloat(m[2].replace(/,/g, "")); if (isNaN(n)) continue;
      const u = (m[3] || "").toLowerCase();
      if (u === "million" || u === "m") n *= 1e6; else if (u === "billion" || u === "bn") n *= 1e9; else if (u === "k") n *= 1e3;
      const usd = /us\$|\$|usd/i.test(m[1]);
      if (usd ? n >= 1e5 : n >= 1e6) return true;
    }
    return false;
  })();
  const official = /\b(mp|minister|director[- ]general|ceo of|official|mce|dce|commissioner|judge|officer|public servant|ministry|authority|assembly|state-owned|government)\b/.test(head);
  if ((/fraud|corruption|money_laundering|bribery/.test(off) || /fraud|corruption|white-collar/.test(cat)) && (bigMoney || official)) {
    score += 2; reasons.push(bigMoney ? "+2 major fraud/corruption (amount)" : "+2 fraud/corruption involving official");
  }
  const arrestN = head.match(/\b(\d+|three|four|five|six|seven|eight|nine|ten|dozens?)\s+(suspects?|people|persons|men|women|youths|foreigners|galamseyers)\b[^.]{0,40}\b(arrest|nabbed|picked up|detained|held)/) ||
    head.match(/\barrest(s|ed)?\s+(\d+|three|four|five|six|seven|eight|nine|ten|dozens?)\b/);
  const n0 = arrestN ? (arrestN[1].match(/^\d+$/) ? Number(arrestN[1]) : 99) : 0;
  const n1 = arrestN && arrestN[2]?.match(/^\d+$/) ? Number(arrestN[2]) : 0;
  if (/\b(raid|swoop|crackdown|operation|seiz|intercept|retriev)/.test(head) && /\b(police|eoco|osp|nacoc|naimos|military|soldiers|task force|customs|cid)\b/.test(head) || (arrestN && Math.max(n0, n1) >= 3)) {
    score += 2; reasons.push("+2 enforcement operation");
  }
  const body = String(a.body || "");
  const lastP = body.trim().split(/<\/p>/i).filter(x => x.trim()).pop() || "";
  if (/<strong>Update \(/.test(lastP) && /also reported on this story/.test(lastP)) { score -= 3; reasons.push("-3 latest change is merged update"); }
  return { score, reasons };
}

// ---------- Tweet text (no AI) ----------
const TEXT_MAX = 150;
function trimWords(s: string, max: number): string {
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(" ", max);
  s = s.slice(0, cut > 0 ? cut : max);
  return s.replace(/[\s,;:\-–—'"“‘(]+$/, "").replace(/\b(a|an|the|of|in|to|for|and|or|at|on|by|with|as)$/i, "").trim();
}
function buildPostText(title: string, url: string): string {
  let t = trimWords(title.replace(/[\u2014\u2013]/g, ","), TEXT_MAX);
  const tags = " #Ghana #GhanaCrimes";
  if ((t + tags).length <= TEXT_MAX) t += tags;
  if (t.length > TEXT_MAX) t = trimWords(t, TEXT_MAX); // hard check
  if (t.length > TEXT_MAX) t = t.slice(0, TEXT_MAX);
  return `${t} ${url}`;
}

// ---------- Main ----------
// Turn any thrown value (Error, PostgREST error object, string) into a readable string.
function errStr(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if ("message" in o || "code" in o) {
      return JSON.stringify({ message: o.message ?? null, code: o.code ?? null, details: o.details ?? null, hint: o.hint ?? null });
    }
    try { return JSON.stringify(o); } catch { return String(o); }
  }
  return String(e);
}

const MAX_PER_RUN = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = new Date().toISOString();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let mode: "auto" | "preview" | "manual" = "auto";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.mode === "preview" || body?.mode === "manual") mode = body.mode;
  } catch { /* ignore */ }

  const log = async (status: string, message: string, url: string | null = null) => {
    const { error } = await supabase.from("run_logs").insert({
      run_time: started, status, selected_article_url: url, message,
    });
    if (error) console.error("run_logs insert failed:", errStr(error));
  };

  try {
    // 1. Gate-passed articles published in the last 24h, newest first
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { data: articles, error: aerr } = await supabase
      .from("articles")
      .select("id,title,summary,body,category_slug,article_slug,published_at,gate_report,source_url,source_urls,offence_type,case_status")
      .eq("is_published", true)
      .not("gate_report->>raw_item_id", "is", null)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(50);
    if (aerr) throw aerr;
    if (!articles?.length) {
      await log("no_candidate", "No gate-passed articles published in the last 24 hours.");
      return json({ ok: true, status: "no_candidate" });
    }

    // 2. Exclude already-posted URLs
    const urls = articles.map(a => buildArticleUrl(a.category_slug, a.article_slug));
    const { data: alreadyPosted, error: perr } = await supabase
      .from("posted_articles").select("article_url,status").in("article_url", urls);
    if (perr) throw perr;
    // Previews don't block a real post later; posted and errors do (no auto-retry of a failed tweet).
    const posted = new Set((alreadyPosted || [])
      .filter(r => mode === "preview" ? true : r.status !== "preview")
      .map(r => r.article_url));

    // 3. Settings: min score + toggle + daily cap
    const { data: settings, error: serr } = await supabase
      .from("site_settings").select("key,value").in("key", ["auto_post_enabled", "autopost_daily_cap", "autopost_min_score"]);
    if (serr) throw serr;
    const setting = (k: string) => settings?.find(r => r.key === k)?.value;
    const minScoreRaw = Number(String(setting("autopost_min_score") ?? "5").replace(/"/g, ""));
    const minScore = Number.isFinite(minScoreRaw) && minScoreRaw > 0 ? minScoreRaw : 5;

    // Eligible = published in last 24h, not already posted, has title + valid URL,
    // not a test/placeholder item. The publish gate already judged quality.
    const chosen: Array<{ a: typeof articles[number]; url: string; score: number; reasons: string[] }> = [];
    const skips: string[] = [];
    for (const a of articles) {
      if (!a.title || !a.category_slug || !a.article_slug) { skips.push("untitled or missing slug: skipped"); continue; }
      const url = buildArticleUrl(a.category_slug, a.article_slug);
      if (posted.has(url)) { skips.push(`${a.title}: already posted`); continue; }
      if (/qa-test|-test-|placeholder/i.test(a.article_slug) || /^\[?test\b/i.test(a.title)) { skips.push(`${a.title}: test/placeholder item`); continue; }
      const { score, reasons } = scoreArticle(a);
      if (score < minScore) { skips.push(`${a.title}: score ${score} (min ${minScore})`); continue; }
      chosen.push({ a, url, score, reasons });
    }
    // Highest score first; ties go to the newest (articles already newest-first; sort is stable).
    chosen.sort((x, y) => y.score - x.score);
    if (!chosen.length) {
      await log("no_candidate", `No new qualifying article. Checked ${articles.length}. ${skips.slice(0, 5).join(" | ")}`);
      return json({ ok: true, status: "no_candidate", skipped: skips });
    }

    // 4. Toggle + daily cap (settings already loaded in step 3)
    const autoEnabled = String(setting("auto_post_enabled") ?? "true").replace(/"/g, "") !== "false";
    const cap = Number(String(setting("autopost_daily_cap") ?? "16").replace(/"/g, "")) || 16;
    const wantPreview = mode === "preview" || (mode === "auto" && !autoEnabled);

    let remaining = MAX_PER_RUN;
    if (!wantPreview) {
      const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
      const { count, error: cerr } = await supabase.from("posted_articles")
        .select("id", { count: "exact", head: true })
        .eq("posted_to_x", true).gte("posted_at", dayStart.toISOString());
      if (cerr) throw cerr;
      const today = count ?? 0;
      const { count: pubCount, error: pcerr } = await supabase.from("articles")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true).gte("published_at", dayStart.toISOString());
      if (pcerr) throw pcerr;
      const pub = pubCount ?? 0;
      const limit = Math.min(cap, pub > 0 ? Math.max(1, Math.ceil(pub * 0.5)) : 0);
      if (today >= limit) {
        await log("cap_reached", `Daily limit reached: published ${pub} / posted ${today} / limit ${limit} (min of cap ${cap} and 50% of published, UTC day). Nothing posted.`);
        return json({ ok: true, status: "cap_reached", today, limit, published: pub, cap });
      }
      remaining = Math.min(MAX_PER_RUN, limit - today);
    }

    const ck = Deno.env.get("TWITTER_CONSUMER_KEY");
    const cs = Deno.env.get("TWITTER_CONSUMER_SECRET");
    const at = Deno.env.get("TWITTER_ACCESS_TOKEN");
    const ats = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
    if (!wantPreview && (!ck || !cs || !at || !ats)) throw new Error("Twitter credentials not configured");

    const results: unknown[] = [];
    for (const { a, url, score, reasons } of chosen.slice(0, remaining)) {
      const postText = buildPostText(a.title, url);
      const why = `score ${score} (${reasons.join(", ")})`;

      if (wantPreview) {
        const { error: ie } = await supabase.from("posted_articles").insert({
          article_url: url, article_title: a.title, post_text: postText, posted_to_x: false, status: "preview",
        });
        if (ie) throw ie;
        await log("preview", `Preview generated, ${why} (mode=${mode}, autoEnabled=${autoEnabled}).`, url);
        results.push({ url, status: "preview", post_text: postText });
        continue;
      }

      const tUrl = "https://api.x.com/2/tweets";
      const auth = await oauthHeader("POST", tUrl, ck!, cs!, at!, ats!);
      const tRes = await fetch(tUrl, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ text: postText }),
      });
      const tBody = await tRes.text();
      if (!tRes.ok) {
        const m = `X API ${tRes.status}: ${tBody.slice(0, 500)}`;
        await supabase.from("posted_articles").upsert({
          article_url: url, article_title: a.title, post_text: postText,
          posted_to_x: false, status: "error", error_message: m,
        }, { onConflict: "article_url" });
        if (tRes.status === 429 || tRes.status === 402) {
          await log("error", `${tRes.status === 429 ? "X rate limit" : "X payment required"}, stopping this run. ${m}`, url);
          results.push({ url, status: "error", error: m });
          break;
        }
        await log("error", m, url);
        results.push({ url, status: "error", error: m });
        continue;
      }
      const tweetId = JSON.parse(tBody)?.data?.id;
      const { error: ie } = await supabase.from("posted_articles").upsert({
        article_url: url, article_title: a.title, post_text: postText,
        posted_to_x: true, x_post_id: tweetId, status: "posted", posted_at: new Date().toISOString(), error_message: null,
      }, { onConflict: "article_url" });
      if (ie) await log("error", `Posted to X (id=${tweetId}) but saving failed: ${errStr(ie)}`, url);
      else await log("posted", `Posted to X (id=${tweetId}), ${why}.`, url);
      results.push({ url, status: "posted", x_post_id: tweetId, post_text: postText });
    }

    const status = wantPreview ? "preview" : (results.some((r: any) => r.status === "posted") ? "posted" : "error");
    return json({ ok: true, status, results });
  } catch (err) {
    const msg = errStr(err);
    console.error("ghanacrimes-autopost error:", msg);
    await log("error", msg);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
