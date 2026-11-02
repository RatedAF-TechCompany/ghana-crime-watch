-- All GhanaCrimes email now sends from @ghanacrimes.com through the Worker's Cloudflare send_email binding.
-- Resend is only used if 'resend_from' is set to a verified ghanacrimes.com sender (no calabashe.com sender anywhere).
alter table ghanacrimes.notifications add column if not exists provider text;
insert into ghanacrimes.private_settings(key, value) values
  ('notify_from', 'GhanaCrimes Alerts <alerts@ghanacrimes.com>'),
  ('reader_from', 'GhanaCrimes <alerts@ghanacrimes.com>'),
  ('mail_endpoint', 'https://www.ghanacrimes.com/__internal/mail')
on conflict (key) do update set value = excluded.value;

create or replace function ghanacrimes.send_pending_notifications()
 returns integer language plpgsql security definer
 set search_path to 'ghanacrimes', 'public', 'extensions'
as $function$
declare
  v_secret text; v_resend text;
  v_to text := coalesce((select value from ghanacrimes.private_settings where key = 'notify_to'), 'officeofnajib@gmail.com');
  v_from text := coalesce((select value from ghanacrimes.private_settings where key = 'notify_from'), 'GhanaCrimes Alerts <alerts@ghanacrimes.com>');
  v_reader_from text := coalesce((select value from ghanacrimes.private_settings where key = 'reader_from'), 'GhanaCrimes <alerts@ghanacrimes.com>');
  v_resend_from text := (select value from ghanacrimes.private_settings where key = 'resend_from' and value ilike '%@ghanacrimes.com%');
  v_url text := coalesce((select value from ghanacrimes.private_settings where key = 'mail_endpoint'), 'https://www.ghanacrimes.com/__internal/mail');
  r record; v_n int := 0;
begin
  for r in select n.id, n.provider, n.to_email, h.status_code, h.error_msg, h.content
           from ghanacrimes.notifications n left join net._http_response h on h.id = n.request_id
           where n.sent_at is null and n.request_id is not null loop
    if r.status_code between 200 and 299 then
      update ghanacrimes.notifications set sent_at = now(), last_error = null where id = r.id;
    elsif r.status_code is not null or r.error_msg is not null then
      -- Cloudflare only delivers free to verified addresses; readers fall back to Resend once a ghanacrimes.com sender is verified there.
      update ghanacrimes.notifications set request_id = null,
        provider = case when coalesce(r.provider, 'cloudflare') = 'cloudflare' and r.to_email is not null and v_resend_from is not null then 'resend' else provider end,
        last_error = left(coalesce(r.status_code::text, '') || ' ' || coalesce(r.error_msg, r.content, ''), 500) where id = r.id;
    end if;
  end loop;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'gc_mail_secret';
  select decrypted_secret into v_resend from vault.decrypted_secrets where name = 'gc_resend_api_key';
  if v_secret is null then return 0; end if;

  for r in select * from ghanacrimes.notifications
           where sent_at is null and request_id is null and attempts < 5 and created_at > now() - interval '3 days'
           order by (to_email is not null), created_at limit 10 for update skip locked loop
    if r.provider = 'resend' and v_resend is not null and v_resend_from is not null then
      update ghanacrimes.notifications set attempts = attempts + 1, request_id = net.http_post(
        url := 'https://api.resend.com/emails',
        body := jsonb_build_object('from', v_resend_from, 'to', jsonb_build_array(coalesce(r.to_email, v_to)), 'subject', left(r.subject, 180), 'text', r.body)
                || case when r.headers is not null then jsonb_build_object('headers', r.headers) else '{}'::jsonb end,
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_resend, 'Content-Type', 'application/json'),
        timeout_milliseconds := 10000) where id = r.id;
    else
      update ghanacrimes.notifications set attempts = attempts + 1, provider = 'cloudflare', request_id = net.http_post(
        url := v_url,
        body := jsonb_build_object('from', case when r.to_email is null then v_from else v_reader_from end,
                                   'to', coalesce(r.to_email, v_to), 'subject', left(r.subject, 180), 'text', r.body, 'headers', coalesce(r.headers, '{}'::jsonb)),
        headers := jsonb_build_object('x-gc-mail', v_secret, 'Content-Type', 'application/json'),
        timeout_milliseconds := 15000) where id = r.id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;
