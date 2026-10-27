-- Normalise free-text regions to the 16 region names so region hubs, map and stats count every story.
create or replace function ghanacrimes.normalise_region(r text) returns text language sql immutable as $$
  select case
    when r is null or btrim(r) = '' or lower(btrim(r)) = 'null' then null
    when lower(regexp_replace(btrim(r), '\s+region$', '', 'i')) = 'accra' then 'Greater Accra'
    when regexp_replace(btrim(r), '\s+region$', '', 'i') ~* '^(greater accra|ashanti|western|western north|central|eastern|volta|oti|northern|savannah|north east|upper east|upper west|bono|bono east|ahafo)$'
      then initcap(regexp_replace(btrim(r), '\s+region$', '', 'i'))
    else btrim(r) end
$$;
create or replace function ghanacrimes.articles_normalise_region() returns trigger language plpgsql as $$
begin new.region := ghanacrimes.normalise_region(new.region); return new; end $$;
drop trigger if exists normalise_region on ghanacrimes.articles;
create trigger normalise_region before insert or update of region on ghanacrimes.articles
  for each row execute function ghanacrimes.articles_normalise_region();
update ghanacrimes.articles set region = ghanacrimes.normalise_region(region)
  where region is distinct from ghanacrimes.normalise_region(region);
