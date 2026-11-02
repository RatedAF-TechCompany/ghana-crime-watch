-- Optional district on articles; backfill only where the text names the assembly and the match is unambiguous.
alter table ghanacrimes.articles add column if not exists district text;
create index if not exists articles_district_idx on ghanacrimes.articles (district) where district is not null;
with d(name, region, pat) as (values ('Accra Metropolitan','Greater Accra','Accra Metropolitan'),
  ('Tema Metropolitan','Greater Accra','Tema Metropolitan'),
  ('Ga East Municipal','Greater Accra','Ga East Municipal'),
  ('Ga West Municipal','Greater Accra','Ga West Municipal'),
  ('Adentan Municipal','Greater Accra','Adentan Municipal'),
  ('Ashaiman Municipal','Greater Accra','Ashaiman Municipal'),
  ('Kpone-Katamanso Municipal','Greater Accra','Kpone-Katamanso Municipal'),
  ('Kpone-Katamanso Municipal','Greater Accra','Kpone Katamanso Municipal'),
  ('La Nkwantanang-Madina Municipal','Greater Accra','La Nkwantanang-Madina Municipal'),
  ('La Nkwantanang-Madina Municipal','Greater Accra','La Nkwantanang Madina Municipal'),
  ('Ledzokuku Municipal','Greater Accra','Ledzokuku Municipal'),
  ('Kumasi Metropolitan','Ashanti','Kumasi Metropolitan'),
  ('Obuasi Municipal','Ashanti','Obuasi Municipal'),
  ('Ejisu Municipal','Ashanti','Ejisu Municipal'),
  ('Sekondi-Takoradi Metropolitan','Western','Sekondi-Takoradi Metropolitan'),
  ('Sekondi-Takoradi Metropolitan','Western','Sekondi Takoradi Metropolitan'),
  ('Tarkwa-Nsuaem Municipal','Western','Tarkwa-Nsuaem Municipal'),
  ('Tarkwa-Nsuaem Municipal','Western','Tarkwa Nsuaem Municipal'),
  ('Cape Coast Metropolitan','Central','Cape Coast Metropolitan'),
  ('Awutu Senya East Municipal','Central','Awutu Senya East Municipal'),
  ('Effutu Municipal','Central','Effutu Municipal'),
  ('New Juaben South Municipal','Eastern','New Juaben South Municipal'),
  ('Kwahu West Municipal','Eastern','Kwahu West Municipal'),
  ('Ho Municipal','Volta','Ho Municipal'),
  ('Tamale Metropolitan','Northern','Tamale Metropolitan'),
  ('Yendi Municipal','Northern','Yendi Municipal'),
  ('Bolgatanga Municipal','Upper East','Bolgatanga Municipal'),
  ('Bawku Municipal','Upper East','Bawku Municipal'),
  ('Wa Municipal','Upper West','Wa Municipal'),
  ('Sunyani Municipal','Bono','Sunyani Municipal'),
  ('Techiman Municipal','Bono East','Techiman Municipal')),
hits as (
  select a.id, array_agg(distinct d.name) names, array_agg(distinct d.region) regions, max(a.region) aregion
  from ghanacrimes.articles a join d on (coalesce(a.title,'') || ' ' || coalesce(a.summary,'') || ' ' || coalesce(a.body,'')) ~ ('\m' || d.pat || '\M')
  where a.district is null group by a.id)
update ghanacrimes.articles a set district = h.names[1]
from hits h where h.id = a.id and cardinality(h.names) = 1 and (h.aregion is null or h.aregion = h.regions[1]);

-- Same rule for new and edited stories, so districts fill in without anyone stepping in.
create table if not exists ghanacrimes.district_patterns (name text not null, region text not null, pat text primary key);
alter table ghanacrimes.district_patterns enable row level security;
insert into ghanacrimes.district_patterns(name, region, pat) values ('Accra Metropolitan','Greater Accra','Accra Metropolitan'),
  ('Tema Metropolitan','Greater Accra','Tema Metropolitan'),
  ('Ga East Municipal','Greater Accra','Ga East Municipal'),
  ('Ga West Municipal','Greater Accra','Ga West Municipal'),
  ('Adentan Municipal','Greater Accra','Adentan Municipal'),
  ('Ashaiman Municipal','Greater Accra','Ashaiman Municipal'),
  ('Kpone-Katamanso Municipal','Greater Accra','Kpone-Katamanso Municipal'),
  ('Kpone-Katamanso Municipal','Greater Accra','Kpone Katamanso Municipal'),
  ('La Nkwantanang-Madina Municipal','Greater Accra','La Nkwantanang-Madina Municipal'),
  ('La Nkwantanang-Madina Municipal','Greater Accra','La Nkwantanang Madina Municipal'),
  ('Ledzokuku Municipal','Greater Accra','Ledzokuku Municipal'),
  ('Kumasi Metropolitan','Ashanti','Kumasi Metropolitan'),
  ('Obuasi Municipal','Ashanti','Obuasi Municipal'),
  ('Ejisu Municipal','Ashanti','Ejisu Municipal'),
  ('Sekondi-Takoradi Metropolitan','Western','Sekondi-Takoradi Metropolitan'),
  ('Sekondi-Takoradi Metropolitan','Western','Sekondi Takoradi Metropolitan'),
  ('Tarkwa-Nsuaem Municipal','Western','Tarkwa-Nsuaem Municipal'),
  ('Tarkwa-Nsuaem Municipal','Western','Tarkwa Nsuaem Municipal'),
  ('Cape Coast Metropolitan','Central','Cape Coast Metropolitan'),
  ('Awutu Senya East Municipal','Central','Awutu Senya East Municipal'),
  ('Effutu Municipal','Central','Effutu Municipal'),
  ('New Juaben South Municipal','Eastern','New Juaben South Municipal'),
  ('Kwahu West Municipal','Eastern','Kwahu West Municipal'),
  ('Ho Municipal','Volta','Ho Municipal'),
  ('Tamale Metropolitan','Northern','Tamale Metropolitan'),
  ('Yendi Municipal','Northern','Yendi Municipal'),
  ('Bolgatanga Municipal','Upper East','Bolgatanga Municipal'),
  ('Bawku Municipal','Upper East','Bawku Municipal'),
  ('Wa Municipal','Upper West','Wa Municipal'),
  ('Sunyani Municipal','Bono','Sunyani Municipal'),
  ('Techiman Municipal','Bono East','Techiman Municipal') on conflict do nothing;
create or replace function ghanacrimes.set_article_district() returns trigger language plpgsql set search_path = ghanacrimes, public as $$
declare v_names text[]; v_regions text[];
begin
  if new.district is not null then return new; end if;
  select array_agg(distinct name), array_agg(distinct region) into v_names, v_regions from ghanacrimes.district_patterns d
   where (coalesce(new.title,'') || ' ' || coalesce(new.summary,'') || ' ' || coalesce(new.body,'')) ~ ('\m' || d.pat || '\M');
  if cardinality(v_names) = 1 and (new.region is null or new.region = v_regions[1]) then new.district := v_names[1]; end if;
  return new;
end $$;
drop trigger if exists articles_set_district on ghanacrimes.articles;
create trigger articles_set_district before insert or update of title, summary, body on ghanacrimes.articles
  for each row execute function ghanacrimes.set_article_district();
