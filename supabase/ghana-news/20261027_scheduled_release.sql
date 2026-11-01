-- Staggered publishing (2026-10-27): source-ingest inserts later stories of a batch as 'scheduled';
-- this job releases one at a time so published_at is the real, distinct release time.
alter table ghanacrimes.articles drop constraint if exists articles_status_check;
alter table ghanacrimes.articles add constraint articles_status_check
  check (status = any (array['draft','review','approved','scheduled','published','rejected']));

create or replace function ghanacrimes.release_scheduled_article()
returns text language plpgsql security definer
set search_path to 'ghanacrimes', 'public', 'extensions' as $$
declare r record;
begin
  -- Keep at least ~100 s between releases (ingest may have published one directly).
  if exists (select 1 from ghanacrimes.articles where is_published and published_at > now() - interval '100 seconds') then
    return null;
  end if;
  select id, article_slug into r from ghanacrimes.articles
   where status = 'scheduled' order by created_at asc limit 1 for update skip locked;
  if not found then return null; end if;
  begin
    update ghanacrimes.articles set status = 'published', published_at = now() where id = r.id;
    insert into ghanacrimes.audit_logs(action, resource_type, resource_id, details)
      values ('scheduled_released', 'article', r.id, jsonb_build_object('slug', r.article_slug));
  exception when others then
    update ghanacrimes.articles set status = 'review', reject_reason = left('scheduled release failed: ' || sqlerrm, 300) where id = r.id;
  end;
  return r.article_slug;
end $$;
revoke all on function ghanacrimes.release_scheduled_article() from public, anon, authenticated;

select cron.unschedule('ghanacrimes-release-scheduled') where exists (select 1 from cron.job where jobname = 'ghanacrimes-release-scheduled');
select cron.schedule('ghanacrimes-release-scheduled', '* * * * *', $$ select ghanacrimes.release_scheduled_article() $$);
