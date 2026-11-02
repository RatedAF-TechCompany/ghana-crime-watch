-- Comment rejection is recorded, never deleted. Additive only.
alter table ghanacrimes.comments add column if not exists rejected_at timestamptz;
alter table ghanacrimes.comments add column if not exists moderated_by uuid;
