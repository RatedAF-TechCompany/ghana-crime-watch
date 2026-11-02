-- Hero image alt text and credit (image sourcing stays with the newsroom). Additive.
alter table ghanacrimes.articles add column if not exists hero_image_alt text check (hero_image_alt is null or length(hero_image_alt) <= 300);
alter table ghanacrimes.articles add column if not exists hero_image_credit text check (hero_image_credit is null or length(hero_image_credit) <= 200);
