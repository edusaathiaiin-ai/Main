/*
  Seed: verticals
  Purpose: Inserts all 20 Saathis in verticals with slug and live flags.
*/

create extension if not exists pgcrypto;

alter table public.verticals
  add column if not exists slug text;

alter table public.verticals
  add column if not exists is_live boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'verticals_slug_key'
  ) then
    alter table public.verticals
      add constraint verticals_slug_key unique (slug);
  end if;
end $$;

insert into public.verticals (
  id,
  slug,
  name,
  emoji,
  tagline,
  primary_color,
  accent_color,
  bg_color,
  is_live,
  is_active
)
values
  (gen_random_uuid()::text, 'kanoonsaathi',  'KanoonSaathi',  '⚖️', 'Where law meets intelligence',            '#1E3A5F', '#3B82F6', '#E8F0FE', true,  true),
  (gen_random_uuid()::text, 'maathsaathi',   'MaathSaathi',   '📐', 'Numbers made neighbourly',                '#0F4C2A', '#22C55E', '#EAF3DE', false, true),
  (gen_random_uuid()::text, 'chemsaathi',    'ChemSaathi',    '🧪', 'Reactions decoded, concepts unlocked',    '#5C1A6B', '#A855F7', '#F5E8FE', false, true),
  (gen_random_uuid()::text, 'biosaathi',     'BioSaathi',     '🧬', 'Life explained, cell by cell',            '#1A5C2E', '#10B981', '#E6F7EC', false, true),
  (gen_random_uuid()::text, 'pharmasaathi',  'PharmaSaathi',  '💊', 'Every molecule has a story',              '#7A1C1C', '#EF4444', '#FDEAEA', false, true),
  (gen_random_uuid()::text, 'medicosaathi',  'MedicoSaathi',  '🏥', 'Healing starts with understanding',       '#1A4A5C', '#0EA5E9', '#E4F0F5', false, true),
  (gen_random_uuid()::text, 'nursingsaathi', 'NursingSaathi', '🩺', 'Care grounded in knowledge',              '#5C001A', '#F43F5E', '#FCEAF0', false, true),
  (gen_random_uuid()::text, 'psychsaathi',   'PsychSaathi',   '🧠', 'Understanding minds, building empathy',   '#3A1C5C', '#8B5CF6', '#F0E8FC', false, true),
  (gen_random_uuid()::text, 'mechsaathi',    'MechSaathi',    '⚙️', 'Engineering minds, precision built',      '#1A3A5C', '#0EA5E9', '#E6EEF8', false, true),
  (gen_random_uuid()::text, 'civilsaathi',   'CivilSaathi',   '🏗️', 'Structures that stand the test of time', '#3A2800', '#F59E0B', '#FFF3E0', false, true),
  (gen_random_uuid()::text, 'elecsaathi',    'ElecSaathi',    '⚡', 'Current knowledge, grounded thinking',    '#003A5C', '#06B6D4', '#E0F0FA', false, true),
  (gen_random_uuid()::text, 'compsaathi',    'CompSaathi',    '💻', 'Code, conquer, create',                   '#1C1C5C', '#6366F1', '#EEEEF8', false, true),
  (gen_random_uuid()::text, 'envirosathi',   'EnviroSaathi',  '🌍', 'Engineering a sustainable tomorrow',      '#0F3A1A', '#84CC16', '#E4F5E8', false, true),
  (gen_random_uuid()::text, 'bizsaathi',     'BizSaathi',     '📈', 'Business thinking, sharpened daily',      '#1A3A00', '#65A30D', '#EEF8E4', false, true),
  (gen_random_uuid()::text, 'finsaathi',     'FinSaathi',     '💰', 'Money matters, demystified',              '#1A3A2A', '#059669', '#E4F5EE', false, true),
  (gen_random_uuid()::text, 'mktsaathi',     'MktSaathi',     '📣', 'From insight to influence',               '#5C1A00', '#F97316', '#FFF0E8', false, true),
  (gen_random_uuid()::text, 'hrsaathi',      'HRSaathi',      '🤝', 'People first, always',                    '#3A003A', '#EC4899', '#F8E8F8', false, true),
  (gen_random_uuid()::text, 'archsaathi',    'ArchSaathi',    '🏛️', 'Design thinking, built different',        '#6B4A00', '#D97706', '#FFF4D6', false, true),
  (gen_random_uuid()::text, 'historysaathi', 'HistorySaathi', '🏺', 'Every era has a lesson',                  '#5C3A00', '#B45309', '#FFF0E0', false, true),
  (gen_random_uuid()::text, 'econsaathi',    'EconSaathi',    '📊', 'Markets explained, policies demystified', '#2C4A00', '#4D7C0F', '#EEF6E0', false, true)
on conflict (name) do update
set
  slug = excluded.slug,
  emoji = excluded.emoji,
  tagline = excluded.tagline,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  bg_color = excluded.bg_color,
  is_live = excluded.is_live,
  is_active = excluded.is_active,
  updated_at = now();
