-- 2026-11-02 audit fixes: moderated comments, public fraud directory view, private fraud evidence bucket,
-- and an email notification queue (ghanacrimes.notifications) drained by pg_cron + pg_net -> Resend.
-- The Resend key lives in Supabase Vault as 'gc_resend_api_key'; the Worker alert secret hash in ghanacrimes.private_settings.

-- 1. Comments: pending by default; anon may only insert pending rows.
alter table ghanacrimes.comments alter column is_approved set default false;
alter table ghanacrimes.comments alter column is_verified set default false;
drop policy if exists "Anyone can create comments" on ghanacrimes.comments;
drop policy if exists "Anyone can create pending comments" on ghanacrimes.comments;
create policy "Anyone can create pending comments" on ghanacrimes.comments for insert to anon, authenticated
  with check (is_approved = false and is_verified = false and length(comment_text) between 1 and 1000 and length(commenter_name) between 1 and 40);

-- 2. Fraud Watch public directory: moderated accounts only, public columns only.
create or replace view ghanacrimes.fraud_accounts_public with (security_barrier = true) as
  select id, platform, account_name, account_handle, account_link, status, reports_count, total_reported_loss,
         last_reported_at, views_count, created_at
  from ghanacrimes.fraud_accounts where status <> 'Pending';
revoke all on ghanacrimes.fraud_accounts_public from anon, authenticated;
grant select on ghanacrimes.fraud_accounts_public to anon, authenticated;

-- 3. Private bucket for anonymous fraud evidence (10 MB, images/PDF, reports/ path only, staff-only read).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fraud-evidence', 'fraud-evidence', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
-- (policies "GC anon fraud evidence upload", "GC staff read fraud evidence", "GC admin delete fraud evidence" on storage.objects)

-- 4. Notifications queue.
create table if not exists ghanacrimes.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                -- comment | tip | contact | correction | fraud_report | newsletter | worker_error | test
  source_table text,
  source_id text,
  subject text not null,
  body text not null,
  link text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  request_id bigint,
  attempts int not null default 0,
  last_error text
);
create index if not exists notifications_unsent_idx on ghanacrimes.notifications (created_at) where sent_at is null;
create index if not exists notifications_dedupe_idx on ghanacrimes.notifications (dedupe_key, created_at);
alter table ghanacrimes.notifications enable row level security;
revoke all on ghanacrimes.notifications from anon, authenticated;
grant select, update on ghanacrimes.notifications to authenticated;
create policy "Staff can view notifications" on ghanacrimes.notifications for select to authenticated
  using (ghanacrimes.has_role(auth.uid(), 'admin'::ghanacrimes.app_role) or ghanacrimes.has_role(auth.uid(), 'editor'::ghanacrimes.app_role));

create table if not exists ghanacrimes.private_settings (key text primary key, value text not null);
alter table ghanacrimes.private_settings enable row level security;
revoke all on ghanacrimes.private_settings from anon, authenticated;

create or replace function ghanacrimes.enqueue_notification() returns trigger
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare
  v_kind text := tg_argv[0];
  v_label text := coalesce(tg_argv[1], tg_argv[0]);
  v_row jsonb := to_jsonb(new) - 'ip_address';
  v_details text;
  v_snippet text;
  v_link text;
  v_extra text := '';
  v_art record;
begin
  if v_kind = 'comment' and coalesce(new.is_approved, false) then return new; end if;
  select string_agg(key || ': ' || left(coalesce(value, ''), 1500), E'\n' order by key) into v_details
    from jsonb_each_text(v_row);
  v_snippet := left(regexp_replace(coalesce(v_row->>'comment_text', v_row->>'tip_text', v_row->>'subject', v_row->>'details',
                   v_row->>'description', v_row->>'email', ''), '\s+', ' ', 'g'), 70);
  v_link := 'https://supabase.com/dashboard/project/rscqxztgtpcifcqxjskh/editor?schema=ghanacrimes&table=' || tg_table_name;
  if v_kind = 'comment' then
    select category_slug, article_slug, title into v_art from ghanacrimes.articles where id = new.article_id;
    if found then v_extra := E'\nArticle: ' || v_art.title || E'\nhttps://www.ghanacrimes.com/' || v_art.category_slug || '/' || v_art.article_slug; end if;
    v_extra := v_extra || E'\nTo approve: set is_approved = true on this row (comments table).';
  elsif v_kind = 'fraud_report' then
    v_extra := E'\nAdmin: https://www.ghanacrimes.com/admin/fraud-watch\nEvidence files are in the private storage bucket fraud-evidence.';
  end if;
  insert into ghanacrimes.notifications (kind, source_table, source_id, subject, body, link)
  values (v_kind, tg_table_name, v_row->>'id',
          '[GhanaCrimes] New ' || v_label || case when v_snippet <> '' then ': ' || v_snippet else '' end,
          'New ' || v_label || ' on GhanaCrimes at ' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || E' UTC\n\n'
            || coalesce(v_details, '') || E'\n' || v_extra || E'\n\nDatabase row (table ' || tg_table_name || ', id ' || coalesce(v_row->>'id','?') || E'):\n' || v_link,
          v_link);
  return new;
exception when others then
  raise warning 'enqueue_notification failed: %', sqlerrm;
  return new; -- never block the user's submission
end $$;

drop trigger if exists notify_new_comment on ghanacrimes.comments;
create trigger notify_new_comment after insert on ghanacrimes.comments for each row execute function ghanacrimes.enqueue_notification('comment', 'pending comment');
drop trigger if exists notify_new_tip on ghanacrimes.tips;
create trigger notify_new_tip after insert on ghanacrimes.tips for each row execute function ghanacrimes.enqueue_notification('tip', 'tip');
drop trigger if exists notify_new_contact on ghanacrimes.contact_messages;
create trigger notify_new_contact after insert on ghanacrimes.contact_messages for each row execute function ghanacrimes.enqueue_notification('contact', 'contact message');
drop trigger if exists notify_new_correction on ghanacrimes.correction_requests;
create trigger notify_new_correction after insert on ghanacrimes.correction_requests for each row execute function ghanacrimes.enqueue_notification('correction', 'correction request');
drop trigger if exists notify_new_fraud_report on ghanacrimes.fraud_reports;
create trigger notify_new_fraud_report after insert on ghanacrimes.fraud_reports for each row execute function ghanacrimes.enqueue_notification('fraud_report', 'fraud report');
drop trigger if exists notify_new_newsletter on ghanacrimes.newsletter_subscribers;
create trigger notify_new_newsletter after insert on ghanacrimes.newsletter_subscribers for each row execute function ghanacrimes.enqueue_notification('newsletter', 'newsletter signup');

-- Sender: every minute, reconcile pg_net responses, then post unsent rows to Resend.
create or replace function ghanacrimes.send_pending_notifications() returns int
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare
  v_key text;
  v_to text := coalesce((select value from ghanacrimes.private_settings where key = 'notify_to'), 'officeofnajib@gmail.com');
  v_from text := coalesce((select value from ghanacrimes.private_settings where key = 'notify_from'), 'GhanaCrimes Alerts <noreply@calabashe.com>');
  r record;
  v_n int := 0;
begin
  -- Reconcile in-flight requests.
  for r in select n.id, n.created_at, n.attempts, n.request_id, h.status_code, h.error_msg, h.content, h.created as resp_at
           from ghanacrimes.notifications n left join net._http_response h on h.id = n.request_id
           where n.sent_at is null and n.request_id is not null loop
    if r.status_code between 200 and 299 then
      update ghanacrimes.notifications set sent_at = now(), last_error = null where id = r.id;
    elsif r.status_code is not null or r.error_msg is not null then
      update ghanacrimes.notifications set request_id = null, last_error = left(coalesce(r.status_code::text, '') || ' ' || coalesce(r.error_msg, r.content, ''), 500) where id = r.id;
    end if;
  end loop;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'gc_resend_api_key';
  if v_key is null then return 0; end if; -- queue-only mode

  for r in select * from ghanacrimes.notifications
           where sent_at is null and request_id is null and attempts < 5 and created_at > now() - interval '3 days'
           order by created_at limit 20 for update skip locked loop
    update ghanacrimes.notifications set attempts = attempts + 1,
      request_id = net.http_post(
        url := 'https://api.resend.com/emails',
        body := jsonb_build_object('from', v_from, 'to', jsonb_build_array(v_to), 'subject', left(r.subject, 180), 'text', r.body),
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
        timeout_milliseconds := 10000)
    where id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function ghanacrimes.send_pending_notifications() from public, anon, authenticated;

-- Worker error alerts: at most one email per error type per hour (secret-protected).
create or replace function ghanacrimes.report_worker_error(p_secret text, p_type text, p_detail text) returns boolean
language plpgsql security definer set search_path = ghanacrimes, public, extensions as $$
declare v_key text := 'worker_error:' || left(coalesce(p_type, 'unknown'), 120);
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from
     (select value from ghanacrimes.private_settings where key = 'worker_alert_secret_sha256') then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext(v_key));
  if exists (select 1 from ghanacrimes.notifications where dedupe_key = v_key and created_at > now() - interval '1 hour') then
    return false;
  end if;
  insert into ghanacrimes.notifications (kind, subject, body, dedupe_key, link)
  values ('worker_error', '[GhanaCrimes] Worker error: ' || left(coalesce(p_type, 'unknown'), 120),
          'Unhandled server error in the ghanacrimes Worker at ' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || E' UTC.\n'
          || E'(Max one email per error type per hour.)\n\n' || left(coalesce(p_detail, ''), 6000)
          || E'\n\nLogs: Cloudflare dashboard > Workers & Pages > ghanacrimes > Observability',
          v_key, 'https://dash.cloudflare.com/');
  return true;
end $$;
revoke all on function ghanacrimes.report_worker_error(text, text, text) from public;
grant execute on function ghanacrimes.report_worker_error(text, text, text) to anon, authenticated;

select cron.unschedule('ghanacrimes-notifications') where exists (select 1 from cron.job where jobname = 'ghanacrimes-notifications');
select cron.schedule('ghanacrimes-notifications', '* * * * *', 'select ghanacrimes.send_pending_notifications()');
