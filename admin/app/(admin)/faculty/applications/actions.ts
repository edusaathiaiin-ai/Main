'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''

export async function approveApplication(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()

  // Update status
  await admin
    .from('faculty_applications')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Fetch application for email
  const { data: app } = await admin
    .from('faculty_applications')
    .select('full_name, email')
    .eq('id', id)
    .single()

  // Send approval email to faculty
  if (app?.email && RESEND_API_KEY) {
    const firstName = (app.full_name ?? '').split(' ')[0] || 'there'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Jaydeep Buch \u2014 EdUsaathiAI <jaydeep@edusaathiai.in>',
        to: [app.email],
        reply_to: 'jaydeep@edusaathiai.in',
        subject: 'Welcome to EdUsaathiAI \u2014 Application Approved \u2726',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:#060F1D;padding:28px 36px;text-align:center;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">Edu<span style="color:#C9993A;">saathi</span>AI</h1>
</td></tr>
<tr><td style="padding:36px;">
<p style="font-size:16px;color:#1A1814;margin:0 0 20px;">Dear <strong>${firstName}</strong>,</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">Your application has been <strong style="color:#16A34A;">approved</strong>. Welcome to the EdUsaathiAI faculty network.</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">Here\u2019s what to do next:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F4;border-radius:10px;margin:0 0 24px;"><tr><td style="padding:20px 24px;">
<table cellpadding="0" cellspacing="0">
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Log in at <a href="https://edusaathiai.in/login" style="color:#C9993A;">edusaathiai.in/login</a> with the email you applied with</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Complete your faculty profile \u2014 add your session availability and fee</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Your profile will appear on Faculty Finder once complete</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Students can then discover and book sessions with you</td></tr>
</table>
</td></tr></table>
<p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 8px;">If you have any questions, reply directly to this email.</p>
<p style="font-size:14px;color:#444;margin:0;">With respect,<br><strong>Jaydeep Buch</strong><br><span style="color:#888;font-size:13px;">Founder, EdUsaathiAI \u00b7 Ahmedabad</span></p>
</td></tr>
<tr><td style="background:#F9F7F4;padding:20px 36px;border-top:1px solid #EBEBEB;">
<p style="margin:0;font-size:11px;color:#999;text-align:center;">EdUsaathiAI \u00b7 Ahmedabad, Gujarat, India<br><a href="https://edusaathiai.in" style="color:#C9993A;text-decoration:none;">edusaathiai.in</a></p>
</td></tr>
</table></td></tr></table></body></html>`,
      }),
    }).catch((e) => console.error('[applications] approval email failed:', e))
  }

  redirect('/faculty/applications')
}

export async function rejectApplication(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()

  await admin
    .from('faculty_applications')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Send polite rejection email
  const { data: app } = await admin
    .from('faculty_applications')
    .select('full_name, email')
    .eq('id', id)
    .single()

  if (app?.email && RESEND_API_KEY) {
    const firstName = (app.full_name ?? '').split(' ')[0] || 'there'
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Jaydeep Buch \u2014 EdUsaathiAI <jaydeep@edusaathiai.in>',
        to: [app.email],
        reply_to: 'jaydeep@edusaathiai.in',
        subject: 'Update on your EdUsaathiAI application',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;">
<tr><td style="background:#060F1D;padding:28px 36px;text-align:center;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">Edu<span style="color:#C9993A;">saathi</span>AI</h1>
</td></tr>
<tr><td style="padding:36px;">
<p style="font-size:16px;color:#1A1814;margin:0 0 20px;">Dear <strong>${firstName}</strong>,</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">Thank you for your interest in EdUsaathiAI. After careful review, we are unable to approve your application at this time.</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">This is not a reflection of your expertise \u2014 we are currently onboarding faculty in specific subject areas and may not have an immediate match.</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">You are welcome to reapply in the future. If you believe this was an error, please reply to this email.</p>
<p style="font-size:14px;color:#444;margin:0;">With respect,<br><strong>Jaydeep Buch</strong><br><span style="color:#888;font-size:13px;">Founder, EdUsaathiAI \u00b7 Ahmedabad</span></p>
</td></tr>
<tr><td style="background:#F9F7F4;padding:20px 36px;border-top:1px solid #EBEBEB;">
<p style="margin:0;font-size:11px;color:#999;text-align:center;">EdUsaathiAI \u00b7 Ahmedabad, Gujarat, India</p>
</td></tr>
</table></td></tr></table></body></html>`,
      }),
    }).catch((e) => console.error('[applications] rejection email failed:', e))
  }

  redirect('/faculty/applications')
}
