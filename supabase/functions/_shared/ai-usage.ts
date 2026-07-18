// Shared Lovable AI Gateway wrapper: JSON-mode enforced, max_tokens/temperature discipline,
// usage tracking, and typed 402/429 errors so callers can fail safely.

// Gemini 2.5 Flash-Lite pricing (USD per 1M tokens) — used for on-run cost visibility only.
const PRICE_INPUT_PER_M = 0.10;
const PRICE_OUTPUT_PER_M = 0.40;

export interface AiUsage {
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost: number; // USD
}

export function newUsage(): AiUsage {
  return { calls: 0, prompt_tokens: 0, completion_tokens: 0, estimated_cost: 0 };
}

export class AiCreditError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AiCreditError";
  }
}

export interface CallOpts {
  system: string;
  user: string;
  max_tokens: number;
  temperature?: number;
  json?: boolean; // request response_format json_object
  tools?: any[];  // e.g. google_search grounding
  retryOn429?: boolean; // default true
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call Lovable AI Gateway with cost discipline.
 * Throws AiCreditError on 402 (credits exhausted) or persistent 429 (rate limited) —
 * callers should stop processing further items and exit cleanly, keeping pending items pending.
 */
export async function callGateway(
  apiKey: string,
  usage: AiUsage,
  opts: CallOpts,
): Promise<{ content: string; raw: any }> {
  const body: any = {
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.max_tokens,
    temperature: typeof opts.temperature === "number" ? opts.temperature : 0.2,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.tools) body.tools = opts.tools;

  const retryOn429 = opts.retryOn429 !== false;
  const attempts = retryOn429 ? 2 : 1;
  let lastErr = "";

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt); // simple backoff

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.status === 402) {
      throw new AiCreditError(402, "AI credits exhausted (402) — stopping run to preserve pending items");
    }
    if (r.status === 429) {
      lastErr = `rate_limited_429`;
      if (attempt < attempts - 1) continue;
      throw new AiCreditError(429, "AI rate limited (429) after retries — stopping run to preserve pending items");
    }
    if (!r.ok) {
      lastErr = `http_${r.status}: ${(await r.text()).slice(0, 200)}`;
      throw new Error(`gateway ${lastErr}`);
    }

    const data = await r.json();
    const u = data.usage || {};
    const pt = Number(u.prompt_tokens || 0);
    const ct = Number(u.completion_tokens || 0);
    usage.calls += 1;
    usage.prompt_tokens += pt;
    usage.completion_tokens += ct;
    usage.estimated_cost += (pt / 1_000_000) * PRICE_INPUT_PER_M + (ct / 1_000_000) * PRICE_OUTPUT_PER_M;

    const content = data.choices?.[0]?.message?.content ?? "";
    return { content, raw: data };
  }

  throw new Error(`gateway failed: ${lastErr}`);
}

/** Parse strict JSON output. Trims accidental ```json fences if present. */
export function parseJson<T = any>(content: string): T {
  const trimmed = (content || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : trimmed;
  return JSON.parse(raw);
}
