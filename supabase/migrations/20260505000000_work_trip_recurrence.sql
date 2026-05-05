alter table public.trips
  add column if not exists is_work_trip boolean not null default false,
  add column if not exists recurrence_rule jsonb,
  add column if not exists recurrence_timezone text;
