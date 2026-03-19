/*
  Table: dpdp_requests
  Purpose: Stores DPDP data export, correction, and deletion requests.
*/

create table if not exists public.dpdp_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'delete', 'correction')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_dpdp_requests_updated_at
before update on public.dpdp_requests
for each row
execute function public.set_updated_at();
