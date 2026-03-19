/*
  Migration: RLS policies
  Purpose: Enables RLS on all tables and applies role-aware access policies.
*/

alter table public.profiles enable row level security;
alter table public.verticals enable row level security;
alter table public.bot_personas enable row level security;
alter table public.student_soul enable row level security;
alter table public.student_subjects enable row level security;
alter table public.allowed_domains enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.checkin_results enable row level security;
alter table public.notes_saved enable row level security;
alter table public.board_questions enable row level security;
alter table public.board_answers enable row level security;
alter table public.moderation_flags enable row level security;
alter table public.news_items enable row level security;
alter table public.exam_calendar enable row level security;
alter table public.intern_listings enable row level security;
alter table public.intern_interests enable row level security;
alter table public.dpdp_requests enable row level security;
alter table public.consent_log enable row level security;

create policy profiles_student_own
on public.profiles
for all
to authenticated
using (
  id = auth.uid()
  and role = 'student'
)
with check (
  id = auth.uid()
  and role = 'student'
);

create policy profiles_service_role_all
on public.profiles
for all
to service_role
using (true)
with check (true);

create policy verticals_service_role_all
on public.verticals
for all
to service_role
using (true)
with check (true);

create policy bot_personas_service_role_all
on public.bot_personas
for all
to service_role
using (true)
with check (true);

create policy student_soul_student_own
on public.student_soul
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy student_soul_service_role_all
on public.student_soul
for all
to service_role
using (true)
with check (true);

create policy student_subjects_student_own
on public.student_subjects
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy student_subjects_service_role_all
on public.student_subjects
for all
to service_role
using (true)
with check (true);

create policy allowed_domains_service_role_all
on public.allowed_domains
for all
to service_role
using (true)
with check (true);

create policy chat_sessions_student_own
on public.chat_sessions
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy chat_sessions_service_role_all
on public.chat_sessions
for all
to service_role
using (true)
with check (true);

create policy chat_messages_student_own
on public.chat_messages
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy chat_messages_service_role_all
on public.chat_messages
for all
to service_role
using (true)
with check (true);

create policy checkin_results_student_own
on public.checkin_results
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy checkin_results_service_role_all
on public.checkin_results
for all
to service_role
using (true)
with check (true);

create policy notes_saved_student_own
on public.notes_saved
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy notes_saved_service_role_all
on public.notes_saved
for all
to service_role
using (true)
with check (true);

create policy board_questions_student_own
on public.board_questions
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy board_questions_faculty_read
on public.board_questions
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'faculty'
  )
);

create policy board_questions_service_role_all
on public.board_questions
for all
to service_role
using (true)
with check (true);

create policy board_answers_student_own
on public.board_answers
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy board_answers_faculty_read
on public.board_answers
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'faculty'
  )
);

create policy board_answers_faculty_write
on public.board_answers
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'faculty'
  )
);

create policy board_answers_service_role_all
on public.board_answers
for all
to service_role
using (true)
with check (true);

create policy moderation_flags_student_own
on public.moderation_flags
for all
to authenticated
using (
  reporter_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  reporter_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy moderation_flags_service_role_all
on public.moderation_flags
for all
to service_role
using (true)
with check (true);

create policy news_items_service_role_all
on public.news_items
for all
to service_role
using (true)
with check (true);

create policy exam_calendar_service_role_all
on public.exam_calendar
for all
to service_role
using (true)
with check (true);

create policy intern_listings_institution_own
on public.intern_listings
for all
to authenticated
using (
  institution_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'institution'
  )
)
with check (
  institution_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'institution'
  )
);

create policy intern_listings_service_role_all
on public.intern_listings
for all
to service_role
using (true)
with check (true);

create policy intern_interests_student_own
on public.intern_interests
for all
to authenticated
using (
  student_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  student_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy intern_interests_institution_own
on public.intern_interests
for all
to authenticated
using (
  exists (
    select 1
    from public.intern_listings il
    join public.profiles p on p.id = auth.uid()
    where il.id = intern_interests.listing_id
      and il.institution_user_id = auth.uid()
      and p.role = 'institution'
  )
)
with check (
  exists (
    select 1
    from public.intern_listings il
    join public.profiles p on p.id = auth.uid()
    where il.id = intern_interests.listing_id
      and il.institution_user_id = auth.uid()
      and p.role = 'institution'
  )
);

create policy intern_interests_service_role_all
on public.intern_interests
for all
to service_role
using (true)
with check (true);

create policy dpdp_requests_student_own
on public.dpdp_requests
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy dpdp_requests_service_role_all
on public.dpdp_requests
for all
to service_role
using (true)
with check (true);

create policy consent_log_student_own
on public.consent_log
for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy consent_log_service_role_all
on public.consent_log
for all
to service_role
using (true)
with check (true);
