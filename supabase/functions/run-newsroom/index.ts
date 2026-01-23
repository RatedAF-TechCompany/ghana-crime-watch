import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWS_SOURCES = [
  { name: "Ghana Police Service", domain: "police.gov.gh" },
  { name: "Graphic Online", domain: "graphic.com.gh" },
  { name: "Citi Newsroom", domain: "citinewsroom.com" },
  { name: "GhanaWeb", domain: "ghanaweb.com" },
  { name: "Modern Ghana", domain: "modernghana.com" },
  { name: "MyJoyOnline", domain: "myjoyonline.com" },
  { name: "Starr FM", domain: "starrfm.com.gh" },
  { name: "Peace FM", domain: "peacefmonline.com" },
  { name: "GBC Ghana Online", domain: "gbcghanaonline.com" },
];

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

const IMAGE_STYLES = [
  'investigative-collage',
  'ink-watercolour',
  'newspaper-ink',
  'noir-illustration'
] as const;

const IMAGE_STYLE_PROMPTS: Record<string, string> = {
  'investigative-collage': 'Gritty split-frame investigative editorial collage, newspaper clippings aesthetic, Ghana Africa theme, no text no words, 16:9 aspect ratio, serious tone',
  'ink-watercolour': 'Minimalist hand-drawn ink and watercolor illustration, editorial art, muted earth tones, no text no words, 16:9 aspect ratio',
  'newspaper-ink': 'Classic newspaper editorial ink illustration, detailed crosshatching, vintage press aesthetic, no text no words, 16:9 aspect ratio',
  'noir-illustration': 'Dark moody crime noir illustration style, dramatic shadows, investigative journalism aesthetic, no text no words, 16:9 aspect ratio'
};

function getRandomImageStyle(): string {
  return IMAGE_STYLES[Math.floor(Math.random() * IMAGE_STYLES.length)];
}

// Image sourcing strategy types
type ImageStrategy = 'real_person' | 'real_place' | 'ai_enhanced' | 'ai_generated';

interface ImageAnalysis {
  strategy: ImageStrategy;
  subject_name?: string;
  subject_type?: 'politician' | 'celebrity' | 'public_figure' | 'location' | 'building' | 'event';
  search_query?: string;
  enhancement_prompt?: string;
}

// Analyze article to determine best image sourcing strategy
async function analyzeImageStrategy(
  headline: string,
  summary: string,
  body: string,
  lovableApiKey: string
): Promise<ImageAnalysis> {
  const analysisPrompt = `Analyze this news article and determine the best image sourcing strategy.

HEADLINE: ${headline}
SUMMARY: ${summary}

RULES:
1. If the article is primarily about a FAMOUS PERSON (politician, celebrity, public figure, business leader, sports star), return strategy "real_person" with their full name
2. If the article is about a SPECIFIC PLACE (landmark, government building, institution, city area), return strategy "real_place" with the location name
3. If the article references a generic scene that could use a stock-style photo enhanced by AI, return strategy "ai_enhanced"
4. Otherwise, return strategy "ai_generated" for full AI illustration

Famous Ghanaian figures include: politicians (current/former presidents, ministers, MPs), traditional rulers, celebrities, athletes, business leaders, etc.

Return ONLY valid JSON:
{
  "strategy": "real_person" | "real_place" | "ai_enhanced" | "ai_generated",
  "subject_name": "Full Name or Place Name if applicable",
  "subject_type": "politician" | "celebrity" | "public_figure" | "location" | "building" | "event" | null,
  "search_query": "Optimized search query to find image",
  "reasoning": "Brief explanation"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an image editor deciding how to source images for news articles. Return only valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.log("Image strategy analysis failed, defaulting to AI generated");
      return { strategy: 'ai_generated' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const analysis = JSON.parse(jsonMatch[1] || content);
    
    console.log(`Image strategy: ${analysis.strategy} for "${analysis.subject_name || 'N/A'}"`);
    return analysis;
  } catch (e) {
    console.error("Image strategy analysis error:", e);
    return { strategy: 'ai_generated' };
  }
}

// Search for real image using web search
async function searchForRealImage(
  searchQuery: string,
  subjectType: string | undefined,
  lovableApiKey: string
): Promise<string | null> {
  try {
    // Use AI to find image URLs from the web
    const searchPrompt = `Find a high-quality, recent, publicly available image of: ${searchQuery}

Requirements:
- Must be a real photograph (not illustration or AI-generated)
- Should be from a reputable news source, official website, or verified social media
- Image should be clear, professional quality
- For public figures: official portraits, press photos, or professional event photos preferred
- For places: clear daytime photos showing the location well

Return ONLY a JSON object with:
{
  "image_url": "direct URL to the image file (must end in .jpg, .png, .webp or be a direct image link)",
  "source": "where the image is from",
  "description": "brief description of the image",
  "found": true/false
}

If you cannot find a suitable real image, return: {"found": false}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a photo researcher finding real images for news articles. Return only valid JSON." },
          { role: "user", content: searchPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.log("Image search failed");
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const result = JSON.parse(jsonMatch[1] || content);
    
    if (result.found && result.image_url) {
      console.log(`Found real image: ${result.image_url} from ${result.source}`);
      return result.image_url;
    }
    
    return null;
  } catch (e) {
    console.error("Image search error:", e);
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

// Enhance an existing image using AI
async function enhanceImageWithAI(
  imageUrl: string,
  enhancementPrompt: string,
  articleSlug: string,
  supabase: any,
  lovableApiKey: string
): Promise<string | null> {
  try {
    console.log(`Enhancing image with AI: ${enhancementPrompt}`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Enhance this news photo: ${enhancementPrompt}. Improve lighting, clarity, and make it more impactful for editorial use. Keep it photorealistic.` },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });
    
    if (!response.ok) {
      console.log("Image enhancement failed");
      return null;
    }
    
    const data = await response.json();
    const base64Image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (base64Image && base64Image.startsWith("data:image")) {
      const base64Data = base64Image.split(",")[1];
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const imagePath = `newsroom/${articleSlug}-enhanced.png`;
      const { error: uploadError } = await supabase.storage
        .from("article-images")
        .upload(imagePath, imageBuffer, {
          contentType: "image/png",
          upsert: true
        });
      
      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from("article-images")
          .getPublicUrl(imagePath);
        console.log(`Uploaded enhanced image: ${publicUrl.publicUrl}`);
        return publicUrl.publicUrl;
      }
    }
    
    return null;
  } catch (e) {
    console.error("Image enhancement error:", e);
    return null;
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

    // Step 1: Use AI to search for Ghana crime news
    const sourcesList = NEWS_SOURCES.map(s => `${s.name} (${s.domain})`).join(", ");
    const searchPrompt = `You are a news aggregator assistant. Search for recent crime news from Ghana.
    
Look for news from these trusted Ghana news sources: ${sourcesList}.

Return a JSON array of 5-10 recent crime news items from Ghana. Each item should have:
- source_name: The news outlet name (must be one of: ${NEWS_SOURCES.map(s => s.name).join(", ")})
- original_headline: The headline
- original_summary: A brief 1-2 sentence summary
- source_url: A plausible URL from the source's domain (or null if unknown)
- category_hint: One of these categories that best fits: ${VALID_CATEGORIES.join(", ")}

Focus on REAL crime news topics like: murders, robberies, fraud cases, court proceedings, police operations, arrests, etc.

Return ONLY valid JSON array, no other text.`;

    const searchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful assistant that returns only valid JSON." },
          { role: "user", content: searchPrompt }
        ],
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("AI search error:", searchResponse.status, errorText);
      
      if (searchResponse.status === 429) {
        await supabase.from("newsroom_runs").update({
          status: "failed",
          error_message: "Rate limit exceeded. Please try again later.",
          completed_at: new Date().toISOString(),
        }).eq("id", run.id);
        
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const newsContent = searchData.choices?.[0]?.message?.content || "[]";
    
    // Parse the news items
    let newsItems: any[] = [];
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = newsContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, newsContent];
      newsItems = JSON.parse(jsonMatch[1] || newsContent);
    } catch (e) {
      console.error("Failed to parse news items:", e, newsContent);
      newsItems = [];
    }

    console.log(`Found ${newsItems.length} news items`);

    if (newsItems.length === 0) {
      await supabase.from("newsroom_runs").update({
        status: "no_news",
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

    // Filter out duplicates BEFORE making AI calls
    const uniqueNewsItems = newsItems.filter(item => {
      const headline = item.original_headline || item.headline || "";
      return !isDuplicateHeadline(headline);
    });

    const skippedDuplicates = newsItems.length - uniqueNewsItems.length;
    console.log(`Duplicate check: ${skippedDuplicates} duplicates skipped, ${uniqueNewsItems.length} unique items to process`);

    // Insert only unique news items as pending
    const newsRecords = uniqueNewsItems.map(item => ({
      run_id: run.id,
      source_name: item.source_name || "Unknown",
      original_headline: item.original_headline || item.headline || "Untitled",
      original_summary: item.original_summary || item.summary || "",
      source_url: item.source_url || null,
      processing_status: "pending",
    }));

    // Also insert skipped duplicates with status
    const duplicateRecords = newsItems
      .filter(item => isDuplicateHeadline(item.original_headline || item.headline || ""))
      .map(item => ({
        run_id: run.id,
        source_name: item.source_name || "Unknown",
        original_headline: item.original_headline || item.headline || "Untitled",
        original_summary: item.original_summary || item.summary || "",
        source_url: item.source_url || null,
        processing_status: "duplicate",
      }));

    // Insert all records
    const { data: insertedNews, error: insertError } = await supabase
      .from("newsroom_articles")
      .insert([...newsRecords, ...duplicateRecords])
      .select();

    if (insertError) {
      console.error("Failed to insert news items:", insertError);
    }

    // Update articles found count
    await supabase.from("newsroom_runs").update({
      articles_found: newsItems.length,
    }).eq("id", run.id);

    // Step 3: Process only unique (non-duplicate) items
    let articlesCreated = 0;
    const pendingItems = (insertedNews || []).filter(item => item.processing_status === "pending");

    for (const newsItem of pendingItems) {
      try {
        // Update status to processing
        await supabase.from("newsroom_articles").update({
          processing_status: "processing",
        }).eq("id", newsItem.id);

        // Generate full article using AI
        const articlePrompt = `You are the GhanaCrimes automated newsroom editor.

You will be given an ORIGINAL NEWS ITEM with three fields: original_headline, original_summary, and source_name.

Before writing, you must do a live verification scan across the web using the original_headline and key names and places from the original_summary. Use multiple reputable sources such as the original outlet plus at least two other credible outlets or official statements where available. Prefer primary sources like police statements, court records, official releases, and direct quotes. If you cannot independently verify a detail, you must say it is unconfirmed and attribute it to the original source.

You must be specific with names, dates, locations, agencies, charges, court names, bail terms, and seized items when verified. If sources disagree, reflect the disagreement and attribute each version to its source. Do not speculate.

ORIGINAL NEWS ITEM:
Headline: ${newsItem.original_headline}
Summary: ${newsItem.original_summary}
Source: ${newsItem.source_name}

WRITING RULES:
- Do NOT use colons or long dashes.
- Do NOT use bullet points, emojis, or hashtags.
- Do NOT add links or URLs.
- Write factually, neutrally, and professionally.
- Respect presumption of innocence and use "alleged" or "suspected" appropriately.
- If details are unconfirmed, state so clearly.
- Do not invent names, figures, dates, or quotes.
- When referencing sources, name them plainly in text such as "Ghana Police Service statement", "High Court filing", "GhanaWeb report", "Citi Newsroom report", "Reuters report". Do not include URLs.

FIELDS TO GENERATE:
1. headline: Short, factual, max 80 characters.
2. subtitle: Expands headline in one sentence.
3. summary: Plain English, max 400 characters.
4. body: 4 to 8 HTML paragraphs using <p> tags. Include source attribution inside the paragraphs by naming outlets or official bodies. No links.
5. seo_description: Max 155 characters.
6. slug: Lowercase with hyphens.
7. section: Choose from: ${VALID_CATEGORIES.join(", ")}.
8. tags: Array of keywords including locations, crime types, agencies, key names.
9. image_prompt: Visual metaphor for the story, max 50 words. No text overlays. No logos. No identifiable private persons.

Return ONLY valid JSON with these exact keys:
{
  "headline": "...",
  "subtitle": "...",
  "summary": "...",
  "body": "<p>...</p>",
  "seo_description": "...",
  "slug": "...",
  "section": "...",
  "tags": ["tag1", "tag2"],
  "image_prompt": "..."
}`;

        const articleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a professional crime journalist and fact-checker. You verify information across multiple sources before writing. Return only valid JSON. Never use colons, dashes, bullet points, or emojis in your writing. Always attribute claims to their sources." },
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

        // Use AI-generated slug or create from headline
        const slugBase = (articleJson.slug || articleJson.headline || "article")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 80);

        const articleSlug = `${slugBase}-${Date.now()}`;

        // Smart image sourcing - prioritize real images for famous people and places
        let heroImageUrl: string | null = null;
        let imageSourceType: string = 'ai_generated';
        
        try {
          // Analyze what image strategy to use
          const imageAnalysis = await analyzeImageStrategy(
            articleJson.headline,
            articleJson.summary || newsItem.original_summary,
            articleJson.body,
            lovableApiKey
          );
          
          imageSourceType = imageAnalysis.strategy;
          
          if (imageAnalysis.strategy === 'real_person' || imageAnalysis.strategy === 'real_place') {
            // Try to find and download a real image
            console.log(`Searching for real image: ${imageAnalysis.search_query}`);
            const realImageUrl = await searchForRealImage(
              imageAnalysis.search_query || imageAnalysis.subject_name || articleJson.headline,
              imageAnalysis.subject_type,
              lovableApiKey
            );
            
            if (realImageUrl) {
              heroImageUrl = await downloadAndUploadImage(realImageUrl, articleSlug, supabase);
              if (heroImageUrl) {
                console.log(`Successfully sourced real image for: ${imageAnalysis.subject_name}`);
              }
            }
          } else if (imageAnalysis.strategy === 'ai_enhanced') {
            // Find a base image and enhance it
            const baseImageUrl = await searchForRealImage(
              imageAnalysis.search_query || articleJson.headline,
              imageAnalysis.subject_type,
              lovableApiKey
            );
            
            if (baseImageUrl) {
              heroImageUrl = await enhanceImageWithAI(
                baseImageUrl,
                imageAnalysis.enhancement_prompt || `News photo about ${articleJson.headline}`,
                articleSlug,
                supabase,
                lovableApiKey
              );
            }
          }
          
          // Fallback to AI-generated illustration if no real image found
          if (!heroImageUrl) {
            console.log("Falling back to AI-generated image");
            imageSourceType = 'ai_generated';
            
            const imageStyle = getRandomImageStyle();
            const stylePrompt = IMAGE_STYLE_PROMPTS[imageStyle];
            const aiImagePrompt = articleJson.image_prompt || `Crime news about ${articleJson.headline}`;
            const imagePrompt = `${stylePrompt}. ${aiImagePrompt}. Ghana Africa setting.`;
            
            console.log(`Generating AI image with style: ${imageStyle}`);
            
            const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image-preview",
                messages: [
                  { role: "user", content: imagePrompt }
                ],
                modalities: ["image", "text"]
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

              if (base64Image && base64Image.startsWith("data:image")) {
                const base64Data = base64Image.split(",")[1];
                const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                const imagePath = `newsroom/${articleSlug}.png`;
                const { error: uploadError } = await supabase.storage
                  .from("article-images")
                  .upload(imagePath, imageBuffer, {
                    contentType: "image/png",
                    upsert: true
                  });

                if (!uploadError) {
                  const { data: publicUrl } = supabase.storage
                    .from("article-images")
                    .getPublicUrl(imagePath);
                  heroImageUrl = publicUrl.publicUrl;
                  console.log(`Uploaded AI image: ${heroImageUrl}`);
                } else {
                  console.error("Image upload failed:", uploadError);
                }
              }
            } else {
              console.error("AI image generation failed:", imageResponse.status);
            }
          }
        } catch (imgError) {
          console.error("Image sourcing error:", imgError);
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

        articlesCreated++;
        console.log(`Created article: ${newArticle.title}`);

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
