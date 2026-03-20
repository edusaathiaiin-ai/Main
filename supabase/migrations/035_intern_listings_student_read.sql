/*
  Migration: 035_intern_listings_student_read.sql
  Issue: No SELECT policy for students on intern_listings.
         Students need to browse active institution listings.
  Fix: Add student SELECT policy filtered to status = 'active'.
*/

do $$
begin
  create policy intern_listings_student_read
    on public.intern_listings
    for select
    to authenticated
    using (
      is_active = true
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
      )
    );
exception when duplicate_object then null;
end $$;
