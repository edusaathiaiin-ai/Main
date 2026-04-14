'use client'

import { ActionModal } from '@/components/ui/ActionModal'
import { markHorizonVerified, createHorizon } from './actions'

const CATEGORIES = [
  { id: 'international',    label: '🌍 International'    },
  { id: 'certification',    label: '📜 Certification'    },
  { id: 'crossover',        label: '⚡ Crossover'        },
  { id: 'entrepreneurship', label: '🌱 Entrepreneurship' },
  { id: 'research',         label: '🔬 Research'         },
  { id: 'today',            label: '🌿 Today'            },
]

const DIFFICULTIES = ['ambitious', 'reachable', 'today']
const LEVELS       = ['school', 'bachelor', 'master', 'phd']

// ── Mark Verified button ─────────────────────────────────────────────────
export function MarkVerifiedButton({ horizonId }: { horizonId: string }) {
  return (
    <ActionModal
      trigger={
        <button className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
          Mark verified
        </button>
      }
      title="Mark horizon as verified"
      description="Resets the 90-day staleness clock. Layer-2 content (deadlines, external links) will re-surface in the student UI."
      confirmLabel="Mark verified"
      action={markHorizonVerified}
    >
      <input type="hidden" name="id" value={horizonId} />
    </ActionModal>
  )
}

// ── Add Horizon button ───────────────────────────────────────────────────
export function AddHorizonButton({ saathiSlugs }: { saathiSlugs: string[] }) {
  return (
    <ActionModal
      trigger={
        <button className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition-colors">
          + Add horizon
        </button>
      }
      title="Add a new horizon"
      description="Creates an active row, marked freshly verified."
      confirmLabel="Create"
      action={createHorizon}
    >
      <Field label="Saathi">
        <select
          name="saathi_slug"
          required
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
          defaultValue=""
        >
          <option value="" disabled>Select a Saathi</option>
          {saathiSlugs.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      <Field label="Title">
        <input
          name="title"
          required
          maxLength={140}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
          placeholder="e.g. Bar-at-Law, Lincoln's Inn, London"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            name="category"
            required
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
            defaultValue=""
          >
            <option value="" disabled>Select</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Difficulty">
          <select
            name="difficulty"
            required
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
            defaultValue=""
          >
            <option value="" disabled>Select</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea
          name="description"
          required
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm resize-y"
          placeholder="2-4 sentences on why this matters and how it works"
        />
      </Field>

      <Field label="Inspiration (one goosebumps line)">
        <input
          name="inspiration"
          maxLength={200}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
          placeholder="Indian lawyers have argued before the ICJ since 1947."
        />
      </Field>

      <Field label="Today action (human-readable)">
        <input
          name="today_action"
          required
          maxLength={160}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
          placeholder="Ask KanoonSaathi about the BPTC course"
        />
      </Field>

      <Field label="Today prompt (the chat input text)">
        <textarea
          name="today_prompt"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm resize-y"
          placeholder="Explain the BPTC requirements for an Indian LLB graduate…"
        />
      </Field>

      <Field label="Academic levels (leave all unchecked = bachelor+master+phd)">
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          {LEVELS.map((lvl) => (
            <label key={lvl} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="academic_levels"
                value={lvl}
                className="accent-amber-500"
              />
              {lvl}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Author name">
          <input
            name="author_display_name"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
            placeholder="EdUsaathiAI Research"
          />
        </Field>
        <Field label="Author credentials">
          <input
            name="author_credentials"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
            placeholder="Constitutional Law · NLU · 38 years"
          />
        </Field>
      </div>
    </ActionModal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  )
}
