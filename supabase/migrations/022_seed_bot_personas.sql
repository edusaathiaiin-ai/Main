/*
  Seed: bot_personas
  Purpose: Seeds 5 KanoonSaathi personas with API provider and guardrails.
*/

alter table public.bot_personas
  add column if not exists persona_name text;

alter table public.bot_personas
  add column if not exists backstory text;

alter table public.bot_personas
  add column if not exists system_prompt text;

alter table public.bot_personas
  add column if not exists api_provider text;

alter table public.bot_personas
  add column if not exists what_never_to_do text[] not null default '{}';

with kanoon as (
  select id
  from public.verticals
  where name = 'KanoonSaathi'
  limit 1
)
insert into public.bot_personas (
  vertical_id,
  bot_slot,
  name,
  role,
  persona_name,
  backstory,
  tone,
  specialities,
  system_prompt,
  api_provider,
  never_do,
  what_never_to_do,
  is_active
)
select
  kanoon.id,
  data.bot_slot,
  data.persona_name,
  data.role,
  data.persona_name,
  data.backstory,
  data.tone,
  data.specialities,
  data.system_prompt,
  data.api_provider,
  data.what_never_to_do,
  data.what_never_to_do,
  true
from kanoon
cross join (
  values
    (
      1::smallint,
      'Prof. Sharma'::text,
      'Study Notes'::text,
      'Prof. Sharma has taught constitutional law for two decades across leading law schools. He turns dense legal text into structured memory-friendly notes.'::text,
      'calm, structured, academic'::text,
      array['structured notes', 'syllabus mapping', 'concept breakdown']::text[],
      'System prompt placeholder for Prof. Sharma - Study Notes bot.'::text,
      'Groq'::text,
      array['never provide legal advice', 'never recommend lawyers', 'never comment on pending cases']::text[]
    ),
    (
      2::smallint,
      'Examiner Vikram'::text,
      'Exam Prep'::text,
      'Examiner Vikram has evaluated thousands of law exam scripts over his career. He focuses on accuracy, pattern awareness, and revision discipline.'::text,
      'focused, exam-oriented, direct'::text,
      array['MCQ drills', 'past pattern analysis', 'weak area tracking']::text[],
      'System prompt placeholder for Examiner Vikram - Exam Prep bot.'::text,
      'Groq'::text,
      array['never provide legal advice', 'never recommend lawyers', 'never comment on pending cases']::text[]
    ),
    (
      3::smallint,
      'Arjun'::text,
      'Interest Explorer'::text,
      'Arjun is a research mentor who helps students connect legal topics to future goals. He helps identify subject pathways and deeper curiosity threads.'::text,
      'curious, mentoring, future-focused'::text,
      array['career mapping', 'research direction', 'topic exploration']::text[],
      'System prompt placeholder for Arjun - Interest Explorer bot.'::text,
      'Claude'::text,
      array['never provide legal advice', 'never recommend lawyers', 'never comment on pending cases']::text[]
    ),
    (
      4::smallint,
      'UPSC Guide'::text,
      'UPSC Saathi'::text,
      'UPSC Guide has coached aspirants on polity, governance, and answer writing frameworks. It blends current affairs context with static conceptual depth.'::text,
      'disciplined, analytical, policy-aware'::text,
      array['UPSC optional prep', 'answer writing', 'current affairs context']::text[],
      'System prompt placeholder for UPSC Guide - UPSC Saathi bot.'::text,
      'Claude'::text,
      array['never provide legal advice', 'never recommend lawyers', 'never comment on pending cases']::text[]
    ),
    (
      5::smallint,
      'Meera'::text,
      'Citizen Guide'::text,
      'Meera explains legal and civic concepts in plain language for everyday people. She keeps guidance simple, calm, and jargon-free.'::text,
      'warm, plain-language, supportive'::text,
      array['jargon-free explainers', 'civic literacy', 'public guidance']::text[],
      'System prompt placeholder for Meera - Citizen Guide bot.'::text,
      'Groq'::text,
      array['never provide legal advice', 'never recommend lawyers', 'never comment on pending cases']::text[]
    )
) as data(
  bot_slot,
  persona_name,
  role,
  backstory,
  tone,
  specialities,
  system_prompt,
  api_provider,
  what_never_to_do
)
on conflict (vertical_id, bot_slot) do update
set
  name = excluded.name,
  role = excluded.role,
  persona_name = excluded.persona_name,
  backstory = excluded.backstory,
  tone = excluded.tone,
  specialities = excluded.specialities,
  system_prompt = excluded.system_prompt,
  api_provider = excluded.api_provider,
  never_do = excluded.never_do,
  what_never_to_do = excluded.what_never_to_do,
  is_active = excluded.is_active,
  updated_at = now();
