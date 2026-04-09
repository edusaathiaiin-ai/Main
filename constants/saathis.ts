import type { Saathi } from '@/types';

export const SAATHIS: Saathi[] = [
  { id: 'kanoonsaathi', name: 'KanoonSaathi', emoji: '⚖️', tagline: 'Where law meets intelligence', primary: '#1E3A5F', accent: '#3B82F6', bg: '#E8F0FE' },
  { id: 'maathsaathi', name: 'MaathSaathi', emoji: '📐', tagline: 'Numbers made neighbourly', primary: '#0F4C2A', accent: '#22C55E', bg: '#EAF3DE' },
  { id: 'chemsaathi', name: 'ChemSaathi', emoji: '🧪', tagline: 'Reactions decoded, concepts unlocked', primary: '#5C1A6B', accent: '#A855F7', bg: '#F5E8FE', has3D: true },
  { id: 'biosaathi', name: 'BioSaathi', emoji: '🧬', tagline: 'Life explained, cell by cell', primary: '#1A5C2E', accent: '#10B981', bg: '#E6F7EC', has3D: true },
  { id: 'pharmasaathi', name: 'PharmaSaathi', emoji: '💊', tagline: 'Every molecule has a story', primary: '#7A1C1C', accent: '#EF4444', bg: '#FDEAEA', has3D: true },
  { id: 'medicosaathi', name: 'MedicoSaathi', emoji: '🏥', tagline: 'Healing starts with understanding', primary: '#1A4A5C', accent: '#0EA5E9', bg: '#E4F0F5', has3D: true },
  { id: 'nursingsaathi', name: 'NursingSaathi', emoji: '🩺', tagline: 'Care grounded in knowledge', primary: '#5C001A', accent: '#F43F5E', bg: '#FCEAF0' },
  { id: 'psychsaathi', name: 'PsychSaathi', emoji: '🧠', tagline: 'Understanding minds, building empathy', primary: '#3A1C5C', accent: '#8B5CF6', bg: '#F0E8FC' },
  { id: 'mechsaathi', name: 'MechSaathi', emoji: '⚙️', tagline: 'Engineering minds, precision built', primary: '#1A3A5C', accent: '#2563EB', bg: '#DBEAFE', has3D: true },
  { id: 'civilsaathi', name: 'CivilSaathi', emoji: '🏗️', tagline: 'Structures that stand the test of time', primary: '#3A2800', accent: '#F59E0B', bg: '#FFF3E0', has3D: true },
  { id: 'elecsaathi', name: 'ElecSaathi', emoji: '⚡', tagline: 'Current knowledge, grounded thinking', primary: '#003A5C', accent: '#06B6D4', bg: '#E0F0FA', has3D: true },
  { id: 'compsaathi', name: 'CompSaathi', emoji: '💻', tagline: 'Code, conquer, create', primary: '#1C1C5C', accent: '#6366F1', bg: '#EEEEF8' },
  { id: 'envirosathi', name: 'EnviroSaathi', emoji: '🌍', tagline: 'Engineering a sustainable tomorrow', primary: '#0F3A1A', accent: '#84CC16', bg: '#E4F5E8' },
  { id: 'bizsaathi', name: 'BizSaathi', emoji: '📈', tagline: 'Business thinking, sharpened daily', primary: '#1A3A00', accent: '#65A30D', bg: '#EEF8E4' },
  { id: 'finsaathi', name: 'FinSaathi', emoji: '💰', tagline: 'Money matters, demystified', primary: '#1A3A2A', accent: '#059669', bg: '#E4F5EE' },
  { id: 'mktsaathi', name: 'MktSaathi', emoji: '📣', tagline: 'From insight to influence', primary: '#5C1A00', accent: '#F97316', bg: '#FFF0E8' },
  { id: 'hrsaathi', name: 'HRSaathi', emoji: '🤝', tagline: 'People first, always', primary: '#3A003A', accent: '#EC4899', bg: '#F8E8F8' },
  { id: 'archsaathi', name: 'ArchSaathi', emoji: '🏛️', tagline: 'Design thinking, built different', primary: '#6B4A00', accent: '#D97706', bg: '#FFF4D6' },
  { id: 'historysaathi', name: 'HistorySaathi', emoji: '🏺', tagline: 'Every era has a lesson', primary: '#5C3A00', accent: '#B45309', bg: '#FFF0E0' },
  { id: 'econsaathi', name: 'EconSaathi', emoji: '📊', tagline: 'Markets explained, policies demystified', primary: '#2C4A00', accent: '#4D7C0F', bg: '#EEF6E0' },
  // ── New Saathis (migration 047) ─────────────────────────────────────────────
  { id: 'chemengg saathi',  name: 'ChemEnggSaathi',    emoji: '⚗️',  tagline: 'Where chemistry meets industry',             primary: '#7C2D12', accent: '#EA580C', bg: '#FFF1E6' },
  { id: 'biotechsaathi',    name: 'BioTechSaathi',     emoji: '🦠',  tagline: 'Engineering life, one cell at a time',        primary: '#064E3B', accent: '#14B8A6', bg: '#CCFBF1' },
  { id: 'aerospacesaathi',  name: 'AerospaceSaathi',   emoji: '✈️',  tagline: 'From ground to orbit, engineered',            primary: '#0C4A6E', accent: '#0284C7', bg: '#E0F2FE', has3D: true },
  { id: 'electronicssaathi',name: 'ElectronicsSaathi', emoji: '📡',  tagline: 'Signals, systems, and beyond',               primary: '#312E81', accent: '#7C3AED', bg: '#F5F3FF', has3D: true },
  // ── New Saathis (migration 070+) ───────────────────────────────────────────
  { id: 'physicsaathi',     name: 'PhysicsSaathi',     emoji: '⚛️',  tagline: 'Forces, fields, and the fabric of reality',  primary: '#1E1B4B', accent: '#818CF8', bg: '#EDE9FE', has3D: true },
  { id: 'accountsaathi',    name: 'AccountSaathi',     emoji: '📒',  tagline: 'Every debit has a story, every credit a reason', primary: '#134E4A', accent: '#34D399', bg: '#D1FAE5' },
  { id: 'polscisaathi',     name: 'PolSciSaathi',      emoji: '🏛️',  tagline: 'Power, policy, and the politics of ideas',   primary: '#4C1D95', accent: '#A78BFA', bg: '#F5F3FF' },
  { id: 'statssaathi',      name: 'StatsSaathi',       emoji: '📊',  tagline: 'Data speaks. Statistics gives it a voice.',   primary: '#1A2A4A', accent: '#38BDF8', bg: '#E0F2FE' },
  { id: 'geosaathi',        name: 'GeoSaathi',         emoji: '🌍',  tagline: 'Every map tells a story of the earth and its people', primary: '#14532D', accent: '#4ADE80', bg: '#DCFCE7' },
  { id: 'agrisaathi',       name: 'AgriSaathi',        emoji: '🌾',  tagline: 'From seed to harvest — science meets the soil', primary: '#451A03', accent: '#CA8A04', bg: '#FEF9C3' },
];

