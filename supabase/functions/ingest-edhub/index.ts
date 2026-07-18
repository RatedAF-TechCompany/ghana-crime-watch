import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runTweetIngest } from "../_shared/tweet-ingest.ts";

serve((req) => runTweetIngest(req, {
  username: "eddie_wrt",
  sourceKey: "edhub",
  sourceLabel: "EDHUB",
  headlineRule: "Compelling headline under 100 chars, hook-style: Authority/Number/Event + Action + Subject + Location",
  extraPromptRule: "Headline must follow HOOK + ACTION + CRIME/EVENT + LOCATION pattern",
}));
