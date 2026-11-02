-- Typo-tolerant full-text search (FTS + pg_trgm) for published articles. Additive only.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function ghanacrimes.search_articles(q text, lim int default 30)
returns table(id uuid, title text, summary text, category_slug text, article_slug text, published_at timestamptz, rank real)
language sql stable security definer set search_path = ghanacrimes, public, extensions as $$
  with t as (select left(trim(regexp_replace(coalesce(q,''), '[,;()]+', ' ', 'g')), 100) as q)
  select a.id, a.title, a.summary, a.category_slug, a.article_slug, a.published_at,
    (ts_rank(to_tsvector('english', coalesce(a.title,'')||' '||coalesce(a.summary,'')), websearch_to_tsquery('english', t.q)) * 2
     + word_similarity(t.q, a.title))::real as rank
  from ghanacrimes.articles a, t
  where a.is_published and length(t.q) >= 2 and (
    to_tsvector('english', coalesce(a.title,'')||' '||coalesce(a.summary,'')||' '||coalesce(a.body,'')) @@ websearch_to_tsquery('english', t.q)
    or (select bool_and(w <% (coalesce(a.title,'')||' '||coalesce(a.summary,'')))
        from unnest(regexp_split_to_array(lower(t.q), '\s+')) w where length(w) >= 3))
  order by rank desc, a.published_at desc
  limit least(greatest(lim,1),50);
$$;

create or replace function ghanacrimes.search_suggest(q text)
returns table(title text, category_slug text, article_slug text)
language sql stable security definer set search_path = ghanacrimes, public, extensions as $$
  select a.title, a.category_slug, a.article_slug from ghanacrimes.articles a
  where a.is_published and length(trim(q)) >= 2 and (a.title ilike '%'||replace(replace(trim(q),'%',''),'_','')||'%' or trim(q) <% a.title)
  order by word_similarity(trim(q), a.title) desc, a.published_at desc limit 8;
$$;

grant execute on function ghanacrimes.search_articles(text,int) to anon, authenticated;
grant execute on function ghanacrimes.search_suggest(text) to anon, authenticated;
