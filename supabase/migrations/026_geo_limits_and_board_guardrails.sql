/*
  Migration: 026_geo_limits_and_board_guardrails
  Purpose:
  1) Allow global signups while marking non-India accounts as geo-limited.
  2) Harden Board posting against abuse:
     - Account age gate (24h)
     - Basic profile completion gate (~30%)
     - Regional posting restrictions for geo-limited users
     - Existing velocity cap (5 posts/hour)
*/

alter table public.profiles
  add column if not exists country_code text;

alter table public.profiles
  add column if not exists is_geo_limited boolean not null default false;

create index if not exists idx_profiles_country_code on public.profiles(country_code);
create index if not exists idx_profiles_is_geo_limited on public.profiles(is_geo_limited);

create or replace function public.enforce_board_question_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
  p_role text;
  p_registered_at timestamptz;
  p_is_geo_limited boolean;
  completed_fields integer := 0;
begin
  select
    role,
    registered_at,
    coalesce(is_geo_limited, false),
    case when full_name is not null and btrim(full_name) <> '' then 1 else 0 end
      + case when city is not null and btrim(city) <> '' then 1 else 0 end
      + case when institution_name is not null and btrim(institution_name) <> '' then 1 else 0 end
      + case when year_of_study is not null and btrim(year_of_study) <> '' then 1 else 0 end
      + case when exam_target is not null and btrim(exam_target) <> '' then 1 else 0 end
      + case when primary_saathi_id is not null then 1 else 0 end
  into
    p_role,
    p_registered_at,
    p_is_geo_limited,
    completed_fields
  from public.profiles
  where id = new.user_id;

  if p_registered_at is null or p_registered_at > now() - interval '24 hours' then
    raise exception 'Board posting unlocks 24 hours after registration.';
  end if;

  -- Outside India users can browse and learn, but posting is limited for launch safety.
  if p_is_geo_limited then
    raise exception 'Posting is currently limited in your region. You can browse all discussions.';
  end if;

  -- 2 out of 6 fields ~= 33% completion, close to a 30% minimum.
  if completed_fields < 2 then
    raise exception 'Complete your profile before posting to the Board.';
  end if;

  select count(*)::int
    into recent_count
  from public.board_questions bq
  where bq.user_id = new.user_id
    and bq.created_at >= now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Board posting rate limit exceeded: max 5 posts per hour';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_board_questions_rate_limit on public.board_questions;
create trigger trg_board_questions_rate_limit
before insert on public.board_questions
for each row
execute function public.enforce_board_question_rate_limit();
