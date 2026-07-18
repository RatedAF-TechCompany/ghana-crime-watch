import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runTweetIngest } from "../_shared/tweet-ingest.ts";

serve((req) => runTweetIngest(req, {
  username: "GhanaWeb",
  sourceKey: "ghanaweb",
  sourceLabel: "GhanaWeb",
  headlineRule: "Compelling headline under 100 chars, written as a normal English sentence",
}));
