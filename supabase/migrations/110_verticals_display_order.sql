-- ────────────────────────────────────────────────────────────────────────
-- 110_verticals_display_order.sql
--
-- Admin-controlled Saathi ordering + categorisation.
--
-- Previously: the WhatsApp Saathi picker hardcoded the category mapping and
-- order in TypeScript. That means adding a new Saathi required a code deploy
-- AND could shift every subsequent number (e.g. a student who memorised
-- "18 = KanoonSaathi" would see a different Saathi at 18 after the deploy).
--
-- Now: two columns on verticals drive everything.
--   display_order : stable sort key, int gaps of 10 so new entries can be
--                   inserted without renumbering existing rows.
--   category      : group label, sparse enum so admin can coin new ones.
--
-- Policy going forward (see CLAUDE.md §18):
--   New Saathi → append with `display_order = (MAX(display_order) + 10)` and
--   the relevant category. Students keep their memorised numbers.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE verticals
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 9999,
  ADD COLUMN IF NOT EXISTS category TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_verticals_display_order
  ON verticals(display_order);

-- Seed values — matches the current in-memory grouping so the numbering
-- students saw yesterday (1=MaathSaathi … 30=StatsSaathi) is preserved.

-- 📚 SCIENCE & ENGINEERING (10 → 140)
UPDATE verticals SET display_order = 10,  category = 'stem' WHERE slug = 'maathsaathi';
UPDATE verticals SET display_order = 20,  category = 'stem' WHERE slug = 'physicsaathi';
UPDATE verticals SET display_order = 30,  category = 'stem' WHERE slug = 'chemsaathi';
UPDATE verticals SET display_order = 40,  category = 'stem' WHERE slug = 'biosaathi';
UPDATE verticals SET display_order = 50,  category = 'stem' WHERE slug = 'biotechsaathi';
UPDATE verticals SET display_order = 60,  category = 'stem' WHERE slug = 'compsaathi';
UPDATE verticals SET display_order = 70,  category = 'stem' WHERE slug = 'mechsaathi';
UPDATE verticals SET display_order = 80,  category = 'stem' WHERE slug = 'civilsaathi';
UPDATE verticals SET display_order = 90,  category = 'stem' WHERE slug = 'elecsaathi';
UPDATE verticals SET display_order = 100, category = 'stem' WHERE slug = 'electronicssaathi';
UPDATE verticals SET display_order = 110, category = 'stem' WHERE slug = 'aerospacesaathi';
UPDATE verticals SET display_order = 120, category = 'stem' WHERE slug = 'chemengg-saathi';
UPDATE verticals SET display_order = 130, category = 'stem' WHERE slug = 'envirosaathi';
UPDATE verticals SET display_order = 140, category = 'stem' WHERE slug = 'agrisaathi';

-- 🏥 MEDICAL & HEALTH (150 → 170)
UPDATE verticals SET display_order = 150, category = 'medical' WHERE slug = 'medicosaathi';
UPDATE verticals SET display_order = 160, category = 'medical' WHERE slug = 'pharmasaathi';
UPDATE verticals SET display_order = 170, category = 'medical' WHERE slug = 'nursingsaathi';

-- ⚖️ LAW & SOCIAL STUDIES (180 → 230)
UPDATE verticals SET display_order = 180, category = 'social' WHERE slug = 'kanoonsaathi';
UPDATE verticals SET display_order = 190, category = 'social' WHERE slug = 'historysaathi';
UPDATE verticals SET display_order = 200, category = 'social' WHERE slug = 'psychsaathi';
UPDATE verticals SET display_order = 210, category = 'social' WHERE slug = 'polscisaathi';
UPDATE verticals SET display_order = 220, category = 'social' WHERE slug = 'geosaathi';
UPDATE verticals SET display_order = 230, category = 'social' WHERE slug = 'archsaathi';

-- 💼 BUSINESS & COMMERCE (240 → 300)
UPDATE verticals SET display_order = 240, category = 'commerce' WHERE slug = 'econsaathi';
UPDATE verticals SET display_order = 250, category = 'commerce' WHERE slug = 'accountsaathi';
UPDATE verticals SET display_order = 260, category = 'commerce' WHERE slug = 'finsaathi';
UPDATE verticals SET display_order = 270, category = 'commerce' WHERE slug = 'bizsaathi';
UPDATE verticals SET display_order = 280, category = 'commerce' WHERE slug = 'mktsaathi';
UPDATE verticals SET display_order = 290, category = 'commerce' WHERE slug = 'hrsaathi';
UPDATE verticals SET display_order = 300, category = 'commerce' WHERE slug = 'statssaathi';
