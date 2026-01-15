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
];

const VALID_CATEGORIES = [
  "breaking-news", "investigations", "court-cases", "police-reports",
  "fraud-scams", "cybercrime", "violent-crime", "theft-robbery",
  "drug-offenses", "corruption", "public-safety", "community-watch"
];

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

        // Generate editorial image using AI-generated prompt combined with style
        const imageStyle = getRandomImageStyle();
        const stylePrompt = IMAGE_STYLE_PROMPTS[imageStyle];
        const aiImagePrompt = articleJson.image_prompt || `Crime news about ${articleJson.headline}`;
        const imagePrompt = `${stylePrompt}. ${aiImagePrompt}. Ghana Africa setting.`;

        console.log(`Generating image with style: ${imageStyle}`);

        let heroImageUrl: string | null = null;

        try {
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
              // Extract base64 data
              const base64Data = base64Image.split(",")[1];
              const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

              // Upload to Supabase Storage
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
                console.log(`Uploaded image: ${heroImageUrl}`);
              } else {
                console.error("Image upload failed:", uploadError);
              }
            }
          } else {
            console.error("Image generation failed:", imageResponse.status);
          }
        } catch (imgError) {
          console.error("Image generation error:", imgError);
        }

        // Update newsroom article with image style
        await supabase.from("newsroom_articles").update({
          image_style: imageStyle,
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
            category_slug: articleJson.section || "police-reports",
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
