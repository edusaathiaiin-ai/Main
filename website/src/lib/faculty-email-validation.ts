import { createClient } from '@/lib/supabase/client'

type SupabaseBrowser = ReturnType<typeof createClient>

// ── Generic domain blocklist ──────────────────────────────────────────────────

export const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'rediffmail.com',
  'protonmail.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'ymail.com',
  'msn.com',
  'zoho.com',
])

// ── Result type ───────────────────────────────────────────────────────────────

export type EmailValidationResult = {
  allowed: boolean
  status: 'auto_verify' | 'pending_review' | 'blocked' | 'skipped'
  message: string
  institution_name?: string
}

// ── Validation function ───────────────────────────────────────────────────────

export async function validateFacultyEmail(
  email: string,
  employment_status: 'active' | 'retired' | 'independent',
  supabase: SupabaseBrowser
): Promise<EmailValidationResult> {
  // Retired: skip email validation entirely — any email accepted
  if (employment_status === 'retired') {
    return {
      allowed: true,
      status: 'skipped',
      message:
        'Any email accepted for retired faculty. Verification via document upload.',
    }
  }

  const domain = email.split('@')[1]?.toLowerCase() ?? ''

  // Independent: block only obvious generic domains
  // Personal email + custom domain both fine for consultants
  if (employment_status === 'independent') {
    if (!domain || GENERIC_DOMAINS.has(domain)) {
      return {
        allowed: false,
        status: 'blocked',
        message:
          'Independent faculty — please use your professional or custom domain email. ' +
          'If you only have a personal email, add your LinkedIn URL as verification instead.',
      }
    }
    return {
      allowed: true,
      status: 'pending_review',
      message: 'Your application will be reviewed by our team within 48 hours.',
    }
  }

  // Active faculty: full domain check

  // Block generic domains
  if (!domain || GENERIC_DOMAINS.has(domain)) {
    return {
      allowed: false,
      status: 'blocked',
      message:
        'Active faculty must use their institutional email address ' +
        '(e.g. name@university.ac.in). Gmail and personal emails are ' +
        'not accepted. If you are retired, select "Retired" above.',
    }
  }

  // Check allowed_domains table
  const { data: domainRecord } = await supabase
    .from('allowed_domains')
    .select('institution_name, auto_verify, is_active')
    .eq('domain', domain)
    .eq('is_active', true)
    .maybeSingle()

  if (domainRecord) {
    if (domainRecord.auto_verify) {
      return {
        allowed: true,
        status: 'auto_verify',
        message: `Verified institutional email from ${domainRecord.institution_name ?? domain}. Your account will be auto-verified.`,
        institution_name: domainRecord.institution_name ?? undefined,
      }
    }
    return {
      allowed: true,
      status: 'pending_review',
      message: `Institutional email recognised. Manual verification within 48 hours.`,
      institution_name: domainRecord.institution_name ?? undefined,
    }
  }

  // Domain not in list — check if it looks academic
  if (
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu') ||
    domain.endsWith('.edu.in')
  ) {
    return {
      allowed: true,
      status: 'pending_review',
      message:
        'Academic email detected. Our team will verify your institution within 48 hours.',
    }
  }

  // Unknown domain — allow but flag for review
  return {
    allowed: true,
    status: 'pending_review',
    message:
      'Your email domain is not in our verified list. Our team will review your application within 48 hours.',
  }
}
