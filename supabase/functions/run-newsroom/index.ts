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

    // Insert news items as pending
    const newsRecords = newsItems.map(item => ({
      run_id: run.id,
      source_name: item.source_name || "Unknown",
      original_headline: item.original_headline || item.headline || "Untitled",
      original_summary: item.original_summary || item.summary || "",
      source_url: item.source_url || null,
      processing_status: "pending",
    }));

    const { data: insertedNews, error: insertError } = await supabase
      .from("newsroom_articles")
      .insert(newsRecords)
      .select();

    if (insertError) {
      console.error("Failed to insert news items:", insertError);
    }

    // Update articles found count
    await supabase.from("newsroom_runs").update({
      articles_found: newsItems.length,
    }).eq("id", run.id);

    // Step 2: Check for duplicates and process each item
    let articlesCreated = 0;

    for (const newsItem of insertedNews || []) {
      try {
        // Update status to processing
        await supabase.from("newsroom_articles").update({
          processing_status: "processing",
        }).eq("id", newsItem.id);

        // Check for duplicate headlines
        const { data: existingArticle } = await supabase
          .from("articles")
          .select("id")
          .ilike("title", `%${newsItem.original_headline.substring(0, 50)}%`)
          .limit(1);

        if (existingArticle && existingArticle.length > 0) {
          await supabase.from("newsroom_articles").update({
            processing_status: "duplicate",
          }).eq("id", newsItem.id);
          continue;
        }

        // Generate full article using AI
        const articlePrompt = `You are a professional crime journalist for GhanaCrimes, a news website covering crime in Ghana.

Based on this news item, write an original, detailed news article:

Headline: ${newsItem.original_headline}
Summary: ${newsItem.original_summary}
Source: ${newsItem.source_name}

Write the article with:
1. A compelling, SEO-friendly title (different from the original)
2. A subtitle (one sentence)
3. A summary (2-3 sentences for the article preview)
4. Full article body in HTML format (3-5 paragraphs, well-researched tone)
5. 3-5 relevant tags
6. SEO meta description (under 160 characters)
7. Suggested category from: ${VALID_CATEGORIES.join(", ")}

Return as JSON with these exact keys:
{
  "title": "...",
  "subtitle": "...",
  "summary": "...",
  "body": "<p>...</p>",
  "tags": ["tag1", "tag2"],
  "seo_description": "...",
  "category_slug": "..."
}

Write in a professional journalistic style. Be factual and objective. Do not fabricate specific names, dates, or locations not mentioned in the original.`;

        const articleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a professional journalist. Return only valid JSON." },
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

        // Generate slug
        const slug = articleJson.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 80);

        const articleSlug = `${slug}-${Date.now()}`;

        // Generate editorial image
        const imageStyle = getRandomImageStyle();
        const stylePrompt = IMAGE_STYLE_PROMPTS[imageStyle];
        const imagePrompt = `${stylePrompt}. Topic: ${articleJson.title}. Crime news editorial illustration for Ghana news website.`;

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

        // Insert the article
        const { data: newArticle, error: articleError } = await supabase
          .from("articles")
          .insert({
            title: articleJson.title,
            subtitle: articleJson.subtitle,
            summary: articleJson.summary,
            body: articleJson.body,
            slug: articleSlug,
            category_slug: articleJson.category_slug || "police-reports",
            author: "GhanaCrimes Newsroom",
            tags: articleJson.tags || [],
            seo_title: articleJson.title,
            seo_description: articleJson.seo_description,
            hero_image_url: heroImageUrl,
            is_published: false, // Save as draft
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
