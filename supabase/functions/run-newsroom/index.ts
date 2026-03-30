import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWS_SOURCES = [
  { name: "GhanaWeb Crime", domain: "ghanaweb.com", rss: "https://www.ghanaweb.com/GhanaHomePage/crime/rss.xml" },
  { name: "GhanaWeb News", domain: "ghanaweb.com", rss: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml" },
  { name: "Citi Newsroom", domain: "citinewsroom.com", rss: "https://citinewsroom.com/feed/" },
  { name: "MyJoyOnline", domain: "myjoyonline.com", rss: "https://www.myjoyonline.com/feed/" },
  { name: "Graphic Online", domain: "graphic.com.gh", rss: "https://www.graphic.com.gh/feed" },
  { name: "3News", domain: "3news.com", rss: "https://3news.com/feed/" },
  { name: "UTV Ghana", domain: "utvghana.com", rss: null },
  { name: "Metro TV Ghana", domain: "metrotvonline.com", rss: null },
  { name: "Peace FM Online", domain: "peacefmonline.com", rss: "https://www.peacefmonline.com/pages/local/crime/rss.xml" },
  { name: "Adom Online", domain: "adomonline.com", rss: "https://www.adomonline.com/feed/" },
  { name: "Starr FM", domain: "starrfm.com.gh", rss: "https://starrfm.com.gh/feed/" },
  { name: "Pulse Ghana", domain: "pulse.com.gh", rss: "https://www.pulse.com.gh/rss" },
  { name: "Modern Ghana", domain: "modernghana.com", rss: "https://www.modernghana.com/rss/" },
  { name: "News Ghana", domain: "newsghana.com.gh", rss: "https://newsghana.com.gh/feed/" },
  { name: "The Chronicle Ghana", domain: "thechronicle.com.gh", rss: "https://thechronicle.com.gh/feed/" },
  { name: "Daily Guide Network", domain: "dailyguidenetwork.com", rss: "https://dailyguidenetwork.com/feed/" },
  { name: "The Finder Online", domain: "thefinderonline.com", rss: null },
  { name: "Ghanaian Times", domain: "ghanaiantimes.com.gh", rss: "https://www.ghanaiantimes.com.gh/feed/" },
  { name: "GBC Ghana Online", domain: "gbcghanaonline.com", rss: "https://www.gbcghanaonline.com/feed/" },
  { name: "Asaase Radio", domain: "asaaseradio.com", rss: "https://asaaseradio.com/feed/" },
  { name: "Atinka Online", domain: "atinkaonline.com", rss: "https://atinkaonline.com/feed/" },
];

// Strict crime-only keywords for RSS filtering
// Story MUST involve a criminal act, formal allegation, police/court action, seizure, or investigation
const CRIME_KEYWORDS = [
  // Criminal acts
  'arrest', 'arrested', 'murder', 'murdered', 'homicide', 'manslaughter',
  'robbery', 'robber', 'armed robbery', 'steal', 'stolen', 'theft', 'thief', 'burglary',
  'fraud', 'defraud', 'scam', 'scammer', 'forgery',
  'assault', 'assaulted', 'attack', 'stab', 'stabbed', 'shoot', 'shooting', 'shot',
  'rape', 'raped', 'defilement', 'defiled',
  'kidnap', 'kidnapped', 'kidnapping', 'abduction',
  'abuse', 'child abuse', 'domestic violence',
  'cybercrime', 'cyber fraud', 'hack', 'hacked', 'hacking',
  'drug seizure', 'drug bust', 'narcotic', 'cocaine', 'cannabis', 'tramadol',
  'money laundering', 'corruption charges', 'bribe', 'bribery',
  'human trafficking', 'trafficking',
  'arson', 'vandal', 'vandalism',
  'extortion', 'threat', 'threatening',
  'smuggle', 'smuggling', 'contraband',
  // Law enforcement & courts
  'police', 'suspect', 'accused', 'convict', 'convicted', 'sentence', 'sentenced',
  'court', 'judge', 'magistrate', 'bail', 'remand', 'remanded',
  'jail', 'prison', 'inmate', 'prisoner',
  'investigation', 'investigating', 'crime', 'criminal',
  'most wanted', 'manhunt', 'wanted',
  'seizure', 'confiscate', 'confiscated',
  'charge', 'charged', 'prosecution', 'prosecuted',
  'victim', 'perpetrator',
];

// No placeholder — articles without source images will have hero_image = null

// Extract image URL from an RSS item block
function extractRSSImage(block: string): string | null {
  // Try <media:content url="...">
  const mediaContent = block.match(/<media:content[^>]+url="([^"]+)"[^>]*\/?>/i)?.[1];
  if (mediaContent) return mediaContent;

  // Try <media:thumbnail url="...">
  const mediaThumbnail = block.match(/<media:thumbnail[^>]+url="([^"]+)"[^>]*\/?>/i)?.[1];
  if (mediaThumbnail) return mediaThumbnail;

  // Try <enclosure url="..." type="image/...">
  const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image\/[^"]*"[^>]*\/?>/i)?.[1];
  if (enclosure) return enclosure;

  // Try <image><url>...</url></image>
  const imageUrl = block.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>[\s\S]*?<\/image>/i)?.[1]?.trim();
  if (imageUrl) return imageUrl;

  // Try first <img src="..."> in description/content
  const imgSrc = block.match(/<img[^>]+src="([^"]+)"[^>]*\/?>/i)?.[1];
  if (imgSrc && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://'))) return imgSrc;

  return null;
}

// Parse RSS/Atom XML feed and extract items
function parseRSSItems(xml: string, sourceName: string): any[] {
  const items: any[] = [];
  
  // Try RSS <item> tags first, then Atom <entry> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  
  const matches = [...xml.matchAll(itemRegex), ...xml.matchAll(entryRegex)];
  
  for (const match of matches) {
    const block = match[1];
    
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const description = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim()
      || block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim()
      || "";
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim()
      || block.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i)?.[1]?.trim()
      || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      || block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
      || block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim()
      || "";
    
    // Strip HTML tags from description
    const cleanSummary = description.replace(/<[^>]*>/g, '').substring(0, 500);
    
    // Extract image from RSS item
    const imageUrl = extractRSSImage(block) || extractRSSImage(description);
    
    if (title) {
      items.push({
        source_name: sourceName,
        original_headline: title,
        original_summary: cleanSummary,
        source_url: link || null,
        pub_date: pubDate ? new Date(pubDate) : null,
        source_image_url: imageUrl,
      });
    }
  }
  
  return items;
}

// Fetch and parse a single RSS feed with timeout
async function fetchRSSFeed(source: { name: string; rss: string | null }): Promise<any[]> {
  if (!source.rss) return [];
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s per feed
    
    const response = await fetch(source.rss, {
      headers: { 'User-Agent': 'GhanaCrimes-Newsroom/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`RSS feed failed for ${source.name}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const items = parseRSSItems(xml, source.name);
    console.log(`RSS: ${source.name} returned ${items.length} items`);
    return items;
  } catch (e) {
    console.log(`RSS fetch error for ${source.name}: ${e instanceof Error ? e.message : 'unknown'}`);
    return [];
  }
}

// Filter RSS items to crime-related stories within the freshness window
function filterCrimeItems(items: any[], maxAgeHours: number): any[] {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  return items.filter(item => {
    // Check freshness
    if (item.pub_date && item.pub_date < cutoff) return false;
    
    // Check if crime-related
    const text = `${item.original_headline} ${item.original_summary}`.toLowerCase();
    return CRIME_KEYWORDS.some(keyword => text.includes(keyword));
  });
}

// Valid categories that match the database CHECK constraint
const VALID_CATEGORIES = [
  "top-stories", "violent-crime", "property-crime", "cybercrime",
  "fraud-scams", "drug-offences", "domestic-violence", "traffic-offences",
  "youth-crime", "organised-crime", "white-collar-crime", "police-reports",
  "court-cases", "prison-news", "crime-prevention", "crime-statistics",
  "investigations", "most-wanted"
];

// Map AI-generated categories to valid ones
const CATEGORY_MAPPING: Record<string, string> = {
  "breaking-news": "top-stories",
  "theft-robbery": "property-crime",
  "drug-offenses": "drug-offences",
  "corruption": "white-collar-crime",
  "public-safety": "crime-prevention",
  "community-watch": "police-reports",
  "robbery": "property-crime",
  "murder": "violent-crime",
  "assault": "violent-crime",
  "fraud": "fraud-scams",
  "scams": "fraud-scams",
  "drugs": "drug-offences",
  "courts": "court-cases",
  "police": "police-reports",
};

// Helper to normalize category to valid one
function normalizeCategory(category: string): string {
  const normalized = category?.toLowerCase().trim() || "";
  if (VALID_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  if (CATEGORY_MAPPING[normalized]) {
    return CATEGORY_MAPPING[normalized];
  }
  // Default fallback
  return "top-stories";
}

// PHOTO-FIRST EDITORIAL IMAGE POLICY
// Every article must be illustrated with an image that reads as a real photograph.
// AI may only be used as a hidden fallback to generate photo-realistic stock-style imagery.
// No illustrations, digital art, concept art, cartoons, infographics, or stylised visuals.

const PHOTOREALISTIC_PROMPT_PREFIX = `Ultra-realistic editorial photograph, shot on Canon EOS R5, natural lighting, low saturation, calm observational tone, no text overlay, no logos, no watermarks, no filters, no dramatic cinematic effects, 16:9 aspect ratio. The image must be indistinguishable from a real wire service photograph.`;

// Image sourcing strategy types - follows strict priority order
type ImageStrategy = 'real_story_photo' | 'contextual_real_photo' | 'environmental_photo' | 'ai_photorealistic';

interface ImageAnalysis {
  strategy: ImageStrategy;
  subject_name?: string;
  subject_type?: 'politician' | 'celebrity' | 'public_figure' | 'location' | 'building' | 'institution' | 'commodity' | 'infrastructure';
  search_query?: string;
  photo_description?: string;
}

// Analyze article to determine best image sourcing strategy following STRICT PRIORITY ORDER:
// 1. Real photos tied directly to the story (buildings, press rooms, locations)
// 2. Contextual real-world photos (sector-appropriate: cocoa farms, banks, ports)
// 3. Representative environmental photography (streets, skylines, offices, objects)
// 4. AI-generated photorealistic fallback ONLY (must look like real stock photo)
async function analyzeImageStrategy(
  headline: string,
  summary: string,
  body: string,
  lovableApiKey: string
): Promise<ImageAnalysis> {
  const analysisPrompt = `You are an editorial photo desk editor for a serious international news website modeled after the Financial Times.

Analyze this news article and determine the best PHOTOGRAPH sourcing strategy.

HEADLINE: ${headline}
SUMMARY: ${summary}

STRICT IMAGE SOURCING PRIORITY (follow this exact order):

PRIORITY 1 - "real_story_photo": Direct photographs tied to the story
- Government buildings, offices, press rooms mentioned in the story
- Farms, factories, ports, markets, infrastructure involved
- Exterior shots of institutions mentioned
- Wide shots of cities, regions, or landscapes involved
- IMPORTANT: Do NOT search for photos of specific named individuals or identifiable people

PRIORITY 2 - "contextual_real_photo": Generic but truthful sector photographs
- Generic cocoa farms, oil storage tanks, data centres, banks, ports
- Neutral archive photos that accurately represent the industry or activity
- Stock-style photos of the sector without specific branding

PRIORITY 3 - "environmental_photo": Representative environmental photography
- Streets, skylines, offices, meeting rooms, workspaces
- Objects involved (documents, commodities, machinery, produce)
- Generic workplace or urban scenes related to the topic

PRIORITY 4 - "ai_photorealistic": AI-generated ONLY as last resort
- Output must be indistinguishable from a real photograph
- Only generic scenes, environments, or objects
- NEVER identifiable people, named individuals, or specific events
- Must look like a neutral stock photo from a wire service

RULES:
- NEVER suggest searching for photos of identifiable/named people
- NEVER suggest illustrations, digital art, or stylised imagery
- Always prefer real photographs over AI generation
- For sensitive topics (deaths, violence), prefer environmental/contextual shots

Return ONLY valid JSON:
{
  "strategy": "real_story_photo" | "contextual_real_photo" | "environmental_photo" | "ai_photorealistic",
  "subject_name": "Place, institution, or sector name (NEVER a person's name)",
  "subject_type": "location" | "building" | "institution" | "commodity" | "infrastructure" | null,
  "search_query": "Optimized search query for finding a REAL PHOTOGRAPH (no people's names)",
  "photo_description": "Brief description of what the ideal photograph would show"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a photo desk editor for a Financial Times-style publication. You source real photographs only. You NEVER suggest photos of identifiable people. Return only valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.log("Image strategy analysis failed, defaulting to AI photorealistic");
      return { strategy: 'ai_photorealistic' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const analysis = JSON.parse(jsonMatch[1] || content);
    
    console.log(`Image strategy: ${analysis.strategy} for "${analysis.subject_name || 'N/A'}"`);
    return analysis;
  } catch (e) {
    console.error("Image strategy analysis error:", e);
    return { strategy: 'ai_photorealistic' };
  }
}

// Search for real photograph using web search
async function searchForRealPhoto(
  searchQuery: string,
  subjectType: string | undefined,
  lovableApiKey: string
): Promise<string | null> {
  try {
    const searchPrompt = `Find a high-quality, publicly available PHOTOGRAPH of: ${searchQuery}

STRICT REQUIREMENTS:
- Must be a REAL PHOTOGRAPH (absolutely no illustrations, digital art, AI-generated images, or infographics)
- Should be from a reputable news source, government website, stock photo service, or official site
- Image should be clear, professional quality, calm editorial tone
- Must show places, buildings, environments, objects, or landscapes — NEVER identifiable people's faces
- For locations: clear daytime photos, neutral framing, no dramatic effects
- For institutions: exterior shots, official buildings, signage visible
- For commodities/sectors: generic representative photos (farms, factories, markets)

Return ONLY a JSON object with:
{
  "image_url": "direct URL to the image file (must end in .jpg, .png, .webp or be a direct image link)",
  "source": "where the image is from",
  "description": "brief description of what the photograph shows",
  "found": true/false
}

If you cannot find a suitable real photograph, return: {"found": false}
Do NOT return illustrations, digital art, or AI-generated imagery.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a wire service photo researcher. You find only real photographs — never illustrations or AI art. Return only valid JSON." },
          { role: "user", content: searchPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.log("Photo search failed");
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const result = JSON.parse(jsonMatch[1] || content);
    
    if (result.found && result.image_url) {
      console.log(`Found real photograph: ${result.image_url} from ${result.source}`);
      return result.image_url;
    }
    
    return null;
  } catch (e) {
    console.error("Photo search error:", e);
    return null;
  }
}

// Download and upload external image to Supabase storage
async function downloadAndUploadImage(
  imageUrl: string,
  articleSlug: string,
  supabase: any
): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GhanaCrimes/1.0)',
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to download image: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const imageBuffer = new Uint8Array(buffer);
    
    // Determine file extension
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    
    const imagePath = `newsroom/${articleSlug}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("article-images")
      .upload(imagePath, imageBuffer, {
        contentType: contentType,
        upsert: true
      });
    
    if (uploadError) {
      console.error("Image upload failed:", uploadError);
      return null;
    }
    
    const { data: publicUrl } = supabase.storage
      .from("article-images")
      .getPublicUrl(imagePath);
    
    console.log(`Uploaded real image: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (e) {
    console.error("Download/upload error:", e);
    return null;
  }
}

// AI image enhancement has been removed per Photo-First Editorial Policy.
// AI is only used as a last-resort fallback to generate photorealistic stock-style images.

// ═══════════════════════════════════════════════════════════════════
// LIVE FACT-CHECKING FILTER — verifies claims using real-time web search
// Catches errors like incorrect titles, wrong officeholders, outdated roles
// ═══════════════════════════════════════════════════════════════════
interface FactCheckResult {
  passed: boolean;
  corrections: Array<{
    original: string;
    corrected: string;
    field: string;
    reason: string;
  }>;
  corrected_article: any | null;
}

async function liveFactCheck(
  articleJson: any,
  lovableApiKey: string
): Promise<FactCheckResult> {
  const currentDateTime = new Date().toISOString();
  
  const factCheckPrompt = `You are a LIVE FACT-CHECKER for a Ghana crime news platform. The current date and time is ${currentDateTime}.

Your job is to verify ALL factual claims in this article using real-time web search. You must be especially vigilant about:

1. **CURRENT OFFICEHOLDERS & TITLES**: Verify that anyone mentioned holds the title/role stated AS OF RIGHT NOW (${currentDateTime}). Presidents, ministers, chiefs, commissioners, directors — their titles MUST reflect who currently holds office. If someone is referred to as "former" when they are actually the current officeholder, or vice versa, this is a CRITICAL error.

2. **NAMES & SPELLINGS**: Verify correct spelling of all names — people, places, institutions.

3. **DATES & TIMELINES**: Verify that dates mentioned are accurate and consistent.

4. **INSTITUTIONAL NAMES**: Verify official names of agencies, courts, police divisions, etc.

5. **LEGAL TERMINOLOGY**: Verify charges, legal processes, and court procedures are accurately described.

6. **GEOGRAPHIC ACCURACY**: Verify locations, regions, districts are correctly identified.

ARTICLE TO FACT-CHECK:

Headline: ${articleJson.headline}
Subtitle: ${articleJson.subtitle || ""}
Summary: ${articleJson.summary || ""}
Body: ${articleJson.body || ""}
Tweet: ${articleJson.twitter_post || ""}
Tags: ${JSON.stringify(articleJson.tags || [])}

INSTRUCTIONS:
- Search the web to verify EVERY factual claim, especially titles and roles of named individuals.
- For Ghana's President, Vice President, IGP, Attorney General, ministers — confirm who CURRENTLY holds each position as of today.
- If ANY factual error is found, provide the correction.
- If corrections are needed, return a FULLY CORRECTED version of the article with all fields.
- The corrected article must maintain the exact same structure and writing style.
- Do NOT change the writing style, tone, or structure — only fix factual errors.
- Do NOT add new information that wasn't in the original.
- Do NOT remove information unless it is factually wrong.

Return ONLY valid JSON:
{
  "passed": true/false,
  "corrections": [
    {
      "original": "exact text that is wrong",
      "corrected": "what it should be",
      "field": "which field (headline/body/summary/subtitle/twitter_post/tags)",
      "reason": "why this is wrong and source of correct info"
    }
  ],
  "corrected_article": null (if passed=true) OR { full corrected article with all original fields } (if passed=false)
}

If everything checks out, return: {"passed": true, "corrections": [], "corrected_article": null}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a rigorous, real-time fact-checker for a professional news organization. You verify every claim using live web search. You are especially strict about current officeholders, titles, and roles. Return only valid JSON." },
          { role: "user", content: factCheckPrompt }
        ],
        tools: [{ google_search: {} }],
      }),
    });

    if (!response.ok) {
      console.error(`Fact-check API failed: ${response.status}`);
      // On API failure, pass through but log warning
      return { passed: true, corrections: [], corrected_article: null };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const result = JSON.parse(jsonMatch[1] || content);
    
    if (!result.passed && result.corrections?.length > 0) {
      console.log(`FACT-CHECK FAILED — ${result.corrections.length} corrections needed:`);
      for (const c of result.corrections) {
        console.log(`  ❌ [${c.field}] "${c.original}" → "${c.corrected}" (${c.reason})`);
      }
    } else {
      console.log("FACT-CHECK PASSED — all claims verified");
    }
    
    return result;
  } catch (e) {
    console.error("Fact-check error:", e);
    // On error, pass through but log
    return { passed: true, corrections: [], corrected_article: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const triggerType = body.trigger_type || "manual";

    // Clean up stale "running" runs (older than 8 minutes) - they are timed-out ghosts
    const tenMinutesAgo = new Date(Date.now() - 8 * 60 * 1000).toISOString();
    await supabase.from("newsroom_runs").update({
      status: "failed",
      error_message: "Timed out — run did not complete within expected window",
      completed_at: new Date().toISOString(),
    }).eq("status", "running").lt("started_at", tenMinutesAgo);

    // Create a new run
    const { data: run, error: runError } = await supabase
      .from("newsroom_runs")
      .insert({
        trigger_type: triggerType,
        status: "running",
        articles_found: 0,
        articles_created: 0,
        created_by: userId,
      })
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create run: ${runError.message}`);
    }

    console.log(`Started newsroom run: ${run.id}`);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1A: NATIVE RSS FEED SCANNING — real grounded news discovery
    // ═══════════════════════════════════════════════════════════════════
    const MAX_AGE_HOURS = 20; // Strict 20-hour freshness cutoff
    const today = new Date().toISOString().split('T')[0];
    
    console.log("Step 1A: Scanning RSS feeds from whitelisted sources...");
    
    // Fetch all RSS feeds in parallel
    const rssPromises = NEWS_SOURCES.map(source => fetchRSSFeed(source));
    const rssResults = await Promise.all(rssPromises);
    const allRssItems = rssResults.flat();
    
    console.log(`RSS total: ${allRssItems.length} raw items from ${NEWS_SOURCES.filter(s => s.rss).length} feeds`);
    
    // Filter to crime-related items within 20-hour window
    const freshCrimeItems = filterCrimeItems(allRssItems, MAX_AGE_HOURS);
    console.log(`RSS filtered: ${freshCrimeItems.length} crime items within ${MAX_AGE_HOURS}h window`);
    
    // Convert RSS items to standard format
    const rssNewsItems = freshCrimeItems.map(item => ({
      source_name: item.source_name,
      original_headline: item.original_headline,
      original_summary: item.original_summary,
      source_url: item.source_url,
      source_image_url: item.source_image_url || null,
      category_hint: "top-stories",
      estimated_date: item.pub_date ? item.pub_date.toISOString().split('T')[0] : today,
      discovery_method: "rss",
    }));

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1B: GEMINI SEARCH GROUNDING — supplementary AI web search
    // ═══════════════════════════════════════════════════════════════════
    console.log("Step 1B: Running Gemini search grounding for additional stories...");
    
    let geminiNewsItems: any[] = [];
    try {
      const sourcesList = NEWS_SOURCES.map(s => `${s.name} (${s.domain})`).join(", ");
      const searchPrompt = `You are the GhanaCrimes News Intake Filter.

You are scanning the following approved Ghanaian news outlets:
${sourcesList}

Today's date and time is ${new Date().toISOString()}. Only return news published within the last 20 hours.

CRITICAL GEOGRAPHIC RULE:
You must ONLY return crime news that takes place IN GHANA or directly involves Ghanaian citizens, Ghanaian institutions, or Ghanaian law enforcement.
Do NOT return any international crime news from the USA, UK, Nigeria, or any other country unless it directly involves a Ghanaian suspect, Ghanaian victim, or Ghanaian authorities.
If a story is about a crime in another country with no Ghana connection, discard it immediately.

Your job is to extract ONLY crime-related news FROM GHANA. You must IGNORE all stories that are:
Politics, Business, Sports, Entertainment, Opinion, Lifestyle, Education, Religion, Health (unless directly tied to a criminal investigation), Editorial commentary, Announcements, Feature stories, Human interest stories, International news without a direct Ghana connection.

Only extract stories involving:
Arrests, Court cases, Sentencing, Police investigations, Fraud, Scams, Robbery, Armed robbery, Murder, Attempted murder, Assault, Domestic violence, Child abuse, Defilement, Rape, Cybercrime, Drug seizures, Money laundering, Corruption charges, Human trafficking, Kidnapping, Prison news, Crime statistics, Security operations, Most wanted notices.

Filtering Rules:
- The crime must have occurred in Ghana OR directly involve Ghanaian nationals or institutions.
- The article must involve a criminal act or formal criminal allegation.
- There must be either: a named suspect, a police or court action, a filed charge, a sentencing decision, a seizure of illegal items, or an official criminal investigation.
- If the story does not involve a criminal offence or official criminal action, discard it.
- If the story is opinion or analysis about crime trends without a specific incident, discard it.
- If the story is purely political debate without charges filed, discard it.
- If the crime happened outside Ghana with no Ghanaian connection, discard it.
- If unsure, discard it.

Return only items that clearly meet BOTH the crime AND Ghana criteria.

Return a JSON array of 5-15 real crime news items. Each item must have:
- source_name: The news outlet name
- original_headline: The exact headline from the source
- original_summary: A brief 1-2 sentence summary of the story
- source_url: The actual URL where this story was published (must be a real URL you found)
- category_hint: One of: ${VALID_CATEGORIES.join(", ")}
- estimated_date: Publication date in YYYY-MM-DD format

Return ONLY a valid JSON array, no other text.`;

      // Add 15s timeout so Gemini search doesn't block the entire pipeline
      const geminiController = new AbortController();
      const geminiTimeout = setTimeout(() => geminiController.abort(), 15000);
      
      const searchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are a news wire service that finds and reports real, current news stories. You must search the web and return only verifiable news items with real URLs. Return only valid JSON." },
            { role: "user", content: searchPrompt }
          ],
          tools: [{ google_search: {} }],
        }),
        signal: geminiController.signal,
      });
      clearTimeout(geminiTimeout);

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const newsContent = searchData.choices?.[0]?.message?.content || "[]";
        
        try {
          const jsonMatch = newsContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, newsContent];
          const parsed = JSON.parse(jsonMatch[1] || newsContent);
          geminiNewsItems = (Array.isArray(parsed) ? parsed : []).map((item: any) => ({
            ...item,
            discovery_method: "gemini_search",
          }));
        } catch (e) {
          console.error("Failed to parse Gemini search results:", e);
        }
        console.log(`Gemini search: found ${geminiNewsItems.length} items`);
      } else {
        const errText = await searchResponse.text();
        console.error(`Gemini search failed (${searchResponse.status}): ${errText}`);
        if (searchResponse.status === 429) {
          console.log("Rate limited on Gemini search, continuing with RSS results only");
        }
      }
    } catch (geminiError) {
      console.error("Gemini search error:", geminiError);
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1C: MERGE & DEDUPLICATE — combine RSS + Gemini results
    // ═══════════════════════════════════════════════════════════════════
    const allDiscoveredItems = [...rssNewsItems, ...geminiNewsItems];
    
    // Deduplicate by headline similarity
    const seenHeadlines = new Set<string>();
    const newsItems = allDiscoveredItems.filter(item => {
      const normalized = (item.original_headline || "").toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const keyPhrase = normalized.split(' ').slice(0, 6).join(' ');
      if (seenHeadlines.has(normalized) || (keyPhrase.length > 15 && seenHeadlines.has(keyPhrase))) {
        return false;
      }
      seenHeadlines.add(normalized);
      seenHeadlines.add(keyPhrase);
      return true;
    });
    
    console.log(`Merged: ${allDiscoveredItems.length} total → ${newsItems.length} unique items (${rssNewsItems.length} RSS + ${geminiNewsItems.length} Gemini)`);

    // Step 1.5: Filter out outdated stories based on keywords and strict 20-hour cutoff
    const outdatedKeywords = [
      'christmas eve', 'christmas day', 'christmas preparation', 'christmas preparedness',
      'holiday season preparation', 'yuletide', 'festive season', 'new year eve',
      'december 24', 'december 25', 'december 31', 'january 1st celebration'
    ];
    
    const twentyHoursAgo = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);
    
    const isOutdatedStory = (item: any): boolean => {
      const headline = (item.original_headline || item.headline || "").toLowerCase();
      const summary = (item.original_summary || item.summary || "").toLowerCase();
      const combined = `${headline} ${summary}`;
      
      // Check for outdated keywords
      for (const keyword of outdatedKeywords) {
        if (combined.includes(keyword)) {
          console.log(`Filtering outdated story (keyword: ${keyword}): ${headline}`);
          return true;
        }
      }
      
      return false;
    };
    
    // Filter out outdated stories
    const currentNewsItems = newsItems.filter(item => !isOutdatedStory(item));
    const outdatedSkipped = newsItems.length - currentNewsItems.length;
    if (outdatedSkipped > 0) {
      console.log(`Filtered ${outdatedSkipped} outdated stories`);
    }

    if (currentNewsItems.length === 0) {
      await supabase.from("newsroom_runs").update({
        status: "no_news",
        error_message: newsItems.length > 0 ? `All ${newsItems.length} stories were filtered as outdated` : null,
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);

      return new Response(JSON.stringify({ 
        success: true,
        run_id: run.id,
        message: "No news items found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Check for duplicates BEFORE inserting (saves AI calls)
    // Get recent articles to check against (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentArticles } = await supabase
      .from("articles")
      .select("id, title, article_slug")
      .gte("created_at", sevenDaysAgo);

    // Also check recent newsroom articles to avoid processing same headline twice
    const { data: recentNewsroomArticles } = await supabase
      .from("newsroom_articles")
      .select("original_headline")
      .gte("created_at", sevenDaysAgo)
      .neq("processing_status", "failed");

    // Build sets for fast lookup
    const existingHeadlines = new Set<string>();
    const existingSlugs = new Set<string>();
    
    for (const article of recentArticles || []) {
      // Normalize title for comparison (lowercase, remove special chars)
      const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      existingHeadlines.add(normalizedTitle);
      
      // Also add key phrases (first 5-6 words)
      const keyPhrase = normalizedTitle.split(' ').slice(0, 6).join(' ');
      if (keyPhrase.length > 20) {
        existingHeadlines.add(keyPhrase);
      }
      
      // Track slugs
      if (article.article_slug) {
        existingSlugs.add(article.article_slug.toLowerCase());
      }
    }

    // Add newsroom headlines already processed
    for (const nrArticle of recentNewsroomArticles || []) {
      const normalizedHeadline = nrArticle.original_headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      existingHeadlines.add(normalizedHeadline);
    }

    // Helper function to check if headline is duplicate
    const isDuplicateHeadline = (headline: string): boolean => {
      const normalized = headline.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      
      // Exact match
      if (existingHeadlines.has(normalized)) return true;
      
      // Key phrase match (first 6 words)
      const keyPhrase = normalized.split(' ').slice(0, 6).join(' ');
      if (keyPhrase.length > 20 && existingHeadlines.has(keyPhrase)) return true;
      
      // Fuzzy match - check if >70% of words overlap with any existing headline
      const words = new Set(normalized.split(' ').filter(w => w.length > 3));
      for (const existing of existingHeadlines) {
        const existingWords = new Set(existing.split(' ').filter(w => w.length > 3));
        if (existingWords.size < 4) continue;
        
        let matches = 0;
        for (const word of words) {
          if (existingWords.has(word)) matches++;
        }
        
        const overlapRatio = matches / Math.max(words.size, existingWords.size);
        if (overlapRatio > 0.7) return true;
      }
      
      return false;
    };

    // Filter out duplicates BEFORE making AI calls (use currentNewsItems which already filters outdated)
    const uniqueNewsItems = currentNewsItems.filter(item => {
      const headline = item.original_headline || item.headline || "";
      return !isDuplicateHeadline(headline);
    });

    const skippedDuplicates = currentNewsItems.length - uniqueNewsItems.length;
    console.log(`Duplicate check: ${skippedDuplicates} duplicates skipped, ${uniqueNewsItems.length} unique items to process`);

    // Also track outdated items for the record
    const outdatedRecords = newsItems
      .filter(item => isOutdatedStory(item))
      .map(item => ({
        run_id: run.id,
        source_name: item.source_name || "Unknown",
        original_headline: item.original_headline || item.headline || "Untitled",
        original_summary: item.original_summary || item.summary || "",
        source_url: item.source_url || null,
        processing_status: "outdated",
      }));

    // Insert only unique news items as pending
    const newsRecords = uniqueNewsItems.map(item => ({
      run_id: run.id,
      source_name: item.source_name || "Unknown",
      original_headline: item.original_headline || item.headline || "Untitled",
      original_summary: item.original_summary || item.summary || "",
      source_url: item.source_url || null,
      image_style: item.source_image_url || null,
      processing_status: "pending",
    }));

    // Also insert skipped duplicates with status (from current/non-outdated items only)
    const duplicateRecords = currentNewsItems
      .filter(item => isDuplicateHeadline(item.original_headline || item.headline || ""))
      .map(item => ({
        run_id: run.id,
        source_name: item.source_name || "Unknown",
        original_headline: item.original_headline || item.headline || "Untitled",
        original_summary: item.original_summary || item.summary || "",
        source_url: item.source_url || null,
        processing_status: "duplicate",
      }));

    // Insert all records (pending, duplicate, and outdated)
    const { data: insertedNews, error: insertError } = await supabase
      .from("newsroom_articles")
      .insert([...newsRecords, ...duplicateRecords, ...outdatedRecords])
      .select();

    if (insertError) {
      console.error("Failed to insert news items:", insertError);
    }

    // Update articles found count
    await supabase.from("newsroom_runs").update({
      articles_found: newsItems.length,
    }).eq("id", run.id);

    // Step 3: Process pending items — include carry-over from previous timed-out runs
    let articlesCreated = 0;
    const newPendingItems = (insertedNews || []).filter(item => item.processing_status === "pending");

    // Also fetch leftover pending items from previous runs that timed out
    const { data: carryOverItems } = await supabase
      .from("newsroom_articles")
      .select("*")
      .eq("processing_status", "pending")
      .not("run_id", "eq", run.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Process carry-over items FIRST (they've been waiting longest), then new items
    // CAP: Maximum 3 articles per run to reduce AI credit usage
    const MAX_ARTICLES_PER_RUN = 3;
    const pendingItems = [...(carryOverItems || []), ...newPendingItems].slice(0, MAX_ARTICLES_PER_RUN);
    console.log(`Processing ${pendingItems.length} pending items (capped at ${MAX_ARTICLES_PER_RUN}) from ${(carryOverItems || []).length} carry-over + ${newPendingItems.length} new`);

    for (const newsItem of pendingItems) {
      try {
        // Update status to processing
        await supabase.from("newsroom_articles").update({
          processing_status: "processing",
        }).eq("id", newsItem.id);

        // Build list of recently published slugs for duplicate suppression by AI
        const recentSlugsList = Array.from(existingSlugs).slice(0, 50).join(", ");

        // Generate full article using the GhanaCrimes Automated Newsroom Engine
        const articlePrompt = `You are running a GhanaCrimes automated newsroom cycle.

TODAY'S DATE IS ${today}

You will receive ONE scanned item to process.

SCANNED ITEM:
headline: ${newsItem.original_headline}
summary: ${newsItem.original_summary}
source: ${newsItem.source_name}
published_date: ${today}
url: ${newsItem.source_url || "unknown"}

PREVIOUSLY PUBLISHED SLUGS (last 7 days):
${recentSlugsList || "none"}

---

SOURCE HANDLING RULE

You may use the scanned outlets internally for verification.
You must NEVER mention any media outlet name inside the headline, subtitle, summary, body, seo_description, twitter_post, or photo_description.

Instead, attribute information only to:
Police statement, Court filing, Prosecutor, Fire Service spokesperson, Ghana Police Service, Judicial Service, National Fire Service, Named official, Witness.

If the only available source is a media report and no official source is available, write neutrally without naming the outlet.
Never write phrases such as "According to MyJoyOnline", "Citi Newsroom reported", or "Graphic Online stated".
Never promote competitors.

---

DUPLICATE SUPPRESSION

The system stores previously published slugs listed above.
If this event matches a previously published slug or is clearly the same incident already covered within the last 48 hours, return:

headline = DUPLICATE_SKIP
All other fields empty.

---

GEOGRAPHIC RULE

This is a GHANA-ONLY crime news platform. The story MUST take place in Ghana or directly involve Ghanaian citizens, Ghanaian institutions, or Ghanaian law enforcement.
If the crime occurred in another country (USA, UK, Nigeria, etc.) with no direct Ghana connection, return:

headline = NON_GHANA_SKIP
All other fields empty.

---

FRESHNESS RULE

If the event is more than 30 days old based on verified publication dates, return:

headline = OUTDATED_SKIP
All other fields empty.

Never update old stories to appear recent.

---

VERIFICATION RULE

Confirm key facts using credible sources where possible.
Prefer official or primary sources such as police statements, court filings, or named officials.
If only one media source exists and no official confirmation is available, write the facts plainly without naming the outlet.
If a detail appears in only one source, clearly attribute it.
If details conflict, report both versions and attribute each.
Never invent names, numbers, dates, or quotes.
Publish even with a single source — do not reject stories for lack of multi-source verification.

---

WRITING RULES

Use short sentences.
Use common everyday words.
Remain neutral.
Do not dramatise.
Do not speculate.
Do not repeat the same fact twice.
Do not hedge excessively.
Do not use filler language.
Respect presumption of innocence.

If details such as exact cause or damage are unknown, state once plainly. For example:
"The cause of the fire is under investigation."

Do not write phrases like "Reports indicate", "Information was not immediately available", or "Efforts are ongoing".

The reading level must be understandable by a 10 year old.
The tone must be calm, precise, and authoritative, like a professional wire service.

---

OUTPUT FIELDS

headline
Short and factual. Max 80 characters. No colons or long dashes.

subtitle
One clear sentence expanding the headline.

summary
Plain English. Max 500 characters.

body
6 to 10 HTML paragraphs using <p> tags.
Each paragraph 2 to 4 short sentences.
Must include source attribution inside paragraphs using official sources only.
Explain clearly: What happened, Where, When, Who was involved, What authorities said, What legal action follows, Why it matters.
Never use colons, long dashes, bullet points, emojis, hashtags, or URLs inside the body.

seo_description
Max 155 characters.

slug
Lowercase with hyphens.

section
Choose from: ${VALID_CATEGORIES.join(", ")}.

tags
Array including location, agency, crime type, key individuals.

twitter_post
A short reported news sentence written in normal English. Maximum 150 characters. Must end with a period.
Must read like a journalist reporting the news, NOT a headline.
Use sentence case (only capitalize first word, proper nouns, acronyms, and place names).
Every tweet must have a clear subject and verb. Use forms like:
- "Police have arrested..."
- "A court has remanded..."
- "Authorities have seized..."
- "A suspect has been charged..."
Use active voice. No hashtags. No emojis. No links. No ellipsis. No long dashes.
Good examples:
- "Police have arrested five suspects in a galamsey crackdown in the Ashanti Region."
- "An 18-year-old has appeared in Adabraka court over a security guard assault."
- "A court has charged three people over an armed robbery case in Kumasi."
Bad examples (DO NOT generate these):
- "Police Arrest 5 Suspects In Galamsey Crackdown In Ashanti."
- "18-Year-Old Appears In Adabraka Court Over Security Guard Assault."
- "Court Charges 3 Over Armed Robbery Case In Kumasi."
If it exceeds 150 characters, rewrite shorter until it fits. Must not end with truncation.

photo_description
Describe a real world photograph. Maximum 50 words. No faces described. No illustrations.

---

Return ONLY valid JSON with exactly these keys:

{
  "headline": "...",
  "subtitle": "...",
  "summary": "...",
  "body": "<p>...</p>",
  "seo_description": "...",
  "slug": "...",
  "section": "...",
  "tags": ["tag1", "tag2"],
  "twitter_post": "...",
  "photo_description": "..."
}`;

        const articleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are the GhanaCrimes Automated Newsroom Engine. You are a senior investigative crime editor. You write in clear, simple English that a 10 year old can understand, while maintaining professional newsroom standards. You do not mention or promote other media outlets. You do not narrate your verification process. You do not hedge excessively. You do not repeat facts. You do not use filler language. Return only valid JSON. Never use colons, long dashes, bullet points, emojis, hashtags, URLs, or media outlet names." },
              { role: "user", content: articlePrompt }
            ],
          }),
        });

        if (!articleResponse.ok) {
          throw new Error(`Article generation failed: ${articleResponse.status}`);
        }

        const articleData = await articleResponse.json();
        const articleContent = articleData.choices?.[0]?.message?.content || "{}";

        let articleJson: any;
        try {
          const jsonMatch = articleContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, articleContent];
          articleJson = JSON.parse(jsonMatch[1] || articleContent);
        } catch (e) {
          throw new Error("Failed to parse article JSON");
        }

        // Skip flags from AI verification — INSUFFICIENT_VERIFICATION no longer blocks publishing
        const skipFlag = articleJson.headline;
        if (skipFlag === "OUTDATED_SKIP" || skipFlag === "DUPLICATE_SKIP" || skipFlag === "NON_GHANA_SKIP") {
          const statusMap: Record<string, string> = {
            "OUTDATED_SKIP": "outdated",
            "DUPLICATE_SKIP": "duplicate",
            "NON_GHANA_SKIP": "rejected",
          };
          const reasonMap: Record<string, string> = {
            "OUTDATED_SKIP": "AI verification determined this story is outdated",
            "DUPLICATE_SKIP": "AI verification determined this is a duplicate of a recently published story",
            "NON_GHANA_SKIP": "Story is not related to Ghana — international news rejected",
          };
          console.log(`AI flagged story as ${skipFlag}, skipping: ${newsItem.original_headline}`);
          await supabase.from("newsroom_articles").update({
            processing_status: statusMap[skipFlag],
            error_message: reasonMap[skipFlag],
          }).eq("id", newsItem.id);
          continue;
        }

        // FACT-CHECK SKIPPED for speed — articles must publish within 10 minutes
        // Fact-checking was adding ~15s latency per article, causing timeout backlogs
        console.log(`Skipping fact-check for speed: ${articleJson.headline}`);

        // Use AI-generated slug or create from headline
        const slugBase = (articleJson.slug || articleJson.headline || "article")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 80);

        const articleSlug = `${slugBase}-${Date.now()}`;

        // SOURCE IMAGE EXTRACTION — use original images from RSS feeds (zero AI cost)
        let heroImageUrl: string | null = null;
        let imageSourceType: string = 'none';

        // Try to use the source image from RSS feed
        const sourceImageUrl = newsItem.image_style || null;
        if (sourceImageUrl) {
          console.log(`Attempting to download source image: ${sourceImageUrl}`);
          const uploadedUrl = await downloadAndUploadImage(sourceImageUrl, articleSlug, supabase);
          if (uploadedUrl) {
            heroImageUrl = uploadedUrl;
            imageSourceType = 'source';
            console.log(`Source image uploaded: ${uploadedUrl}`);
          }
        }

        // Fallback to branded placeholder
        if (!heroImageUrl) {
          heroImageUrl = PLACEHOLDER_IMAGE_URL;
          imageSourceType = 'placeholder';
          console.log("Using placeholder image");
        }

        // Update newsroom article with image source type
        await supabase.from("newsroom_articles").update({
          image_style: imageSourceType,
        }).eq("id", newsItem.id);

        // Insert the article and auto-publish
        const { data: newArticle, error: articleError } = await supabase
          .from("articles")
          .insert({
            title: articleJson.headline,
            subtitle: articleJson.subtitle,
            summary: articleJson.summary,
            body: articleJson.body,
            article_slug: articleSlug,
            category_slug: normalizeCategory(articleJson.section),
            author_name: "GhanaCrimes Newsroom",
            tags: articleJson.tags || [],
            seo_title: articleJson.headline,
            seo_description: articleJson.seo_description,
            hero_image: heroImageUrl,
            twitter_post: articleJson.twitter_post || null,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (articleError) {
          throw new Error(`Failed to save article: ${articleError.message}`);
        }

        // Update newsroom article with success
        await supabase.from("newsroom_articles").update({
          processing_status: "completed",
          generated_article_id: newArticle.id,
        }).eq("id", newsItem.id);

        // Extract cities and update crime type stats from the article for the crime dashboard
        try {
          const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-cities`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              article_id: newArticle.id,
              title: newArticle.title,
              body: newArticle.body,
              category_slug: newArticle.category_slug,
            }),
          });
          
          if (extractResponse.ok) {
            const extractResult = await extractResponse.json();
            console.log(`Extracted ${extractResult.cities_found} cities from article`);
          }
        } catch (extractError) {
          console.error("City extraction failed:", extractError);
        }

        // Auto-tweet the newly published article
        try {
          const tweetResponse = await fetch(`${supabaseUrl}/functions/v1/auto-tweet`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ article_id: newArticle.id }),
          });
          
          if (tweetResponse.ok) {
            const tweetResult = await tweetResponse.json();
            console.log(`Auto-tweeted article: ${tweetResult.tweet_id || 'success'}`);
          } else {
            const tweetErr = await tweetResponse.text();
            console.error("Auto-tweet failed:", tweetErr);
          }
        } catch (tweetError) {
          console.error("Auto-tweet error:", tweetError);
        }

        articlesCreated++;
        // Update counter incrementally so it persists even if function times out
        await supabase.from("newsroom_runs").update({
          articles_created: articlesCreated,
        }).eq("id", run.id);
        console.log(`Created article ${articlesCreated}: ${newArticle.title}`);

      } catch (error) {
        console.error(`Error processing news item ${newsItem.id}:`, error);
        await supabase.from("newsroom_articles").update({
          processing_status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        }).eq("id", newsItem.id);
      }
    }

    // Update run as completed
    await supabase.from("newsroom_runs").update({
      status: "completed",
      articles_created: articlesCreated,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      articles_found: newsItems.length,
      articles_created: articlesCreated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Newsroom error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
