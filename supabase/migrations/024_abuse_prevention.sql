/*
  Migration: 024_abuse_prevention
  Purpose:
    - Add device/IP registration fields for abuse detection
    - Enforce one account per device fingerprint (nullable unique)
    - Add disposable email domain table with seed list
    - Flag suspicious signup velocity from same IP (3+ in 24h)
*/

alter table public.profiles
  add column if not exists device_id text,
  add column if not exists registration_ip text,
  add column if not exists registered_at timestamptz not null default now(),
  add column if not exists needs_review boolean not null default false,
  add column if not exists review_reason text;

create unique index if not exists idx_profiles_device_id_unique
  on public.profiles (device_id)
  where device_id is not null;

create table if not exists public.disposable_email_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  created_at timestamptz not null default now()
);

insert into public.disposable_email_domains (domain)
values
  ('mailinator.com'),
  ('tempmail.com'),
  ('guerrillamail.com'),
  ('10minutemail.com'),
  ('throwaway.email'),
  ('yopmail.com'),
  ('sharklasers.com'),
  ('guerrillamailblock.com'),
  ('trashmail.com')
on conflict (domain) do nothing;

alter table public.disposable_email_domains enable row level security;

drop policy if exists disposable_domains_service_role_all on public.disposable_email_domains;
create policy disposable_domains_service_role_all
on public.disposable_email_domains
for all
to service_role
using (true)
with check (true);

create or replace function public.flag_registration_velocity()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  if new.registration_ip is null or length(trim(new.registration_ip)) = 0 then
    return new;
  end if;

  select count(*)::int
    into recent_count
  from public.profiles p
  where p.registration_ip = new.registration_ip
    and p.registered_at >= now() - interval '24 hours';

  if recent_count >= 3 then
    update public.profiles p
      set needs_review = true,
          review_reason = 'velocity_24h_ip'
    where p.registration_ip = new.registration_ip
      and p.registered_at >= now() - interval '24 hours';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_registration_velocity on public.profiles;
create trigger trg_profiles_registration_velocity
after insert on public.profiles
for each row
execute function public.flag_registration_velocity();
