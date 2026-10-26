import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://rscqxztgtpcifcqxjskh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3F4enRndHBjaWZjcXhqc2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjQyMDEsImV4cCI6MjEwODU0MDIwMX0.pAMIqM7uhLcOC0MWr9b9qV1mVHX234lICfQ6vwUq2nM';

export function createServerClient() {
  return createClient<Database, 'ghanacrimes'>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'ghanacrimes' },
    auth: { persistSession: false },
  });
}
