import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      throw subError;
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("No active subscribers found");
      return new Response(
        JSON.stringify({ message: "No subscribers to send to", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscribers.length} active subscribers`);

    // Get top 5 articles from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: articles, error: artError } = await supabase
      .from("articles")
      .select("id, title, summary, category_slug, article_slug, hero_image, published_at")
      .eq("is_published", true)
      .gte("published_at", yesterday.toISOString())
      .order("view_count", { ascending: false })
      .limit(5);

    if (artError) {
      console.error("Error fetching articles:", artError);
      throw artError;
    }

    if (!articles || articles.length === 0) {
      console.log("No articles from last 24 hours");
      return new Response(
        JSON.stringify({ message: "No recent articles to share", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${articles.length} articles to share`);

    // Build email HTML
    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const articleHtml = articles.map((article, index) => `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #e5e5e5;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top; padding-right: 15px;">
                <span style="display: inline-block; width: 28px; height: 28px; background-color: #9A0044; color: white; font-weight: bold; text-align: center; line-height: 28px; border-radius: 4px;">${index + 1}</span>
              </td>
              <td style="vertical-align: top;">
                <a href="https://ghanacrimes.com/${article.category_slug}/${article.article_slug}" style="color: #000; text-decoration: none;">
                  <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; line-height: 1.3;">${article.title}</h3>
                </a>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">${article.summary}</p>
                <a href="https://ghanacrimes.com/${article.category_slug}/${article.article_slug}" style="display: inline-block; margin-top: 10px; color: #9A0044; font-size: 14px; font-weight: 500; text-decoration: none;">Read full story →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F1E1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F7F1E1; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #9A0044; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">GhanaCrimes</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Daily Crime Digest</p>
            </td>
          </tr>
          
          <!-- Date -->
          <tr>
            <td style="padding: 20px 24px 0 24px;">
              <p style="margin: 0; color: #666; font-size: 14px;">${today}</p>
              <h2 style="margin: 8px 0 0 0; color: #000; font-size: 22px; font-weight: 600;">Today's Top Stories</h2>
            </td>
          </tr>
          
          <!-- Articles -->
          <tr>
            <td style="padding: 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${articleHtml}
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <a href="https://ghanacrimes.com" style="display: inline-block; background-color: #9A0044; color: white; padding: 12px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 6px;">Visit GhanaCrimes</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #666; font-size: 12px;">You're receiving this because you subscribed to GhanaCrimes Daily Digest.</p>
              <p style="margin: 0; color: #999; font-size: 12px;">© ${new Date().getFullYear()} GhanaCrimes. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send emails via Resend
    const emails = subscribers.map((sub) => sub.email);
    
    console.log(`Sending digest to ${emails.length} subscribers`);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GhanaCrimes <digest@ghanacrimes.com>",
        to: emails,
        subject: `🚨 Daily Crime Digest - ${today}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      throw new Error(resendData.message || "Failed to send emails");
    }

    console.log("Emails sent successfully:", resendData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: emails.length,
        articles: articles.length,
        resendId: resendData.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Newsletter digest error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send newsletter";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
