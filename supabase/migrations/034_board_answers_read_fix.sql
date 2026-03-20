/*
  Migration: 034_board_answers_read_fix.sql
  Issue: board_answers_student_own (FOR ALL) blocked students from reading
         other students' answers on the community board.
  Fix: Add a wide SELECT policy so all authenticated users can read answers.
       The existing student_own and faculty_read policies still handle writes.
*/

do $$
begin
  create policy board_answers_authenticated_read
    on public.board_answers
    for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;
