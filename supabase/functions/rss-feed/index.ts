import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/rss+xml; charset=utf-8",
};

const SITE_URL = "https://ghanacrimes.com";
const SITE_TITLE = "GhanaCrimes";
const SITE_DESCRIPTION = "Latest crime news and reports from Ghana";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRFC822Date(dateString: string): string {
  const date = new Date(dateString);
  return date.toUTCString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch latest published articles
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, title, summary, article_slug, category_slug, published_at, hero_image, tags")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching articles:", error);
      throw error;
    }

    const now = new Date().toUTCString();
    
    const rssItems = (articles || []).map((article) => {
      const articleUrl = `${SITE_URL}/${article.category_slug}/${article.article_slug}`;
      const pubDate = article.published_at ? formatRFC822Date(article.published_at) : now;
      const categories = article.tags?.map((tag: string) => `<category>${escapeXml(tag)}</category>`).join("\n        ") || "";
      
      return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <description>${escapeXml(article.summary)}</description>
      <pubDate>${pubDate}</pubDate>
      ${article.hero_image ? `<enclosure url="${escapeXml(article.hero_image)}" type="image/jpeg" />` : ""}
      ${categories}
    </item>`;
    }).join("");

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en-gh</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rssFeed, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("RSS feed error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title></channel></rss>`,
      { status: 500, headers: corsHeaders }
    );
  }
});
