import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Common Ghanaian names - mix of Akan, Ewe, Ga, and other ethnic groups
const GHANAIAN_FIRST_NAMES = [
  // Male names
  "Kwame", "Kofi", "Kwesi", "Yaw", "Kwaku", "Kojo", "Kwabena", "Akwasi",
  "Nana", "Osei", "Mensah", "Ebo", "Koku", "Edem", "Senyo", "Dela",
  "Nii", "Tetteh", "Nii Armah", "Ofori", "Asante", "Baffour", "Opoku",
  // Female names
  "Ama", "Akua", "Yaa", "Afia", "Adwoa", "Akosua", "Efua", "Abena",
  "Adjoa", "Esi", "Araba", "Ekua", "Afua", "Naana", "Maame", "Awo",
  "Dzifa", "Sena", "Afi", "Mawusi", "Selasi", "Serwaa", "Abenaa"
];

const GHANAIAN_LAST_NAMES = [
  "Mensah", "Asante", "Osei", "Boateng", "Agyemang", "Owusu", "Amoah",
  "Appiah", "Bonsu", "Danso", "Frimpong", "Gyamfi", "Kumi", "Nkrumah",
  "Ofori", "Quartey", "Sackey", "Tetteh", "Adu", "Addo", "Annan",
  "Darko", "Amponsah", "Asamoah", "Badu", "Quaye", "Lartey", "Oduro",
  "Afriyie", "Amankwah", "Oppong", "Sarpong", "Yeboah", "Adjei"
];

// Comment templates that feel organic - will be enhanced by AI
const COMMENT_STYLES = [
  "reaction", // Short reaction to the news
  "question", // Asks a follow-up question
  "opinion", // Shares an opinion
  "concern", // Expresses concern about the issue
  "local_context", // Adds local context or experience
  "call_to_action" // Suggests what should be done
];

function getRandomName(): string {
  const firstName = GHANAIAN_FIRST_NAMES[Math.floor(Math.random() * GHANAIAN_FIRST_NAMES.length)];
  const lastName = GHANAIAN_LAST_NAMES[Math.floor(Math.random() * GHANAIAN_LAST_NAMES.length)];
  
  // 60% chance to use full name, 40% chance to use first name only (more casual)
  if (Math.random() < 0.6) {
    return `${firstName} ${lastName}`;
  }
  return firstName;
}

function getRandomStyle(): string {
  return COMMENT_STYLES[Math.floor(Math.random() * COMMENT_STYLES.length)];
}

async function generateComment(
  article: { title: string; summary: string; body: string; category_slug: string },
  style: string,
  lovableApiKey: string
): Promise<string> {
  const prompt = `You are a Ghanaian reader commenting on a news article. Write a single, authentic comment as if you're a regular person reacting to this news.

Article Title: ${article.title}
Article Summary: ${article.summary}
Category: ${article.category_slug}

Comment style to use: ${style}

Style guidelines:
- "reaction": Short 1-2 sentence reaction (e.g., "This is troubling news.", "Finally some action!")
- "question": Ask a relevant follow-up question about the case/situation
- "opinion": Share a brief opinion on what happened or what should happen
- "concern": Express concern about the issue or its implications
- "local_context": Reference being from Ghana or knowing the area (if location mentioned)
- "call_to_action": Suggest what authorities or people should do

CRITICAL RULES:
- Write 1-3 sentences MAX
- Use casual, conversational Ghanaian English (can include phrases like "eiiii", "chai", "hmm", "Herh", "chale" sparingly)
- Do NOT use emojis
- Do NOT use hashtags
- Do NOT be overly formal or journalistic
- Sound like a real person scrolling through news on their phone
- Can be slightly informal with grammar (like real comments)
- Reference specific details from the article to seem genuine

Return ONLY the comment text, nothing else.`;

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9, // Higher temperature for variety
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  return result.choices[0].message.content.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Auto-comment job started");

    // Strategy 1: Find articles published 25-40 minutes ago with 0 comments
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    const twentyFiveMinutesAgo = new Date(Date.now() - 25 * 60 * 1000).toISOString();

    const { data: recentArticles, error: recentError } = await supabase
      .from("articles")
      .select("id, title, summary, body, category_slug")
      .eq("is_published", true)
      .gte("published_at", fortyMinutesAgo)
      .lte("published_at", twentyFiveMinutesAgo)
      .limit(5);

    if (recentError) {
      console.error("Error fetching recent articles:", recentError);
      throw recentError;
    }

    let commentsAdded = 0;

    // Check each recent article for comments
    for (const article of recentArticles || []) {
      const { count } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("article_id", article.id);

      if (count === 0) {
        // No comments yet - add one
        const style = getRandomStyle();
        const comment = await generateComment(article, style, lovableApiKey);
        const name = getRandomName();

        const { error: insertError } = await supabase.from("comments").insert({
          article_id: article.id,
          commenter_name: name,
          comment_text: comment,
          is_verified: true,
          is_approved: true,
        });

        if (insertError) {
          console.error(`Error adding comment to article ${article.id}:`, insertError);
        } else {
          console.log(`Added first comment to "${article.title}" by ${name}`);
          commentsAdded++;
        }
      }
    }

    // Strategy 2: Find articles from last 6 hours with only 1 comment (the auto one)
    // Add a second comment to ~30% of them for variety
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: olderArticles, error: olderError } = await supabase
      .from("articles")
      .select("id, title, summary, body, category_slug")
      .eq("is_published", true)
      .gte("published_at", sixHoursAgo)
      .lte("published_at", oneHourAgo)
      .limit(10);

    if (!olderError && olderArticles) {
      for (const article of olderArticles) {
        // 30% chance to check this article
        if (Math.random() > 0.3) continue;

        const { count } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("article_id", article.id);

        // Only add if there's exactly 1 comment (likely our auto-comment)
        if (count === 1) {
          const style = getRandomStyle();
          const comment = await generateComment(article, style, lovableApiKey);
          const name = getRandomName();

          const { error: insertError } = await supabase.from("comments").insert({
            article_id: article.id,
            commenter_name: name,
            comment_text: comment,
            is_verified: true,
            is_approved: true,
          });

          if (!insertError) {
            console.log(`Added second comment to "${article.title}" by ${name}`);
            commentsAdded++;
          }
        }
      }
    }

    console.log(`Auto-comment job completed. Added ${commentsAdded} comments.`);

    return new Response(
      JSON.stringify({
        success: true,
        comments_added: commentsAdded,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auto-comment error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
