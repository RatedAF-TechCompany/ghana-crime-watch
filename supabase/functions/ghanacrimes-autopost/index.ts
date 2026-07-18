import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGateway, newUsage, AiCreditError } from "../_shared/ai-usage.ts";


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

async function generatePost(
  lovableKey: string,
  title: string,
  summary: string,
  body: string,
  articleUrl: string,
  _publishedAt: string | null,
): Promise<string> {
  const excerpt = (body || "").slice(0, 1500);

  const system = `You write X posts for GhanaCrimes, a serious Ghanaian crime and public-safety publication.

TWEET GENERATION RULES (all must hold):
- Hook format only: ONE sentence, maximum 150 characters, sentence case.
- No hashtags. No emojis. No exclamation marks. No "BREAKING:" or similar labels. No quotes around the sentence.
- Tone: calm, declarative, dry — New Yorker style. Plain British register, observational.
- Create curiosity to drive the click. Do NOT summarise the story. Do NOT use "read more", "find out", "click to see", "here's what happened" or any preamble.
- No em dashes or en dashes. Use commas or full stops.
- Active voice. Never state guilt as fact before conviction.
- Do not name minors. Do not name victims of sexual offences.

OUTPUT: Return ONLY the single hook sentence. No URL. No line breaks. No surrounding punctuation beyond a single closing full stop.`;

  const user = `TITLE: ${title}
SUMMARY: ${summary || "(none)"}
BODY EXCERPT: ${excerpt}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.4,
      max_tokens: 120,
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let text: string = (data.choices?.[0]?.message?.content || "").trim();

  // Sanitize
  text = text
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
    .replace(/[\u2014\u2013\u2012]/g, ",")           // em/en dashes
    .replace(/\s*#\w+/g, "")                          // hashtags
    .replace(/!+/g, ".")                              // exclamation marks
    .replace(/^\s*(breaking|update|just in|developing)\s*:?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip all emoji
  text = text.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{2702}-\u{27B0}]/gu,
    "",
  ).replace(/\s+/g, " ").trim();

  // Enforce 150-char hook cap
  if (text.length > 150) {
    const cut = text.lastIndexOf(" ", 148);
    text = text.slice(0, cut > 90 ? cut : 148).replace(/[.,;:!?\s]+$/, "") + ".";
  }
  if (!text) throw new Error("AI returned empty post");
  if (!/[.?]$/.test(text)) text += ".";

  return `${text}\n${articleUrl}`;
}


// ---------- Main ----------
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
    await supabase.from("run_logs").insert({
      run_time: started, status, selected_article_url: url, message,
    });
  };

  try {
    // 1. Pull recent published articles
    const { data: articles, error: aerr } = await supabase
      .from("articles")
      .select("id,title,summary,body,category_slug,article_slug,published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(30);
    if (aerr) throw aerr;
    if (!articles?.length) {
      await log("no_candidate", "No published articles found.");
      return json({ ok: true, status: "no_candidate" });
    }

    // 2. Exclude already-posted URLs
    const urls = articles.map(a => buildArticleUrl(a.category_slug, a.article_slug));
    const { data: alreadyPosted } = await supabase
      .from("posted_articles")
      .select("article_url")
      .in("article_url", urls);
    const posted = new Set((alreadyPosted || []).map(r => r.article_url));

    // 3. Qualify newest-first
    let chosen: typeof articles[number] | null = null;
    let chosenUrl = "";
    const skips: string[] = [];
    for (const a of articles) {
      const url = buildArticleUrl(a.category_slug, a.article_slug);
      if (posted.has(url)) { skips.push(`${a.title}: already posted`); continue; }
      const combined = `${a.title}\n${a.summary || ""}\n${(a.body || "").slice(0, 3000)}`;
      if (!looksAboutGhana(combined)) { skips.push(`${a.title}: not Ghana-relevant`); continue; }
      if (!isCrimeAngle(combined, a.category_slug)) { skips.push(`${a.title}: not a crime angle`); continue; }
      if (!hasConcreteFact(combined)) { skips.push(`${a.title}: no concrete fact`); continue; }
      chosen = a; chosenUrl = url; break;
    }

    if (!chosen) {
      await log("no_candidate", `No new qualifying GhanaCrimes article found. Checked ${articles.length}. ${skips.slice(0, 5).join(" | ")}`);
      return json({ ok: true, status: "no_candidate", skipped: skips });
    }

    // 4. Generate post
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
    const postText = await generatePost(lovableKey, chosen.title, chosen.summary || "", chosen.body || "", chosenUrl, chosen.published_at);

    // 5. Decide whether to post
    const { data: toggle } = await supabase
      .from("site_settings").select("value").eq("key", "auto_post_enabled").maybeSingle();
    const autoEnabled = (toggle?.value ?? "true") !== "false";
    const wantPreview = mode === "preview" || (mode === "auto" && !autoEnabled);

    if (wantPreview) {
      const { error: ie } = await supabase.from("posted_articles").insert({
        article_url: chosenUrl, article_title: chosen.title, post_text: postText,
        posted_to_x: false, status: "preview",
      });
      if (ie) throw ie;
      await log("preview", `Preview generated (mode=${mode}, autoEnabled=${autoEnabled}).`, chosenUrl);
      return json({ ok: true, status: "preview", article_url: chosenUrl, post_text: postText });
    }

    // 6. Post to X
    const ck = Deno.env.get("TWITTER_CONSUMER_KEY");
    const cs = Deno.env.get("TWITTER_CONSUMER_SECRET");
    const at = Deno.env.get("TWITTER_ACCESS_TOKEN");
    const ats = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
    if (!ck || !cs || !at || !ats) throw new Error("Twitter credentials not configured");

    const tUrl = "https://api.x.com/2/tweets";
    const auth = await oauthHeader("POST", tUrl, ck, cs, at, ats);
    const tRes = await fetch(tUrl, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ text: postText }),
    });
    const tBody = await tRes.text();
    if (!tRes.ok) {
      await supabase.from("posted_articles").insert({
        article_url: chosenUrl, article_title: chosen.title, post_text: postText,
        posted_to_x: false, status: "error", error_message: `X ${tRes.status}: ${tBody.slice(0, 500)}`,
      });
      await log("error", `X API error ${tRes.status}: ${tBody.slice(0, 300)}`, chosenUrl);
      return json({ ok: false, status: "error", error: tBody }, 500);
    }
    const tweet = JSON.parse(tBody);
    const tweetId = tweet?.data?.id;

    await supabase.from("posted_articles").insert({
      article_url: chosenUrl, article_title: chosen.title, post_text: postText,
      posted_to_x: true, x_post_id: tweetId, status: "posted", posted_at: new Date().toISOString(),
    });
    await log("posted", `Posted to X (id=${tweetId}).`, chosenUrl);
    return json({ ok: true, status: "posted", x_post_id: tweetId, article_url: chosenUrl, post_text: postText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
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
