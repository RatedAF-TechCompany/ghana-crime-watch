-- Keep case_status to the public label set; anything else (unknown, law_enforcement, free text) becomes null.
create or replace function ghanacrimes.articles_normalise_region() returns trigger language plpgsql as $$
begin
  new.region := ghanacrimes.normalise_region(new.region);
  if new.case_status is not null then
    new.case_status := replace(lower(btrim(new.case_status)), ' ', '_');
    if new.case_status not in ('reported','under_investigation','arrested','charged','remanded','on_trial','pleaded_guilty','convicted','acquitted','discharged') then
      new.case_status := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists normalise_region on ghanacrimes.articles;
create trigger normalise_region before insert or update of region, case_status on ghanacrimes.articles
  for each row execute function ghanacrimes.articles_normalise_region();
