import { createClient as baseCreateClient } from "npm:@supabase/supabase-js@2";
// GhanaCrimes tables live in the "ghanacrimes" schema of the shared ghana-news project.
export const DB_SCHEMA = Deno.env.get("GC_DB_SCHEMA") ?? "ghanacrimes";
// deno-lint-ignore no-explicit-any
export function createClient(url: string, key: string, opts: any = {}): any {
  return baseCreateClient(url, key, { ...opts, db: { schema: DB_SCHEMA, ...(opts.db ?? {}) } });
}
