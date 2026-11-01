-- Case-status label fixes (2026-10-27). Wrong "Convicted"/"Acquitted" labels are public errors, so they go in the corrections log.
create temp table fix(slug text, new_status text, note text) on commit drop;
insert into fix values
 ('high-court-sets-november-4-ruling-wontumi-bail-application','on_trial','The case-status label on this report wrongly said "Convicted". The report concerns a pending bail application and the accused has not been convicted. The label now reads "On trial".'),
 ('afenyo-markin-withdraws-defamation-suit-against-neip-boss-eric-adjei',null,'The case-status label on this report wrongly said "Acquitted". The report concerns a civil defamation suit that was withdrawn, not a criminal acquittal. The label has been removed.'),
 ('committee-finds-no-evidence-linking-obuasi-shts-headmaster-to-foetus-burial',null,null),
 ('bawku-records-150-days-without-gunfire-says-interior-minister',null,null),
 ('mahama-commends-police-on-reduced-murders-and-highway-robberies',null,null),
 ('cyber-security-authority-warns-of-rising-cyber-threats-in-ghana',null,null),
 ('ghana-needs-stronger-international-cooperation-to-fight-cybercrime',null,null),
 ('lawyer-denies-seeking-presidential-pardon-for-wontumi-in-galamsey-case',null,null),
 ('misdemeanours-in-ghana-can-attract-prison-terms-even-25-years',null,null),
 ('nacoc-ivorian-authorities-collaborate-to-fight-drug-trafficking',null,null);
insert into ghanacrimes.audit_logs(action, resource_type, resource_id, details)
  select 'case_status_fixed','article',a.id,jsonb_build_object('from',a.case_status,'to',f.new_status,'date','2026-10-27')
  from fix f join ghanacrimes.articles a on a.article_slug=f.slug;
insert into ghanacrimes.corrections(article_id, note)
  select a.id, f.note from fix f join ghanacrimes.articles a on a.article_slug=f.slug where f.note is not null;
update ghanacrimes.articles a set case_status=f.new_status from fix f where a.article_slug=f.slug;
update ghanacrimes.articles set case_status='pleaded_guilty' where case_status='pleaded guilty';
