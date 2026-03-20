/*
  Migration: 032_faculty_read_profiles.sql
  Purpose: Allow faculty to SELECT all profiles.
           Faculty needs to see student names (full_name, role)
           when rendering board post authors in board.tsx.
           Without this, board.tsx profilesRes returns empty for faculty users.

  Wrapped in DO block — Supabase SQL Editor's auto-LIMIT breaks bare DDL.
*/

do $$
begin
  create policy profiles_faculty_read
    on public.profiles
    for select
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'faculty'
      )
    );
exception when duplicate_object then
  null; -- policy already exists, skip
end $$;
