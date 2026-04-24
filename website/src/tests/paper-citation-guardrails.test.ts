/**
 * paper-citation-guardrails.test.ts
 *
 * Lock on the system-prompt invariants for the [PAPER:doi] citation tag
 * (supabase/functions/chat/index.ts). The Saathi's ability to cite
 * peer-reviewed research is a VALUE for the student — but it must never
 * weaken the existing guardrails that protect high-stakes subjects from
 * turning into pseudo-prescription, pseudo-advice, or pseudo-diagnosis.
 *
 * This test fails if any of these required phrases disappear from the
 * prompt. Do NOT weaken the strings here to make the test pass if the
 * prompt has drifted — fix the prompt instead. The test is the contract.
 *
 * Access-first principle behind this: a D-level student today may become
 * an A-level researcher in 3 years. We give them the same peer-reviewed
 * exposure a resourced student gets — with the Saathi translating down
 * to their level. What we DO NOT do is let that exposure drift into
 * clinical, legal, or psychological advice for their specific case.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CHAT_FUNCTION_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'supabase',
  'functions',
  'chat',
  'index.ts',
)

const CHAT_SOURCE = readFileSync(CHAT_FUNCTION_PATH, 'utf-8')

describe('Paper-citation guardrails in chat system prompt', () => {
  describe('PAPER_INSTRUCTION — universal rules', () => {
    const required = [
      'PEER-REVIEWED PAPER CITATION',
      '[PAPER:doi]',
      'Only emit ONE [PAPER:] tag per response',
      'ALWAYS explain the finding',
      'BEFORE the tag',
      'NEVER cite a paper whose DOI or findings you are not confident about',
      'Citation is a SOURCE of knowledge, not a practitioner action',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })

  describe('Medical guardrail overlay (medicosaathi)', () => {
    const required = [
      'PAPER CITATION — MEDICAL GUARDRAIL OVERLAY',
      'Explain the finding as SCIENCE',
      "I can explain what the study found — I can't tell you what your own case needs",
      'still stands — citation never overrides it',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })

  describe('Pharmacy guardrail overlay (pharmasaathi)', () => {
    const required = [
      'PAPER CITATION — PHARMACY GUARDRAIL OVERLAY',
      'Never translate into dosing advice',
      'registered pharmacist or clinician',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })

  describe('Nursing guardrail overlay (nursingsaathi)', () => {
    const required = [
      'PAPER CITATION — NURSING GUARDRAIL OVERLAY',
      'Clinical judgement belongs to a supervising nurse or clinician',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })

  describe('Legal guardrail overlay (kanoonsaathi)', () => {
    const required = [
      'PAPER CITATION — LEGAL GUARDRAIL OVERLAY',
      "NEVER infer that the student's own case would win or lose",
      'NEVER recommend lawyers, firms, or practitioners',
      'NEVER comment on matters currently pending in court',
      'Citation is education. Advice is a licensed activity',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })

  describe('Psychology guardrail overlay (psychsaathi)', () => {
    const required = [
      'PAPER CITATION — PSYCHOLOGY GUARDRAIL OVERLAY',
      "NEVER interpret the student's own feelings, behaviours, or symptoms",
      'NEVER diagnose, assess, or frame',
      'licensed counsellor or a helpline',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })

  describe('Wiring — paperBlock is injected into the prompt', () => {
    it('paperBlock is interpolated in the system prompt template', () => {
      expect(CHAT_SOURCE).toMatch(/\$\{paperBlock\}/)
    })
    it('PAPER_GUARDRAIL_EXTENSIONS covers all five high-stakes Saathis', () => {
      for (const slug of [
        'medicosaathi',
        'pharmasaathi',
        'nursingsaathi',
        'kanoonsaathi',
        'psychsaathi',
      ]) {
        expect(CHAT_SOURCE).toMatch(
          new RegExp(`${slug}:\\s*\`PAPER CITATION —`),
        )
      }
    })
  })

  describe('Existing universal guardrails are not disturbed', () => {
    // These have always been in the prompt; if this edit accidentally
    // clobbered them, we fail loudly.
    const required = [
      'UNIVERSAL GUARDRAILS',
      'Never write assignments, essays, or exam answers on behalf of the student',
      'Never express political opinions or take political sides',
      'Never produce adult content of any kind',
      'I am an AI learning companion, not a licensed professional',
    ]
    for (const phrase of required) {
      it(`contains: ${phrase}`, () => {
        expect(CHAT_SOURCE).toContain(phrase)
      })
    }
  })
})
