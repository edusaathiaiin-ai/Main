-- 076: Faculty Bookmarks
-- Students save faculty profiles to revisit and book later.

create table if not exists faculty_bookmarks (
  id         uuid        primary key default gen_random_uuid(),
  student_id uuid        not null references profiles(id) on delete cascade,
  faculty_id uuid        not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(student_id, faculty_id)
);

alter table faculty_bookmarks enable row level security;

-- Students can only access their own bookmarks
create policy "students_select_own_bookmarks" on faculty_bookmarks
  for select using (auth.uid() = student_id);

create policy "students_insert_own_bookmarks" on faculty_bookmarks
  for insert with check (auth.uid() = student_id);

create policy "students_delete_own_bookmarks" on faculty_bookmarks
  for delete using (auth.uid() = student_id);

-- Fast lookups
create index if not exists idx_faculty_bookmarks_student on faculty_bookmarks(student_id);
create index if not exists idx_faculty_bookmarks_faculty on faculty_bookmarks(faculty_id);
