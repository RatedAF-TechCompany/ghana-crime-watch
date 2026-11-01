-- Revert of an error made earlier on 2026-10-27: the bail-ruling report says Mr Boasiako was convicted and sentenced
-- (illegal-mining case) and is seeking bail pending appeal, so the original "convicted" label was right.
insert into ghanacrimes.audit_logs(action, resource_type, resource_id, details)
  select 'case_status_fixed','article',id,jsonb_build_object('from',case_status,'to','convicted','date','2026-10-27','reason','revert: source reports conviction, appeal pending; erroneous correction note removed')
  from ghanacrimes.articles where article_slug='high-court-sets-november-4-ruling-wontumi-bail-application';
delete from ghanacrimes.corrections where created_at > now() - interval '1 day'
  and article_id=(select id from ghanacrimes.articles where article_slug='high-court-sets-november-4-ruling-wontumi-bail-application')
  and note like 'The case-status label on this report wrongly said "Convicted"%';
update ghanacrimes.articles set case_status='convicted' where article_slug='high-court-sets-november-4-ruling-wontumi-bail-application';
select ghanacrimes.refresh_court_cases();
select slug,status from ghanacrimes.court_cases where slug ~ 'wontumi';
update ghanacrimes.court_cases set status='convicted', updated_at=now() where slug='high-court-sets-november-4-ruling-wontumi-bail-application';
update ghanacrimes.court_cases c set status = s.case_status, updated_at=now() from (
  select distinct on (ca.case_id) ca.case_id, a.case_status from ghanacrimes.court_case_articles ca join ghanacrimes.articles a on a.id=ca.article_id
  where a.is_published and a.case_status is not null order by ca.case_id, a.published_at desc) s
where s.case_id=c.id and c.status is distinct from s.case_status;
select slug,status from ghanacrimes.court_cases order by slug;
