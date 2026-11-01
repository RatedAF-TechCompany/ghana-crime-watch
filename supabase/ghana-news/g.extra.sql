create table if not exists ghanacrimes.corrections (
  article_id uuid not null,
  created_at timestamptz not null default now(),
  created_by text,
  id uuid primary key default gen_random_uuid(),
  note text not null);
alter table ghanacrimes.corrections enable row level security;
create table if not exists ghanacrimes.pipeline_runs (
  error text,
  finished_at timestamptz,
  id uuid primary key default gen_random_uuid(),
  kind text not null default '',
  started_at timestamptz not null default now(),
  stats jsonb not null default '{}'::jsonb,
  status text not null default '');
alter table ghanacrimes.pipeline_runs enable row level security;
create table if not exists ghanacrimes.raw_items (
  article_id uuid,
  attempts numeric not null default 0,
  fetched_at timestamptz not null default now(),
  gate_report jsonb,
  hash text not null,
  id uuid primary key default gen_random_uuid(),
  published_at timestamptz,
  reason text,
  source_id uuid not null,
  status text not null default '',
  summary text,
  thread_id uuid,
  title text not null,
  url text not null,
  url_hash text not null);
alter table ghanacrimes.raw_items enable row level security;
alter table ghanacrimes.articles add column if not exists case_status text;
alter table ghanacrimes.articles add column if not exists content_updated_at timestamptz;
alter table ghanacrimes.articles add column if not exists gate_report jsonb;
alter table ghanacrimes.articles add column if not exists offence_type text;
alter table ghanacrimes.articles add column if not exists region text;
alter table ghanacrimes.articles add column if not exists source_urls text[];
alter table ghanacrimes.articles add column if not exists status text;
alter table ghanacrimes.sources add column if not exists api_url text;
alter table ghanacrimes.sources add column if not exists consecutive_failures numeric;
alter table ghanacrimes.sources add column if not exists feed_url text;
alter table ghanacrimes.sources add column if not exists html_url text;
alter table ghanacrimes.sources add column if not exists last_polled_at timestamptz;
alter table ghanacrimes.sources add column if not exists last_status text;
alter table ghanacrimes.sources add column if not exists poll_minutes numeric;
alter table ghanacrimes.sources add column if not exists trust_tier numeric;
alter table ghanacrimes.sources add column if not exists type text;
alter table ghanacrimes.story_threads add column if not exists content_updated_at timestamptz;
