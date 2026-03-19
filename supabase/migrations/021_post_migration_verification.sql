/*
  Post-migration verification pack for EdUsaathiAI
  Run this in Supabase SQL Editor after 001-020 have been executed.
*/

-- 1) Expected table existence
with expected(table_name) as (
  values
    ('profiles'),
    ('verticals'),
    ('bot_personas'),
    ('student_soul'),
    ('student_subjects'),
    ('allowed_domains'),
    ('chat_sessions'),
    ('chat_messages'),
    ('checkin_results'),
    ('notes_saved'),
    ('board_questions'),
    ('board_answers'),
    ('moderation_flags'),
    ('news_items'),
    ('exam_calendar'),
    ('intern_listings'),
    ('intern_interests'),
    ('dpdp_requests'),
    ('consent_log')
)
select
  e.table_name,
  case when t.table_name is null then 'MISSING' else 'OK' end as status
from expected e
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = e.table_name
order by e.table_name;

-- 2) RLS enabled on all expected tables
with expected(table_name) as (
  values
    ('profiles'),
    ('verticals'),
    ('bot_personas'),
    ('student_soul'),
    ('student_subjects'),
    ('allowed_domains'),
    ('chat_sessions'),
    ('chat_messages'),
    ('checkin_results'),
    ('notes_saved'),
    ('board_questions'),
    ('board_answers'),
    ('moderation_flags'),
    ('news_items'),
    ('exam_calendar'),
    ('intern_listings'),
    ('intern_interests'),
    ('dpdp_requests'),
    ('consent_log')
)
select
  e.table_name,
  c.relrowsecurity as rls_enabled,
  case when c.relrowsecurity then 'OK' else 'FAIL' end as status
from expected e
join pg_class c on c.relname = e.table_name
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
order by e.table_name;

-- 3) Policy inventory by table
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4) Policy count per table
select
  tablename,
  count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- 5) Service-role policy check
select
  tablename,
  count(*) filter (where roles::text ilike '%service_role%') as service_role_policies,
  case
    when count(*) filter (where roles::text ilike '%service_role%') > 0 then 'OK'
    else 'MISSING'
  end as status
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- 6) Faculty board access check
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in ('board_questions', 'board_answers')
  and (
    policyname ilike '%faculty%'
    or roles::text ilike '%authenticated%'
  )
order by tablename, policyname;

-- 7) Institution internships access check
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in ('intern_listings', 'intern_interests')
  and policyname ilike '%institution%'
order by tablename, policyname;

-- 8) Foreign key relationships and delete rules
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- 9) created_at presence on all tables
with expected(table_name) as (
  values
    ('profiles'),
    ('verticals'),
    ('bot_personas'),
    ('student_soul'),
    ('student_subjects'),
    ('allowed_domains'),
    ('chat_sessions'),
    ('chat_messages'),
    ('checkin_results'),
    ('notes_saved'),
    ('board_questions'),
    ('board_answers'),
    ('moderation_flags'),
    ('news_items'),
    ('exam_calendar'),
    ('intern_listings'),
    ('intern_interests'),
    ('dpdp_requests'),
    ('consent_log')
)
select
  e.table_name,
  case when c.column_name is null then 'MISSING' else 'OK' end as created_at_status
from expected e
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = e.table_name
 and c.column_name = 'created_at'
order by e.table_name;

-- 10) updated_at presence where expected (mutable tables)
with expected(table_name) as (
  values
    ('profiles'),
    ('verticals'),
    ('bot_personas'),
    ('student_soul'),
    ('student_subjects'),
    ('allowed_domains'),
    ('chat_sessions'),
    ('checkin_results'),
    ('notes_saved'),
    ('board_questions'),
    ('board_answers'),
    ('moderation_flags'),
    ('news_items'),
    ('exam_calendar'),
    ('intern_listings'),
    ('intern_interests'),
    ('dpdp_requests')
)
select
  e.table_name,
  case when c.column_name is null then 'MISSING' else 'OK' end as updated_at_status
from expected e
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = e.table_name
 and c.column_name = 'updated_at'
order by e.table_name;

-- 11) updated_at trigger presence
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name like 'trg_%_updated_at'
order by event_object_table, trigger_name;
