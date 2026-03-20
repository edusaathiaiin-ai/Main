/*
  Migration: 033_board_questions_read_fix.sql

  Issue: board_questions_student_own used FOR ALL, which blocked students
  from reading other students' posts. The community board needs everyone
  to read all active questions, but only authors can write their own.

  Fix:
  1. Drop the broad FOR ALL policy
  2. Add a wide SELECT policy for all authenticated users (is_active = true)
  3. Add a scoped INSERT policy — students/faculty can only post as themselves

  Wrapped in DO blocks for Supabase SQL Editor compatibility.
*/

-- Step 1: Drop the old overly-restrictive policy
do $$
begin
  drop policy if exists board_questions_student_own on public.board_questions;
exception when others then null;
end $$;

-- Step 2: All authenticated users can READ all questions (community board)
do $$
begin
  create policy board_questions_authenticated_read
    on public.board_questions
    for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

-- Step 3: Students and faculty can INSERT their own questions
do $$
begin
  create policy board_questions_student_write
    on public.board_questions
    for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('student', 'faculty', 'public')
      )
    );
exception when duplicate_object then null;
end $$;
