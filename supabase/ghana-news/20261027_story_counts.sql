-- One cheap query for /statistics, /map and /regions instead of ~25 count requests per render.
create or replace function ghanacrimes.story_counts(since timestamptz, topics jsonb default '{}'::jsonb)
returns jsonb language sql stable security invoker set search_path = ghanacrimes, public as $$
  with a as (
    select id, title, coalesce(region,'') region, coalesce(offence_type,'') offence_type, coalesce(case_status,'') case_status
    from ghanacrimes.articles
    where is_published and published_at >= since and category_slug not in ('crime-statistics','most-wanted')
  ), t as (
    select k.key slug, a.id, a.region, a.offence_type
    from jsonb_each(topics) k cross join a
    where exists (select 1 from jsonb_array_elements_text(k.value) term where a.title ilike '%'||term||'%')
  )
  select jsonb_build_object(
    'total', (select count(*) from a),
    'regions', coalesce((select jsonb_object_agg(region, n) from (select region, count(*) n from a where region<>'' group by 1) x), '{}'),
    'offences', coalesce((select jsonb_object_agg(offence_type, n) from (select offence_type, count(*) n from a where offence_type<>'' group by 1) x), '{}'),
    'statuses', coalesce((select jsonb_object_agg(case_status, n) from (select case_status, count(*) n from a where case_status<>'' group by 1) x), '{}'),
    'region_offence', coalesce((select jsonb_agg(jsonb_build_array(region, offence_type, n)) from (select region, offence_type, count(*) n from a where region<>'' and offence_type<>'' group by 1,2) x), '[]'),
    'topics', coalesce((select jsonb_object_agg(slug, n) from (select slug, count(distinct id) n from t group by 1) x), '{}'),
    'topic_region', coalesce((select jsonb_agg(jsonb_build_array(slug, region, n)) from (select slug, region, count(distinct id) n from t where region<>'' group by 1,2) x), '[]')
  );
$$;
grant execute on function ghanacrimes.story_counts(timestamptz, jsonb) to anon, authenticated;
