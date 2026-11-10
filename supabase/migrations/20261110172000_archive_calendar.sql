-- Public news archive: published-story counts by Africa/Accra calendar day.
-- Additive only. Does not update or delete articles.
--
-- Ghana (Africa/Accra) is GMT year-round, so a day's UTC bounds match the
-- publication date. Day pages query published_at with the partial index below.
-- The calendar function groups in SQL so the index page does not page every row.

create index if not exists idx_articles_archive_published_at
  on ghanacrimes.articles (published_at desc)
  where is_published and published_at is not null;

create or replace function ghanacrimes.archive_calendar()
returns jsonb
language sql
stable
security invoker
set search_path = ghanacrimes, public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'date', to_char(d, 'YYYY-MM-DD'),
          'count', article_count,
          'last_published_at', last_published_at
        )
        order by d desc
      )
      from (
        select
          (a.published_at at time zone 'Africa/Accra')::date as d,
          count(*)::int as article_count,
          max(a.published_at) as last_published_at
        from ghanacrimes.articles a
        where a.is_published
          and a.published_at is not null
        group by 1
      ) days
    ),
    '[]'::jsonb
  );
$$;

comment on function ghanacrimes.archive_calendar() is
  'Published-article counts by Africa/Accra (GMT) calendar day for /archive.';

grant execute on function ghanacrimes.archive_calendar() to anon, authenticated, service_role;
