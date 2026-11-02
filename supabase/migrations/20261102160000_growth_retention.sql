-- Growth batch C: double opt-in Crime Brief, story follows, tip follow-ups, web push subscriptions.
-- Additive. Reader emails reuse the ghanacrimes.notifications queue (Resend via vault gc_resend_api_key).

-- 1. Queue can address readers (to_email) and carry extra headers (List-Unsubscribe).
alter table ghanacrimes.notifications add column if not exists to_email text;
alter table ghanacrimes.notifications add column if not exists headers jsonb;
create unique index if not exists notifications_reader_dedupe_uq on ghanacrimes.notifications (dedupe_key) where to_email is not null and dedupe_key is not null;

create or replace function ghanacrimes.send_pending_notifications() returns int
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare
  v_key text;
  v_to text := coalesce((select value from ghanacrimes.private_settings where key = 'notify_to'), 'officeofnajib@gmail.com');
  v_from text := coalesce((select value from ghanacrimes.private_settings where key = 'notify_from'), 'GhanaCrimes Alerts <noreply@calabashe.com>');
  v_reader_from text := coalesce((select value from ghanacrimes.private_settings where key = 'reader_from'), 'GhanaCrimes <noreply@calabashe.com>');
  r record;
  v_n int := 0;
begin
  for r in select n.id, n.request_id, h.status_code, h.error_msg, h.content
           from ghanacrimes.notifications n left join net._http_response h on h.id = n.request_id
           where n.sent_at is null and n.request_id is not null loop
    if r.status_code between 200 and 299 then
      update ghanacrimes.notifications set sent_at = now(), last_error = null where id = r.id;
    elsif r.status_code is not null or r.error_msg is not null then
      update ghanacrimes.notifications set request_id = null, last_error = left(coalesce(r.status_code::text, '') || ' ' || coalesce(r.error_msg, r.content, ''), 500) where id = r.id;
    end if;
  end loop;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'gc_resend_api_key';
  if v_key is null then return 0; end if;

  -- Resend free tier allows ~2 requests/second: send at most 10 per minute.
  for r in select * from ghanacrimes.notifications
           where sent_at is null and request_id is null and attempts < 5 and created_at > now() - interval '3 days'
           order by (to_email is not null), created_at limit 10 for update skip locked loop
    update ghanacrimes.notifications set attempts = attempts + 1,
      request_id = net.http_post(
        url := 'https://api.resend.com/emails',
        body := jsonb_build_object('from', case when r.to_email is null then v_from else v_reader_from end,
                                   'to', jsonb_build_array(coalesce(r.to_email, v_to)), 'subject', left(r.subject, 180), 'text', r.body)
                || case when r.headers is not null then jsonb_build_object('headers', r.headers) else '{}'::jsonb end,
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
        timeout_milliseconds := 10000)
    where id = r.id;
    v_n := v_n + 1;
    perform pg_sleep(0.5);
  end loop;
  return v_n;
end $$;

-- 2. Double opt-in newsletter.
alter table ghanacrimes.newsletter_subscribers add column if not exists confirm_token uuid not null default gen_random_uuid();
alter table ghanacrimes.newsletter_subscribers add column if not exists unsub_token uuid not null default gen_random_uuid();
alter table ghanacrimes.newsletter_subscribers add column if not exists confirmed_at timestamptz;
alter table ghanacrimes.newsletter_subscribers alter column is_active set default false;
drop policy if exists "Anyone can subscribe to newsletter" on ghanacrimes.newsletter_subscribers;
create policy "Anyone can subscribe to newsletter" on ghanacrimes.newsletter_subscribers for insert to anon, authenticated
  with check (is_active = false and confirmed_at is null and unsubscribed_at is null and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254);

create or replace function ghanacrimes.newsletter_send_confirm() returns trigger
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
begin
  insert into ghanacrimes.notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key)
  values ('newsletter_confirm', 'newsletter_subscribers', new.id::text, new.email,
    'Confirm your GhanaCrimes Crime Brief subscription',
    E'Someone (hopefully you) asked to get the GhanaCrimes daily Crime Brief at this address.\n\nConfirm here:\nhttps://www.ghanacrimes.com/newsletter/confirm?t=' || new.confirm_token
    || E'\n\nIf this was not you, ignore this email and nothing will be sent.\n\nGhanaCrimes\nhttps://www.ghanacrimes.com',
    'nl_confirm:' || new.id)
  on conflict do nothing;
  return new;
exception when others then raise warning 'newsletter_send_confirm: %', sqlerrm; return new;
end $$;
drop trigger if exists newsletter_confirm_email on ghanacrimes.newsletter_subscribers;
create trigger newsletter_confirm_email after insert on ghanacrimes.newsletter_subscribers for each row execute function ghanacrimes.newsletter_send_confirm();

-- 3. Story / case follows (email alerts on updates), also double opt-in.
create table if not exists ghanacrimes.story_follows (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  article_id uuid references ghanacrimes.articles(id),
  thread_id uuid references ghanacrimes.story_threads(id),
  case_id uuid references ghanacrimes.court_cases(id),
  confirm_token uuid not null default gen_random_uuid(),
  unsub_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(article_id, thread_id, case_id) = 1)
);
create unique index if not exists story_follows_uq on ghanacrimes.story_follows (lower(email), coalesce(article_id, thread_id, case_id));
alter table ghanacrimes.story_follows enable row level security;
revoke all on ghanacrimes.story_follows from anon, authenticated;

create or replace function ghanacrimes.follow_story(p_email text, p_article uuid default null, p_thread uuid default null, p_case uuid default null) returns boolean
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare v_id uuid; v_tok uuid; v_title text;
begin
  p_email := lower(trim(p_email));
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 254 or num_nonnulls(p_article, p_thread, p_case) <> 1 then return false; end if;
  select coalesce((select title from articles where id = p_article and is_published), (select title from story_threads where id = p_thread),
                  (select title from court_cases where id = p_case and is_published)) into v_title;
  if v_title is null then return false; end if;
  -- crude abuse limit: 20 pending follows per address per day
  if (select count(*) from story_follows where lower(email) = p_email and created_at > now() - interval '1 day') >= 20 then return false; end if;
  insert into story_follows (email, article_id, thread_id, case_id) values (p_email, p_article, p_thread, p_case)
    on conflict do nothing returning id, confirm_token into v_id, v_tok;
  if v_id is null then return true; end if;
  insert into notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key)
  values ('follow_confirm', 'story_follows', v_id::text, p_email, 'Confirm: follow "' || left(v_title, 80) || '" on GhanaCrimes',
    E'You asked to be emailed when this story gets an update:\n' || v_title || E'\n\nConfirm here:\nhttps://www.ghanacrimes.com/newsletter/confirm?t=' || v_tok
    || E'\n\nIf this was not you, ignore this email.', 'follow_confirm:' || v_id) on conflict do nothing;
  return true;
end $$;

create or replace function ghanacrimes.confirm_email_token(t uuid) returns text
language plpgsql security definer set search_path = ghanacrimes, public as $$
begin
  update newsletter_subscribers set confirmed_at = coalesce(confirmed_at, now()), is_active = true, unsubscribed_at = null where confirm_token = t;
  if found then return 'newsletter'; end if;
  update story_follows set confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = null where confirm_token = t;
  if found then return 'follow'; end if;
  return null;
end $$;

create or replace function ghanacrimes.unsubscribe_token(t uuid) returns text
language plpgsql security definer set search_path = ghanacrimes, public as $$
begin
  update newsletter_subscribers set is_active = false, unsubscribed_at = now() where unsub_token = t;
  if found then return 'newsletter'; end if;
  update story_follows set unsubscribed_at = now() where unsub_token = t;
  if found then return 'follow'; end if;
  return null;
end $$;

-- Alert followers when a followed article gets a material update or a followed live thread gets a post.
create or replace function ghanacrimes.notify_followers() returns trigger
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare v_title text; v_url text; v_summary text; f record;
begin
  if tg_table_name = 'story_updates' then
    if not coalesce(new.is_material, false) then return new; end if;
    select a.title, 'https://www.ghanacrimes.com/' || a.category_slug || '/' || a.article_slug into v_title, v_url from articles a where a.id = new.article_id and a.is_published;
    v_summary := coalesce(new.headline_change, new.summary, '');
    for f in select * from story_follows where article_id = new.article_id and confirmed_at is not null and unsubscribed_at is null loop
      insert into notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key, headers)
      values ('follow_update', 'story_updates', new.id::text, f.email, 'Update: ' || left(v_title, 150),
        'New update on a story you follow:' || E'\n\n' || v_title || E'\n' || left(v_summary, 600) || E'\n\nRead it: ' || v_url
        || E'\n\nStop alerts for this story: https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || f.unsub_token,
        'follow_update:' || new.id || ':' || f.id,
        jsonb_build_object('List-Unsubscribe', '<https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || f.unsub_token || '>'))
      on conflict do nothing;
    end loop;
  elsif tg_table_name = 'thread_updates' then
    select t.title, 'https://www.ghanacrimes.com/live/' || t.thread_slug into v_title, v_url from story_threads t where t.id = new.thread_id;
    for f in select * from story_follows where thread_id = new.thread_id and confirmed_at is not null and unsubscribed_at is null loop
      insert into notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key, headers)
      values ('follow_update', 'thread_updates', new.id::text, f.email, 'Live update: ' || left(v_title, 150),
        'New update on a live story you follow:' || E'\n\n' || coalesce(new.title, v_title) || E'\n\nRead it: ' || v_url
        || E'\n\nStop alerts for this story: https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || f.unsub_token,
        'follow_update:' || new.id || ':' || f.id,
        jsonb_build_object('List-Unsubscribe', '<https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || f.unsub_token || '>'))
      on conflict do nothing;
    end loop;
  end if;
  return new;
exception when others then raise warning 'notify_followers: %', sqlerrm; return new;
end $$;
drop trigger if exists notify_followers_story on ghanacrimes.story_updates;
create trigger notify_followers_story after insert on ghanacrimes.story_updates for each row execute function ghanacrimes.notify_followers();
drop trigger if exists notify_followers_thread on ghanacrimes.thread_updates;
create trigger notify_followers_thread after insert on ghanacrimes.thread_updates for each row execute function ghanacrimes.notify_followers();

-- Court case follows: alert when the tracked next hearing changes.
create or replace function ghanacrimes.notify_case_followers() returns trigger
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare f record;
begin
  if new.next_hearing is not distinct from old.next_hearing or not new.is_published then return new; end if;
  for f in select * from story_follows where case_id = new.id and confirmed_at is not null and unsubscribed_at is null loop
    insert into notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key, headers)
    values ('follow_update', 'court_cases', new.id::text, f.email, 'Court update: ' || left(new.title, 150),
      'A court case you follow has a new hearing date: ' || coalesce(to_char(new.next_hearing, 'FMDay DD FMMonth YYYY'), 'not yet known')
      || E'\n' || coalesce(new.next_hearing_text, '') || E'\n\nCase page: https://www.ghanacrimes.com/courts/cases/' || new.slug
      || E'\n\nStop alerts for this case: https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || f.unsub_token,
      'case_update:' || new.id || ':' || coalesce(new.next_hearing::text, 'none') || ':' || f.id,
      jsonb_build_object('List-Unsubscribe', '<https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || f.unsub_token || '>'))
    on conflict do nothing;
  end loop;
  return new;
exception when others then raise warning 'notify_case_followers: %', sqlerrm; return new;
end $$;
drop trigger if exists notify_case_followers on ghanacrimes.court_cases;
create trigger notify_case_followers after update on ghanacrimes.court_cases for each row execute function ghanacrimes.notify_case_followers();

-- 4. Daily Crime Brief at 07:00 Europe/London (cron fires 06:00 and 07:00 UTC; the function checks London time).
create or replace function ghanacrimes.queue_daily_brief(p_force boolean default false) returns int
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare v_day date := (now() at time zone 'Europe/London')::date; v_list text; v_dev text; v_n int := 0; s record;
begin
  if not p_force and extract(hour from now() at time zone 'Europe/London') <> 7 then return 0; end if;
  select string_agg('- ' || title || E'\n  https://www.ghanacrimes.com/' || category_slug || '/' || article_slug, E'\n' order by published_at desc)
    into v_list from (select * from articles where is_published and published_at > now() - interval '24 hours' order by published_at desc limit 15) a;
  if v_list is null then return 0; end if; -- never send an empty brief
  select string_agg('- ' || a.title || E'\n  https://www.ghanacrimes.com/' || a.category_slug || '/' || a.article_slug, E'\n')
    into v_dev from (select distinct on (a.id) a.* from story_updates u join articles a on a.id = u.article_id and a.is_published
                     where u.is_material and u.posted_at > now() - interval '24 hours' order by a.id, u.posted_at desc limit 5) a;
  for s in select * from newsletter_subscribers where is_active and confirmed_at is not null and unsubscribed_at is null loop
    insert into notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key, headers)
    values ('daily_brief', 'newsletter_subscribers', s.id::text, s.email,
      'GhanaCrimes Crime Brief: ' || to_char(v_day, 'FMDay FMDD FMMonth'),
      'Good morning. Here is what GhanaCrimes reported in the last 24 hours.' || E'\n\n' || v_list
      || coalesce(E'\n\nDeveloping (updated in the last 24 hours):\n' || v_dev, '')
      || E'\n\nPeople named in these reports are suspects unless a court has convicted them.'
      || E'\n\nUnsubscribe: https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || s.unsub_token,
      'brief:' || v_day || ':' || s.id,
      jsonb_build_object('List-Unsubscribe', '<https://www.ghanacrimes.com/newsletter/unsubscribe?t=' || s.unsub_token || '>'))
    on conflict do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
select cron.unschedule('ghanacrimes-daily-brief') where exists (select 1 from cron.job where jobname = 'ghanacrimes-daily-brief');
select cron.schedule('ghanacrimes-daily-brief', '0 6,7 * * *', 'select ghanacrimes.queue_daily_brief()');

-- 5. Tip follow-up: staff link a tip to the story it led to; a tipster who left an email gets a thank-you with the link.
alter table ghanacrimes.tips add column if not exists led_to_article_id uuid references ghanacrimes.articles(id);
alter table ghanacrimes.tips add column if not exists followup_queued_at timestamptz;
create or replace function ghanacrimes.tip_followup() returns trigger
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare v_title text; v_url text; v_email text;
begin
  if new.led_to_article_id is null or old.led_to_article_id is not distinct from new.led_to_article_id or new.followup_queued_at is not null then return new; end if;
  v_email := substring(coalesce(new.contact, '') from '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}');
  select title, 'https://www.ghanacrimes.com/' || category_slug || '/' || article_slug into v_title, v_url from articles where id = new.led_to_article_id and is_published;
  if v_email is null or v_title is null then return new; end if;
  insert into notifications (kind, source_table, source_id, to_email, subject, body, dedupe_key)
  values ('tip_followup', 'tips', new.id::text, v_email, 'Your tip helped a GhanaCrimes story',
    E'Thank you for your tip to GhanaCrimes. It helped us report this story:\n\n' || v_title || E'\n' || v_url
    || E'\n\nWe never publish who sent a tip.\n\nGhanaCrimes', 'tip_followup:' || new.id) on conflict do nothing;
  new.followup_queued_at := now();
  return new;
exception when others then raise warning 'tip_followup: %', sqlerrm; return new;
end $$;
drop trigger if exists tip_followup on ghanacrimes.tips;
create trigger tip_followup before update on ghanacrimes.tips for each row execute function ghanacrimes.tip_followup();

-- 6. Web push subscriptions (payload-free pushes; the service worker fetches the headline).
create table if not exists ghanacrimes.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) < 1000),
  p256dh text, auth text, region text,
  created_at timestamptz not null default now(), disabled_at timestamptz, last_status int
);
alter table ghanacrimes.push_subscriptions enable row level security;
revoke all on ghanacrimes.push_subscriptions from anon, authenticated;
create or replace function ghanacrimes.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_region text default null) returns boolean
language sql security definer set search_path = ghanacrimes, public as $$
  insert into push_subscriptions (endpoint, p256dh, auth, region) values (p_endpoint, p_p256dh, p_auth, nullif(p_region, ''))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, region = excluded.region, disabled_at = null
  returning true;
$$;
create or replace function ghanacrimes.disable_push_subscription(p_endpoint text) returns boolean
language sql security definer set search_path = ghanacrimes, public as $$
  update push_subscriptions set disabled_at = now() where endpoint = p_endpoint returning true;
$$;
create or replace function ghanacrimes.push_targets(p_secret text) returns table(endpoint text)
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from
     (select value from private_settings where key = 'worker_alert_secret_sha256') then return; end if;
  return query select s.endpoint from push_subscriptions s where s.disabled_at is null limit 5000;
end $$;
create or replace function ghanacrimes.push_result(p_secret text, p_endpoint text, p_status int) returns void
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from
     (select value from private_settings where key = 'worker_alert_secret_sha256') then return; end if;
  update push_subscriptions set last_status = p_status, disabled_at = case when p_status in (404, 410) then now() else disabled_at end where endpoint = p_endpoint;
end $$;

revoke all on function ghanacrimes.queue_daily_brief(boolean) from public, anon, authenticated;
grant execute on function ghanacrimes.follow_story(text, uuid, uuid, uuid), ghanacrimes.confirm_email_token(uuid), ghanacrimes.unsubscribe_token(uuid),
  ghanacrimes.save_push_subscription(text, text, text, text), ghanacrimes.disable_push_subscription(text),
  ghanacrimes.push_targets(text), ghanacrimes.push_result(text, text, int) to anon, authenticated;
