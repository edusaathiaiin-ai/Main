-- 077: Notifications
-- In-app notification centre for board answers, session events, etc.

create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       text        not null,
  -- board_answered | session_accepted | session_paid |
  -- lecture_booked | intent_fulfilled | application_update
  title      text        not null,
  body       text,
  action_url text,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notif_own" on notifications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_notif_user
  on notifications(user_id, is_read, created_at desc);
