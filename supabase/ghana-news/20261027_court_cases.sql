-- Court case tracker. A case is only created from a published GhanaCrimes court report, and the next hearing
-- date is only set from an "adjourned ... to <date>" sentence in a published report (the source is stored).
create table if not exists ghanacrimes.court_cases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  status text,
  next_hearing date,
  next_hearing_text text,
  next_hearing_article_id uuid references ghanacrimes.articles(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists ghanacrimes.court_case_articles (
  case_id uuid not null references ghanacrimes.court_cases(id) on delete cascade,
  article_id uuid not null references ghanacrimes.articles(id) on delete cascade,
  primary key (case_id, article_id)
);
alter table ghanacrimes.court_cases enable row level security;
alter table ghanacrimes.court_case_articles enable row level security;
drop policy if exists court_cases_public_read on ghanacrimes.court_cases;
create policy court_cases_public_read on ghanacrimes.court_cases for select using (is_published);
drop policy if exists court_case_articles_public_read on ghanacrimes.court_case_articles;
create policy court_case_articles_public_read on ghanacrimes.court_case_articles for select using (true);
grant select on ghanacrimes.court_cases, ghanacrimes.court_case_articles to anon, authenticated;

-- "adjourned the case to November 3, 2026" -> date (year inferred from the report date when missing).
create or replace function ghanacrimes.adjourned_to(body text, pub timestamptz) returns table(d date, sentence text)
language plpgsql immutable as $$
declare txt text; m text[]; s text; mon int; dy int; yr int;
begin
  txt := regexp_replace(coalesce(body,''), '<[^>]+>', ' ', 'g');
  s := substring(txt from '(?i)([^.]*\madjourn[a-z]*\M[^.]*\mto\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?[^.]*\.)');
  if s is null then return; end if;
  m := regexp_match(s, '(?i)\mto\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?');
  if m is null then return; end if;
  mon := extract(month from to_date(m[1], 'Month'));
  dy := m[2]::int;
  yr := coalesce(m[3]::int, extract(year from pub)::int + case when mon < extract(month from pub) then 1 else 0 end);
  begin d := make_date(yr, mon, dy); exception when others then return; end;
  if d < pub::date then return; end if;
  sentence := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  return next;
end $$;

create or replace function ghanacrimes.refresh_court_cases() returns int
language plpgsql security definer set search_path = ghanacrimes, public as $$
declare r record; cid uuid; n int := 0; base text;
begin
  for r in
    select a.id, a.title, a.article_slug, a.case_status, a.published_at, a.thread_id, x.d, x.sentence
    from ghanacrimes.articles a cross join lateral ghanacrimes.adjourned_to(a.body, a.published_at) x
    where a.is_published and not exists (select 1 from ghanacrimes.court_case_articles l where l.article_id = a.id)
    order by a.published_at
  loop
    cid := null;
    if r.thread_id is not null then
      select l.case_id into cid from ghanacrimes.court_case_articles l join ghanacrimes.articles b on b.id = l.article_id
        where b.thread_id = r.thread_id limit 1;
    end if;
    if cid is null then
      base := left(r.article_slug, 80);
      insert into ghanacrimes.court_cases(slug, title, status, next_hearing, next_hearing_text, next_hearing_article_id)
        values (base, r.title, r.case_status, r.d, r.sentence, r.id)
        on conflict (slug) do nothing returning id into cid;
      if cid is null then continue; end if;
    else
      update ghanacrimes.court_cases set status = coalesce(r.case_status, status), next_hearing = r.d, next_hearing_text = r.sentence,
        next_hearing_article_id = r.id, updated_at = now() where id = cid and (next_hearing is null or r.published_at >= (select published_at from ghanacrimes.articles where id = next_hearing_article_id));
    end if;
    insert into ghanacrimes.court_case_articles values (cid, r.id) on conflict do nothing;
    n := n + 1;
  end loop;
  -- Unpublished source reports take their case off the public tracker.
  update ghanacrimes.court_cases c set is_published = exists (
    select 1 from ghanacrimes.court_case_articles l join ghanacrimes.articles a on a.id = l.article_id where l.case_id = c.id and a.is_published)
  where c.is_published is distinct from exists (
    select 1 from ghanacrimes.court_case_articles l join ghanacrimes.articles a on a.id = l.article_id where l.case_id = c.id and a.is_published);
  return n;
end $$;
revoke execute on function ghanacrimes.refresh_court_cases() from public, anon, authenticated;
select cron.unschedule('ghanacrimes-court-cases') where exists (select 1 from cron.job where jobname = 'ghanacrimes-court-cases');
select cron.schedule('ghanacrimes-court-cases', '7,37 * * * *', 'select ghanacrimes.refresh_court_cases()');
