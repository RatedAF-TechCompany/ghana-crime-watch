import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Scheduled newsroom trigger started");

    // Fire the main newsroom function but don't wait for full completion
    // Use AbortController with a generous timeout to avoid the scheduled function timing out
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/run-newsroom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ trigger_type: "scheduled" }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        console.error("Newsroom run failed:", result);
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error || "Newsroom run failed" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Scheduled newsroom run completed:", result);

      return new Response(JSON.stringify({
        success: true,
        message: "Scheduled newsroom run completed",
        ...result,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        // The run-newsroom function is still executing, it just exceeded our wait time
        // The stale run cleanup will handle it if it truly stalls
        console.log("Newsroom run still in progress (exceeded wait time) — it will continue in background");
        return new Response(JSON.stringify({
          success: true,
          message: "Newsroom run triggered and still in progress",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw fetchError;
    }

  } catch (error) {
    console.error("Scheduled newsroom error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
