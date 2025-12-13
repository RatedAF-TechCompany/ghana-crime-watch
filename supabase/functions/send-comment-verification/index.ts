import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  articleId: string;
  commenterName: string;
  commenterEmail: string;
  commentText: string;
  ipAddress?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { articleId, commenterName, commenterEmail, commentText, ipAddress }: VerificationRequest = await req.json();

    // Validate inputs
    if (!articleId || !commenterName || !commenterEmail || !commentText) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check pending codes per email/IP in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: pendingCount } = await supabase
      .from("verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", commenterEmail)
      .eq("used", false)
      .gte("created_at", oneHourAgo);

    if (pendingCount && pendingCount >= 5) {
      console.log("Rate limit exceeded for email:", commenterEmail);
      return new Response(
        JSON.stringify({ error: "Too many verification requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = new Date(Date.now() + 20 * 60 * 1000).toISOString(); // 20 minutes

    // Store verification code
    const { error: insertError } = await supabase
      .from("verification_codes")
      .insert({
        article_id: articleId,
        code,
        commenter_name: commenterName,
        comment_text: commentText,
        email: commenterEmail,
        expire_at: expireAt,
        ip_address: ipAddress || null,
      });

    if (insertError) {
      console.error("Error storing verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send verification email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GhanaCrimes <onboarding@resend.dev>",
        to: [commenterEmail],
        subject: "Verify your comment on GhanaCrimes",
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #9A0044; font-size: 24px;">Verify Your Comment</h1>
            <p>Hello ${commenterName},</p>
            <p>Your verification code is:</p>
            <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code expires in 20 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">GhanaCrimes</p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Verification email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-comment-verification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
