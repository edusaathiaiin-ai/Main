/*
  Migration: 025_board_post_rate_limit
  Purpose: Prevent board spam by limiting users to 5 question posts per hour.
*/

create or replace function public.enforce_board_question_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
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
